"""Run alternating, equal-work HTTP trials against prepared benchmark containers."""
import argparse
import hashlib
import http.client
import json
import socket
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/database-benchmark'
parser = argparse.ArgumentParser()
parser.add_argument('--count', type=int, default=1024)
parser.add_argument('--repeats', type=int, default=3)
parser.add_argument('--workloads', nargs='+', default=['profile', 'community', 'save', 'mining'])
parser.add_argument('--concurrencies', nargs='+', type=int, default=[1, 8, 32])
args = parser.parse_args()


class DockerConnection(http.client.HTTPConnection):
    def __init__(self):
        super().__init__('localhost', timeout=10)

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect('/var/run/docker.sock')


def docker_json(path):
    connection = DockerConnection()
    try:
        connection.request('GET', '/v1.44/' + path)
        response = connection.getresponse()
        assert response.status == 200, response.status
        return json.loads(response.read())
    finally:
        connection.close()


def stats(name):
    raw = docker_json('containers/' + name + '/stats?stream=false&one-shot=true')
    mem = raw['memory_stats']
    working = mem.get('usage', 0) - mem.get('stats', {}).get('inactive_file', 0)
    return {'cpu_ns': raw['cpu_stats']['cpu_usage']['total_usage'],
            'working_bytes': working, 'memory_bytes': mem.get('usage', 0),
            'throttling': raw['cpu_stats'].get('throttling_data'),
            'block_io': raw.get('blkio_stats', {}).get('io_service_bytes_recursive')}


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True).stdout.strip()


def load_command(engine, workload, concurrency, tag, count, offset=0):
    return ['docker', 'run', '--rm', '--network', 'container:ph-bench-app-' + engine,
            '--cpus', '2', '--memory', '256m', '-v', str(ROOT / 'backend/benchmarks') + ':/harness:ro',
            '-v', str(OUT) + ':/benchmark', 'python:3.12-slim', 'python', '/harness/load.py',
            '--workload', workload, '--concurrency', str(concurrency), '--count', str(count),
            '--offset', str(offset), '--tag', tag]


metadata = {'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'commit': run(['git', '-C', str(ROOT), 'rev-parse', 'HEAD']),
            'fixture_sha256': hashlib.sha256((OUT / 'fixture.jsonl').read_bytes()).hexdigest(),
            'parameters': vars(args), 'containers': {}, 'host_cpu': run(['lscpu']),
            'host_memory': run(['free', '-m'])}
for engine in ['pg', 'my']:
    for name in ['ph-bench-' + engine, 'ph-bench-app-' + engine]:
        info = docker_json('containers/' + name + '/json')
        metadata['containers'][name] = {'image': info['Image'], 'config_image': info['Config']['Image'],
                                       'memory': info['HostConfig']['Memory'],
                                       'nano_cpus': info['HostConfig']['NanoCpus'],
                                       'command': info['Config']['Cmd']}
    metadata[engine + '_version'] = run(['docker', 'exec', 'ph-bench-' + engine,
                                        'postgres' if engine == 'pg' else 'mysqld', '--version'])
metadata['php_version'] = run(['docker', 'exec', 'ph-bench-app-pg', 'php', '-v'])
metadata['load_generator_image'] = run(['docker', 'image', 'inspect', 'python:3.12-slim', '--format', '{{.Id}}'])
(OUT / 'metadata.json').write_text(json.dumps(metadata, indent=2))
results = []
sequence = 0
for workload in args.workloads:
    for concurrency in args.concurrencies:
        for repeat in range(args.repeats):
            order = ['pg', 'my'] if sequence % 2 == 0 else ['my', 'pg']
            sequence += 1
            for engine in order:
                tag = f'{workload}-c{concurrency}-r{repeat + 1}-{engine}'
                run(['docker', 'exec', 'ph-bench-app-' + engine, 'php', 'benchmarks/fixture.php', 'reset'])
                # Warm with different players; each measured player still starts at revision 0.
                run(load_command(engine, workload, concurrency, 'warm-' + tag, 128, 1024))
                names = ['ph-bench-' + engine, 'ph-bench-app-' + engine]
                before = {name: stats(name) for name in names}
                pressure_before = Path('/proc/pressure/cpu').read_text()
                with (OUT / (tag + '.log')).open('w') as log:
                    process = subprocess.Popen(load_command(engine, workload, concurrency, tag, args.count),
                                               stdout=log, stderr=subprocess.STDOUT)
                    samples = []
                    while process.poll() is None:
                        samples.append({name: stats(name) for name in names})
                        time.sleep(1)
                if process.returncode:
                    raise RuntimeError('Trial failed; inspect ' + tag + '.log')
                after = {name: stats(name) for name in names}
                result = json.loads((OUT / (tag + '.json')).read_text())
                result.pop('latencies_ms')
                result.update({'engine': engine, 'repeat': repeat + 1, 'order': order,
                               'host_pressure_before': pressure_before,
                               'host_pressure_after': Path('/proc/pressure/cpu').read_text(),
                               'resources': {}})
                for name in names:
                    result['resources'][name] = {
                        'cpu_ms_per_request': (after[name]['cpu_ns'] - before[name]['cpu_ns']) / 1e6 / args.count,
                        'peak_working_mib': max(s[name]['working_bytes'] for s in samples) / 1048576,
                        'before': before[name], 'after': after[name]}
                result['database_counts'] = json.loads(run(['docker', 'exec', 'ph-bench-app-' + engine,
                                                            'php', 'benchmarks/fixture.php', 'verify']))
                expected = args.count + 128 if workload in ['save', 'mining'] else 0
                assert result['database_counts']['actions'] == expected
                assert result['database_counts']['ledger'] == expected
                results.append(result)
                (OUT / 'results.json').write_text(json.dumps(results, indent=2))
                print(f"{tag}: {result['rps']:.1f} req/s, p95 {result['p95_ms']:.1f} ms, "
                      f"errors {len(result['errors'])}", flush=True)
                if (OUT / 'stop-after-trial').exists():
                    print('Stopped after completed trial.', flush=True)
                    raise SystemExit()

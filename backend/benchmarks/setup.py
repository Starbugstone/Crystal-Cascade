"""Create disposable, resource-limited databases; never use a configured game database."""
import argparse
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/database-benchmark'
NAMES = ['ph-bench-app-pg', 'ph-bench-app-my', 'ph-bench-pg', 'ph-bench-my']
NETWORK = 'ph-db-benchmark'
parser = argparse.ArgumentParser()
parser.add_argument('--cleanup', action='store_true')
args = parser.parse_args()


def run(*command):
    return subprocess.run(command, check=True, capture_output=True, text=True).stdout.strip()


if args.cleanup:
    # Check every target before stopping any container.
    for name in NAMES:
        info = json.loads(run('docker', 'inspect', name))[0]
        if NETWORK not in info['NetworkSettings']['Networks']:
            raise RuntimeError('Refusing cleanup outside benchmark network: ' + name)
        if not any(value == 'DATABASE_URL=mysql://root:local-benchmark-only@ph-bench-my:3306/benchmark'
                   or value == 'DATABASE_URL=postgresql://postgres:local-benchmark-only@ph-bench-pg:5432/benchmark'
                   or value == 'POSTGRES_DB=benchmark' or value == 'MYSQL_DATABASE=benchmark'
                   for value in info['Config']['Env']):
            raise RuntimeError('Refusing cleanup of an unknown database: ' + name)
    run('docker', 'stop', *NAMES)
    run('docker', 'rm', '--volumes', *NAMES)
    run('docker', 'network', 'rm', NETWORK)
    print('Removed disposable benchmark containers and database volumes; results retained.')
    raise SystemExit()

existing = run('docker', 'ps', '-a', '--format', '{{.Names}}').splitlines()
if set(existing) & set(NAMES):
    raise RuntimeError('Benchmark containers already exist; refusing to replace them.')
if NETWORK in run('docker', 'network', 'ls', '--format', '{{.Name}}').splitlines():
    raise RuntimeError('Benchmark network already exists; refusing to reuse it.')
OUT.mkdir(parents=True, exist_ok=True)
run('docker', 'network', 'create', NETWORK)
common = ['docker', 'run', '-d', '--network', NETWORK, '--cpus', '2', '--memory', '1g',
          '--memory-swap', '1g']
run(*common, '--name', 'ph-bench-pg', '--shm-size', '256m',
    '-e', 'POSTGRES_PASSWORD=local-benchmark-only', '-e', 'POSTGRES_DB=benchmark',
    'postgres:17-bookworm', '-c', 'shared_buffers=256MB', '-c', 'max_connections=100',
    '-c', 'fsync=on', '-c', 'synchronous_commit=on')
run(*common, '--name', 'ph-bench-my', '-e', 'MYSQL_ROOT_PASSWORD=local-benchmark-only',
    '-e', 'MYSQL_DATABASE=benchmark', 'mysql:8.4', '--innodb-buffer-pool-size=268435456',
    '--innodb-flush-log-at-trx-commit=1', '--sync-binlog=1', '--max-connections=100')
for engine, url in [('pg', 'postgresql://postgres:local-benchmark-only@ph-bench-pg:5432/benchmark'),
                    ('my', 'mysql://root:local-benchmark-only@ph-bench-my:3306/benchmark')]:
    run('docker', 'run', '-d', '--name', 'ph-bench-app-' + engine, '--network', NETWORK,
        '--cpus', '2', '--memory', '1536m', '--memory-swap', '1536m', '--tmpfs', '/var/www/app/var',
        '-v', str(ROOT / 'backend') + ':/var/www/app:ro', '-v', str(OUT) + ':/benchmark',
        '-e', 'DATABASE_URL=' + url, '-e', 'APP_ORIGIN=http://localhost',
        '-e', 'APP_SECRET=benchmark-only-secret-with-no-production-access',
        '-e', 'MAILER_DSN=null://null', 'prospect-hollow:ftp')
    run('docker', 'exec', 'ph-bench-app-' + engine, 'chown', 'www-data:www-data', 'var')
    for attempt in range(90):
        check = subprocess.run(['docker', 'exec', 'ph-bench-app-' + engine, 'php', 'bin/health.php'],
                               capture_output=True)
        if check.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Database did not become ready: ' + engine)
run('docker', 'exec', 'ph-bench-app-pg', 'php', 'benchmarks/fixture.php', 'generate')
for engine in ['pg', 'my']:
    print(run('docker', 'exec', 'ph-bench-app-' + engine, 'php', 'benchmarks/fixture.php', 'seed'))
print('Ready. Run python3 backend/benchmarks/run.py; use setup.py --cleanup afterward.')

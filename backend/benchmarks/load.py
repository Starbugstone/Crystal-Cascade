"""Real HTTP load; each request represents a separate fixture player/IP.

Runs inside the Apache container's network namespace. No production rate limits
are disabled. All fixture credentials are disposable and stay in ignored output.
"""
import argparse
import concurrent.futures
import http.client
import json
import math
import threading
import time
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--workload', choices=['profile', 'community', 'save', 'mining'], required=True)
parser.add_argument('--concurrency', type=int, required=True)
parser.add_argument('--count', type=int, default=1024)
parser.add_argument('--offset', type=int, default=0)
parser.add_argument('--tag', required=True)
args = parser.parse_args()
clients = json.loads(Path('/benchmark/clients.json').read_text())
assert 1 <= args.count <= 1024 and args.offset + args.count <= len(clients)
assert 1 <= args.concurrency <= 32
barrier = threading.Barrier(args.concurrency)


def worker(worker_id):
    rows = []
    barrier.wait()
    for number in range(worker_id, args.count, args.concurrency):
        index = number + args.offset
        client = clients[index]
        headers = {'Host': 'localhost', 'Origin': 'http://localhost',
                   'Cookie': client['cookie'], 'Connection': 'close',
                   'Content-Type': 'application/json', 'X-CSRF-Token': client['csrf'],
                   'X-Player-Id': client['playerId']}
        method, path, body = 'GET', 'profile', None
        if args.workload == 'community':
            path = ('leaderboard?page=' + ('100' if number % 4 == 0 else '1')
                    if number % 2 == 0 else 'villages/' + client['villageId'])
        if args.workload in ('save', 'mining'):
            method, path = 'POST', 'actions'
            body = json.dumps({'actionId': 'benchmark-' + args.tag + '-' + str(index),
                               'revision': 0,
                               'type': 'town.sync' if args.workload == 'save' else 'run.move',
                               'args': {} if args.workload == 'save' else client['move']})
        # A distinct loopback source per simulated player avoids an artificial
        # shared-NAT rate-limit bottleneck while exercising the limiter's SQL.
        source = '127.64.' + str(index // 250) + '.' + str(index % 250 + 1)
        connection = http.client.HTTPConnection('127.0.0.1', 80, timeout=20,
                                                source_address=(source, 0))
        started = time.perf_counter_ns()
        status, error, size = 0, None, 0
        try:
            connection.request(method, '/api/v1/' + path, body, headers)
            response = connection.getresponse()
            raw = response.read()
            elapsed = (time.perf_counter_ns() - started) / 1e6
            status, size = response.status, len(raw)
            data = json.loads(raw)
            if status != 200:
                raise RuntimeError(str(data)[:200])
            if args.workload in ('profile', 'save', 'mining'):
                assert data['playerId'] == client['playerId'], 'Wrong player'
                assert data['revision'] == (0 if args.workload == 'profile' else 1), 'Wrong revision'
            if args.workload == 'mining':
                assert data['run']['moves'] == 1 and data['run']['score'] > 0, 'Move did not settle'
            if args.workload == 'community':
                assert ('appearance' in data) if number % 2 else len(data['entries']) == 20
                assert 'profile' not in data and 'email' not in data
        except Exception as exc:
            elapsed = (time.perf_counter_ns() - started) / 1e6
            error = str(exc)
        finally:
            connection.close()
        rows.append({'ms': elapsed, 'status': status, 'error': error, 'bytes': size})
    return rows


start = time.perf_counter()
with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
    rows = [row for group in pool.map(worker, range(args.concurrency)) for row in group]
elapsed = time.perf_counter() - start
ordered = sorted(row['ms'] for row in rows)
def percentile(p):
    return ordered[max(0, math.ceil(len(ordered) * p) - 1)]

result = {'tag': args.tag, 'workload': args.workload, 'concurrency': args.concurrency,
          'requests': len(rows), 'seconds': elapsed, 'rps': len(rows) / elapsed,
          'p50_ms': percentile(.50), 'p95_ms': percentile(.95), 'p99_ms': percentile(.99),
          'mean_ms': sum(ordered) / len(ordered),
          'statuses': dict(Counter(row['status'] for row in rows)),
          'errors': [row for row in rows if row['error']],
          'response_bytes': sum(row['bytes'] for row in rows), 'latencies_ms': ordered}
Path('/benchmark/' + args.tag + '.json').write_text(json.dumps(result))
print(json.dumps({key: value for key, value in result.items() if key != 'latencies_ms'}))
if result['errors']:
    raise SystemExit(1)

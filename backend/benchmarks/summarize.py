"""Export reviewable trial aggregates without fake session credentials."""
import csv
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/database-benchmark'
DEST = ROOT / 'docs/backend/benchmarks'
DEST.mkdir(parents=True, exist_ok=True)
rows = json.loads((OUT / 'results.json').read_text())
metadata = json.loads((OUT / 'metadata.json').read_text())
fields = ['engine', 'workload', 'concurrency', 'repeat', 'requests', 'rps', 'p50_ms',
          'p95_ms', 'p99_ms', 'database_cpu_ms_per_request', 'app_cpu_ms_per_request',
          'database_peak_working_mib', 'app_peak_working_mib', 'errors']
clean = []
for row in rows:
    db = row['resources']['ph-bench-' + row['engine']]
    app = row['resources']['ph-bench-app-' + row['engine']]
    item = {key: row[key] for key in fields if key in row}
    item.update({'database_cpu_ms_per_request': db['cpu_ms_per_request'],
                 'app_cpu_ms_per_request': app['cpu_ms_per_request'],
                 'database_peak_working_mib': db['peak_working_mib'],
                 'app_peak_working_mib': app['peak_working_mib'], 'errors': len(row['errors'])})
    clean.append(item)
with (DEST / '2026-09-12-trials.csv').open('w') as file:
    writer = csv.DictWriter(file, fieldnames=fields)
    writer.writeheader()
    writer.writerows(clean)
metadata['host_pressure_samples'] = [{'tag': row['tag'], 'before': row['host_pressure_before'],
                                     'after': row['host_pressure_after']} for row in rows]
(DEST / '2026-09-12-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
table = ['| Workload | Concurrency | PostgreSQL req/s (range) | MySQL req/s (range) | PostgreSQL p95 ms | MySQL p95 ms |', '| --- | ---: | ---: | ---: | ---: | ---: |']
for workload in ['profile', 'community', 'save', 'mining']:
    for concurrency in sorted({row['concurrency'] for row in rows}):
        groups = [[r for r in clean if r['workload'] == workload and r['concurrency'] == concurrency
                   and r['engine'] == engine] for engine in ['pg', 'my']]
        if not all(groups):
            continue
        items = []
        for group in groups:
            rps = statistics.median(r['rps'] for r in group)
            p95 = statistics.median(r['p95_ms'] for r in group)
            cpu = statistics.median(r['database_cpu_ms_per_request'] for r in group)
            mem = statistics.median(r['database_peak_working_mib'] for r in group)
            items.append(f'{rps:.1f} req/s ({min(r["rps"] for r in group):.1f}–{max(r["rps"] for r in group):.1f}), '
                         f'p95 {p95:.1f} ms, DB CPU {cpu:.2f} ms/req, DB RAM {mem:.1f} MiB')
        print(workload, concurrency, '| PG:', items[0], '| MySQL:', items[1])
        speeds = [f'{statistics.median(r["rps"] for r in g):.1f} ({min(r["rps"] for r in g):.1f}–{max(r["rps"] for r in g):.1f})' for g in groups]
        tails = [f'{statistics.median(r["p95_ms"] for r in g):.1f}' for g in groups]
        table.append('| ' + ' | '.join([workload, str(concurrency)] + speeds + tails) + ' |')
print('Total requests:', sum(r['requests'] for r in clean), 'Errors:', sum(r['errors'] for r in clean))

(OUT / 'table.md').write_text('\n'.join(table) + '\n')

"""Connection-cost diagnostic; run after the HTTP benchmark to avoid competing load."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/database-benchmark'
rows = []
for repeat in range(3):
    for engine in (['pg', 'my'] if repeat % 2 == 0 else ['my', 'pg']):
        result = subprocess.run(['docker', 'exec', 'ph-bench-app-' + engine,
                                 'php', 'benchmarks/connections.php'],
                                capture_output=True, text=True, check=True)
        row = json.loads(result.stdout)
        row.update({'engine': engine, 'repeat': repeat + 1})
        rows.append(row)
        print(json.dumps(row), flush=True)
(OUT / 'connections.json').write_text(json.dumps(rows, indent=2) + '\n')

"""Optional standalone figure; install matplotlib outside the application environment."""
import csv
import statistics
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
rows = list(csv.DictReader((ROOT / 'docs/backend/benchmarks/2026-09-12-trials.csv').open()))
fig, axes = plt.subplots(2, 2, figsize=(11, 7), sharex=True, sharey=True)
colors = {'pg': '#377ca8', 'my': '#bf6523'}
labels = {'pg': 'PostgreSQL 17.11', 'my': 'MySQL 8.4.11'}
for axis, workload, title in zip(axes.flat, ['profile', 'community', 'save', 'mining'],
                                ['Private save reads', 'Leaderboard and visits', 'Saved town actions', 'Mining moves']):
    for engine in ['pg', 'my']:
        values = [[float(r['rps']) for r in rows if r['engine'] == engine
                   and r['workload'] == workload and int(r['concurrency']) == c] for c in [1, 8, 32]]
        medians = [statistics.median(v) for v in values]
        errors = [[m - min(v) for m, v in zip(medians, values)],
                  [max(v) - m for m, v in zip(medians, values)]]
        axis.errorbar([0, 1, 2], medians, yerr=errors, marker='o', capsize=5,
                      color=colors[engine], label=labels[engine], linewidth=2)
    axis.set_title(title, loc='left', fontsize=12, fontweight='bold')
    axis.set_xticks([0, 1, 2], ['1', '8', '32'])
    axis.set_ylim(bottom=0)
    axis.grid(axis='y', alpha=.2)
    axis.spines[['top', 'right']].set_visible(False)
for axis in axes[:, 0]:
    axis.set_ylabel('Successful requests / second')
for axis in axes[1, :]:
    axis.set_xlabel('Concurrent HTTP requests')
handles, legend_labels = axes[0, 0].get_legend_handles_labels()
fig.legend(handles, legend_labels, loc='upper center', bbox_to_anchor=(.5, .92), ncol=2, frameon=False)
fig.suptitle('Prospect Hollow: database comparison through the real API', fontsize=16, fontweight='bold', y=.99)
fig.text(.5, .015, 'Median of 3 repeats; whiskers show min–max. 256 requests per trial. Shared WSL host; warm synthetic data.',
         ha='center', fontsize=9, color='#555555')
fig.tight_layout(rect=[0, .045, 1, .86])
fig.savefig(ROOT / 'docs/backend/benchmarks/2026-09-12-throughput.png', dpi=160, facecolor='white')
plt.close(fig)

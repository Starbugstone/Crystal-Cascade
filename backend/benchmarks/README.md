# PostgreSQL / MySQL game benchmark

This measures the current API over real Apache HTTP, including authentication,
CSRF/Origin checks, database rate limits, transaction locks, profile serialization,
action receipts and ledger writes. It does not change runtime game code.

## Run

Requires Docker, host Python 3, and the backend Composer dependencies (`backend/vendor`).
Build the runtime image first if it is absent or its PHP/dependencies need updating:

```sh
docker build -t prospect-hollow:ftp .
docker pull python:3.12-slim
python3 backend/benchmarks/setup.py
python3 backend/benchmarks/run.py
python3 backend/benchmarks/diagnose.py
python3 backend/benchmarks/summarize.py
python3 backend/benchmarks/setup.py --cleanup
```

Setup refuses to replace existing containers or reuse an existing benchmark network.
Fixture operations accept only the dedicated `benchmark` database on the two
benchmark container names. No configured local or hosted game database is used.
No ports are published and email delivery is disabled. Cleanup removes only the
checked benchmark containers, their database volumes, and network. Results remain
in the ignored `output/database-benchmark/` directory. That directory contains fake
session credentials; publish only the aggregate results and metadata.

## Method

- PostgreSQL 17 and MySQL 8.4: each gets 2 CPUs, 1 GiB RAM, a 256 MiB main database
  buffer cache, 100 maximum connections, and no swap. Defaults otherwise remain
  in effect. Durable commits stay enabled; MySQL binary logging remains enabled.
- Each engine has an identical Apache/PHP app capped at 2 CPUs and 1.5 GiB RAM.
  Backend source and dependencies are mounted read-only. Each load generator gets
  2 CPUs and 256 MiB. Database storage uses Docker disk volumes, not tmpfs.
- One generated JSONL fixture is loaded into both engines: 10,000 players, 5,000
  listed villages, 1,152 sessions and active mines. Players have modest frontier
  settlements. Mining samples are the first legal move on levels 1–4. This is a
  synthetic early-game workload, not a whole-campaign or long-running soak test.
- Each trial resets all active fixtures and removes benchmark action/ledger/limit
  rows. It warms 128 separate players before timing 1,024 distinct players.
- Four workloads: private profile reads; community reads (50% visits, 25% first
  leaderboard page, 25% page 100); `town.sync` writes; and legal `run.move` writes.
- Concurrency 1, 8 and 32; three paired repeats per workload/concurrency. Engine
  order alternates between pairs. Only one engine receives load at a time.
- Each request has its own fixture player and loopback source IP, exercising real
  limiter SQL without turning the load generator into one throttled NAT address.
  Connections close after each HTTP response; no TLS or external network latency.
  PHP uses the application's existing per-request DB connection behavior.
- This is a closed-loop test: each worker sends its next request after the previous
  response. Throughput includes client scheduling and response validation; latency
  runs from connection/request start through receipt of the full response body.
  These are active concurrent requests, not a count of simultaneously logged-in users.
- All responses must be HTTP 200 and pass ownership/revision checks. Mining must
  advance exactly one move and earn score. Ledger and receipt counts must equal
  the successful warm-up plus measured commands. Any failure aborts the run.
- Report median throughput, median per-trial p50/p95/p99, and min/max variation
  across repeats. This avoids treating every request as an independent benchmark
  repeat. Raw per-request latencies are written locally until temporary output is cleaned.
- Docker counter deltas measure CPU per request for the database and PHP app;
  one-second samples measure peak cgroup working memory (usage minus inactive file
  cache). Counter boundaries include a small amount of process launch/teardown and
  idle time. These memory figures are not per-process RSS or a minimum sizing claim.
- Host CPU pressure is recorded before and after each trial. Shared-host noise,
  synthetic data, small warm caches, random server cascades, and short test duration
  limit extrapolation to production. No claim about data larger than RAM, cold
  starts, long-term storage growth, replication, failover or physical disk durability.

For a quicker harness check, use:

```sh
python3 backend/benchmarks/run.py --count 64 --repeats 1 --concurrencies 8
```

A run replaces `results.json` and `metadata.json`; copy previous results before
starting another run. The fixture SHA-256, database/image versions, application
commit and resource limits are recorded with the results. Runtime source changes
should be committed before a production comparison so the commit identifies them.

The optional connection diagnostic times fresh authenticated `SELECT 1` connections
and repeated queries on one connection. It does not change the application to use
pooling. Run it after the HTTP trials so it does not compete with measured requests.
The summary exporter writes compact CSV/metadata under `docs/backend/benchmarks/`;
inspect these before committing them.

To generate the optional figure, install `matplotlib` in an isolated temporary Python
environment and run `python3 backend/benchmarks/plot.py` after exporting the CSV.
The published figure used matplotlib 3.11.2. Plotting dependencies are not application
dependencies. After copying the compact results, remove the temporary
`output/database-benchmark/` directory to reclaim fixture and dependency space.

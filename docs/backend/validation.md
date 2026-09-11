# Backend validation

Validated locally on 12 September 2026, based on game PR #37 revision `81966e3` (including PR #36). All backend edits use a separate worktree. The other rendering checkout remains untouched.

## Automated checks

- `npm run verify`: 1,041 tests across 58 files, formatting and production build pass. The Docker build also compiles with `VITE_CLOUD=true`.
- Puzzle parity: all 240 authored levels are playable; 509 JavaScript evaluations and 267 complete cascade resolutions agree with PHP.
- Town parity: 44,240 checks across six eras and 48 buildings, including prices, city services, construction, modernization, inventory, rewards, income, bandits, workshop fires and storms. Full city matches 199 food, 194 water, 188 population and 100 happiness.
- PostgreSQL 17 and MySQL 8.4: API unit checks, 47 kernel integration requests, 64 puzzle-service assertions, and separate-process concurrent mutation checks pass. Duplicate commands return one receipt, concurrent spending cannot overspend, victory settles once, and revocation invalidates a command waiting on a lock.
- Real Apache HTTP: 16 requests verify authentication, Origin/Host, JSON/body limits, cookie/cache attributes, CSRF, replay, stale revisions, rejected imports and deletion.
- Client tests cover lost-response retry, durable queues, duplicate bootstrap, pending authentication expiry, account switching and cross-tab late responses.
- Composer audit and npm audit report no known vulnerabilities at validation time. Runtime Composer platform requirements pass on PHP 8.4.25.
- Local PostgreSQL dump restored into a separate database: all nine table counts and a known marker matched. This verified data restoration; it was not a hosted restore or a browser login against the restored database. Backup failure cleanup, unique filenames and mode 0600 were checked separately.

## Browser checks

Chromium used separate browser profiles at 1440×1000 and 390×844. The flow creates a guest, links email through local Mailpit, confirms explicitly, builds a well, wins level 1 through legal server-validated moves, receives 317 coins and two saved powers, and buys the 75-coin farm. The second browser signs into the existing email and recovers the same account, 242 coins, both buildings, the level record and inventory. French preference survives recovery.

After updating from the earlier four-era catalog to PR #37, the same account retains its balances and gains the nine new empty city plot keys. Level 2 starts on the desktop; using TNT is recorded once. The phone resumes the identical server board and run ID with score 600 and TNT quantity zero. The mobile page has no horizontal overflow. Account controls remain usable above the full-screen village.

![Saved victory receipt](images/backend-victory.png)

![Recovered mobile village](images/backend-mobile-village.png)

![Same mine resumed on mobile](images/backend-mobile-resume.png)

The final flows have no application exceptions; the headless software WebGL renderer reports performance warnings. Earlier testing found and fixed an Apache root route, account-bar overlap and unnecessary background revision conflicts. Existing large JavaScript bundle warnings remain. This is browser functionality evidence, not physical-device GPU performance testing.

## Release limits

The FTP hosting account, public HTTPS/proxy configuration, real SMTP delivery, scheduled backups and hosted restoration have not been exercised. Follow [hosting instructions](hosting.md). No production deployment or database migration was performed. [Security scope](security.md) describes the remaining trust assumptions, rejected unverified local-save imports and unsupported native token transport. Passing checks is not a guarantee against every attack; production deployment still needs independent security review.

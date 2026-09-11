# Trust boundary and compatibility decisions

The server is authoritative for account ownership, village revision, money, inventory, buildings, shop stock, mining board, objectives and rewards. The browser sends intentions. It never submits a replacement profile, final balance, price, timestamp, score, jewel count or completed mining result. Unknown request fields and commands are rejected.

Symfony 7.4 handles HTTP routing and responses. Doctrine DBAL provides one database connection and explicit transactions; this implementation uses compact JSON records rather than ORM entities. Recovery uses cryptographically random single-use emailed proofs persisted as keyed hashes, explicit POST confirmation, and database-backed sessions, rather than Symfony's signed login-link authenticator. A guest-link proof is bound to the original guest and session. Existing cloud villages require an explicit choice; balances are never merged.

Each mutation locks the player row, rechecks session validity, checks an existing action receipt **before** checking the expected revision, validates the command, changes state, and writes the profile, run, receipt and economy audit record in one transaction. Reusing an action ID with different content is a conflict. Concurrent devices cannot overwrite one another's snapshots or independently spend the same stock. Account deletion and session revocation participate in the same locking order. Browser cookies are HttpOnly, SameSite=Strict, and Secure with a `__Host-` prefix on HTTPS. Mutations require the exact configured Origin, JSON content type and a session-bound CSRF header.

## Puzzle validation

PHP validates individual swaps, bonus activations and inventory power targets against its saved board. It generates refills and calculates cascades, tile damage, relic collection, score and completion. Level eligibility, museum replay access and one active run per player are checked before issue. Continuous runs credit only their bounded lifetime allowance per player/level and cannot become normal victories. Run ownership is part of every SQL query. Runs expire after 24 hours.

The port is checked against the JavaScript engine using all 240 authored levels and explicit obstacle/fusion fixtures. Automatic dead-board shuffles preserve tiles, inventory and score; paid shuffle powers follow the shared resolution rules. Timing rewards use server wall time; browser active-time edits cannot improve them.

This prevents fabricated completion API calls. It does **not** prove a human played: bots can still submit legal moves, and account sharing remains possible. Dependency vulnerabilities, stolen email accounts/cookies, host compromise, denial of service and future implementation bugs remain risks. This is a reviewable implementation with automated checks, not a guarantee of “no more hacks” or a substitute for production security review.

## Current game compatibility

PRs #36 and #37 supersede older balancing numbers in issue #10. The content exporter takes the current catalog, per-era prices, shortened supporting-building progression, leisure happiness, chest scaling and capacities from the game. PHP parity fixtures cover these shared values. Content has a hash identifier; a run issued against different rules must be abandoned explicitly rather than silently reinterpreted.

Current construction behavior is retained: small projects can finish immediately; other projects earn work from accepted normal victories and require a finish action. Hammers instantly build an eligible plot without a coin debit. Only completed buildings provide benefits. Era changes require all projects, including optional ones, to finish so no project is stranded in its old era. Project work requirements are stored at start and are not recomputed from a later catalog. Chests are server-selected, saved and granted before the visual reveal; pressing the roulette cannot choose a different reward.

Bandit raids, post-war workshop fires and contemporary storm cleanup are settled during accepted victories with fixed five-victory cadence and the current era/defense rules. The receipt is immutable; acknowledging or replaying its animation does not deduct again, grant a bounty, refund losses, or recalculate defense. The town bell does not change a settled cloud encounter. Presentation coordinates are never saved.

## Local saves and connectivity

Editable local saves cannot establish verified cloud wealth. This branch deliberately rejects legacy imports instead of accepting the trust exception proposed in issue #10. The original local save key remains untouched in cloud mode; “Open local demo” explicitly returns to that separate village. No reset/import button can replace cloud progress. This is a deliberate migration policy change that needs product review before release.

A linked account recovers confirmed progress on another browser. A guest only survives while its session cookie remains accessible. Cached cloud snapshots are display/cache data, never inputs to the server. Every action is stored locally with its original ID and payload before transmission. A lost response is retried with the same ID. Pending actions block further spending until resolved. Permanent rejection or a stale revision refreshes the server profile and requires the player to choose again; it never rebases a purchase automatically.

New rewarded moves and town actions require connectivity. There is no second writable cloud wallet during outages, and no client-reported offline mining completion endpoint. An interrupted run resumes from its last accepted board within its expiry. Closing/clearing the browser before an unsent action reaches the server can lose that action, but cannot erase already confirmed progress.

The same-origin web application works on PC/tablet/mobile browsers. Packaged Capacitor/native token transport, secure native credential storage and cross-origin APIs are not included; do not ship a static client secret or enable wildcard CORS to add them.

## Operations

Keep the database private, use HTTPS and authenticated SMTP, disable debug output, maintain dependencies, protect deployment credentials, and configure edge limits. API errors never return stack traces. Authentication secrets, cookies, email links and request bodies are not logged. Emailed proofs are URL fragments, keeping them out of ordinary access logs. SMTP failures produce a neutral response and a credential-free error marker. Durable limiter buckets work across PHP workers; housekeeping is separate from HTTP requests.

See [hosting and restore instructions](hosting.md) and [OpenAPI contract](openapi.yaml). Production hosting, real SMTP delivery, backup scheduling, staging restore and an independent security review remain deployment validation tasks.

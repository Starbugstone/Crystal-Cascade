# Develop review — September 2026

This review covers the merged game, village, rewards, persistence, audio and input paths, together with the requested gameplay and interface changes. It replaces the historical prototype report, whose save model and test counts no longer described the application.

## Bugs and performance

| Finding                                                                                                 | Change                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Returning from the mine destroyed and rebuilt the village renderer and audio controller.                | Retain the village scene and camera, pause animation while hidden, and defer visual changes until return. Village audio is now disposed on departure and recreated on return (see the lifecycle follow-up). |
| Unchanged resize notifications redrew the village; stopping an absent raid rebuilt actors.              | Ignore unchanged dimensions and make stopping an absent raid a no-op.                                                                                                                                       |
| A restored WebGL context could reuse a stale cached frame.                                              | Invalidate frame and shadow caches when the context returns.                                                                                                                                                |
| A delayed Phaser initialization could attach a renderer after the board was unmounted.                  | Guard the initialization callback after disposal.                                                                                                                                                           |
| A buffered move or power could start while a guide or settings dialog paused input.                     | Apply the pause guard at action boundaries and drain the buffer once input resumes.                                                                                                                         |
| Keyboard focus could point outside a newly smaller board.                                               | Clamp focus when its layout changes.                                                                                                                                                                        |
| Buildings granted their benefits automatically on the winning run.                                      | Save a ready construction receipt; apply benefits only when the player opens that building. Reject duplicate or stale completion requests.                                                                  |
| Saloon income automatically credited the wallet; its old away limit did not cap stored online earnings. | Store earnings separately with an eight-hour capacity. Only a player collection credits the wallet. Settle old rates before changing benefits and preserve already stored coins.                            |

The scene still rebuilds its village geometry when buildings, scaffolding or chapter art change. Initial Three.js construction remains expensive compared with returning to an unchanged scene. Keeping the paused village retains its WebGL context and memory while Phaser runs; this trades memory for faster navigation. WebGL failure retains the SVG fallback.

A repeated-navigation browser check also caught labels being hidden by a render before the retained canvas became visible. Rendering now skips hidden canvases; an unchanged-size return refreshes labels without reallocating the drawing buffer. A regression test covers this visibility transition. Plot buttons also preserve their anchor translation when pressed: the generic button scale previously displaced them instantly with reduced motion enabled, interrupting clicks.

## Gameplay and interface

- Village opens full screen on entry. Coin counter, story book popup, available-parcel directory, cheerful action colors, and a central fountain are available in the village. Persistent camera/help text is removed; a one-time construction tip explains opening the first ready building.
- All building and shop coin prices increase by 50%. First materials remain free. Builder hammers are excluded from shop stock, purchase validation and tutorial shop claims; mine bonus chests remain their only reward source. Shop levels now offer 1, 2, 3, 4 and 5 items so every upgrade adds a choice.
- Saloon base income changes from 3 to 2 coins per person per level per hour before happiness. Its light green tag shows stored income; tap to collect with a coin burst and chimes. A later tap opens its details. This is roughly one-third less before integer rounding.
- Roulette symbols now take 326 ms, about 5% slower than the 310 ms beta revision. Its complete reel lasts 4.564 seconds. Automatic reward weighting is unchanged.
- Village sound effects use 90% of their previous gain. Music volume is unchanged.
- This release uses `crystal-cascade-profile-v3` as a new progress generation. Earlier v1/v2 saves are not loaded. New progress survives reloads and later deployments using this same key; old open tabs cannot write old progress into it. There is no remote account database in this repository.

## Simplification

Removed unused shuffle allowance/penalty state, its timer and CSS, the unused starting-move constant, the obsolete bonus-swap preview path, unused inventory UI state, and an unused chest-roll helper. Consolidated repeated board-resolution commits into one shared action. Replaced stale preview tests with current power-preview coverage and removed redundant board mocks/assertions. Shared price scaling and purchase eligibility prevent the shop, parcel list and map labels from drifting apart. Removed the prior single-project and one-off raid migrations after the release reset, along with their obsolete tests. Removed obsolete story markup and styles after moving its existing content into the popup.

CI now includes the actual case-sensitive `Develop` branch. Dependencies were audited without changing the lockfile; the audit reported zero advisories.

## Initial review verification

- `npm run verify`: formatting, **351 tests across 29 files**, and the production build pass.
- Chromium at **390 × 844** and **1440 × 1000**: fund construction through the interface, make a real board match, complete a victory fixture, open the roulette, return to the scaffolded village, tap to finish, inspect the fountain, open/close the story popup, and enable reduced motion. Scene and audio instances are reused; neither runs in the mine. No application runtime or failed-request errors were recorded.
- **320 × 568** and **844 × 390**: controls fit without overlap or horizontal overflow, parcel filtering responds to coins and hammers, and the saloon label transfers its five stored coins exactly once. **390 × 844 SVG fallback**: the same filter, collection, story and full-screen checks pass.
- With reduced motion enabled, a real label click enters the mine; forcing WebGL context loss/restoration while the village is hidden then returning redraws the village successfully without restarting animation.
- A browser seeded with both earlier save generations starts with no progress, coins, buildings or inventory. After saving 23 new coins, reloading preserves them even when an old tab writes the previous generation again.
- Three returns to an unchanged village at **390 × 844, DPR 2** took **0.69–0.76 seconds** from the scripted navigation action through visible labels and two animation frames. The same scene was reused every time, with no geometry rebuilds or disposal on return. These software-rendered timings include navigation and Phaser teardown; they are not device frame-rate measurements.
- Production JavaScript chunks gzip to approximately **135 KB** for the initial app, **21 KB** for the village UI, **159 KB** for Three.js/village rendering and **332 KB** for Phaser/board rendering. The latter two remain deferred.

Screenshots and browser instrumentation are in the ignored `output/review/` directory. Browser fixtures seed later village states and force the remaining victory objectives only after a real pointer-driven match; they are not a full manual campaign playthrough. No test-only controls or dependencies are added to the product.

## Remaining limits

- Chromium here uses software graphics. Responsive viewport checks and renderer reuse demonstrate behavior, but do not establish physical iPhone/Android frame rates, thermal behavior or memory limits. Safari, Firefox and native Capacitor builds need device testing.
- The deferred Phaser and Three.js production chunks still trigger Vite size advisories. Initial download/startup work remains separate from the village return fix.
- Income uses the browser clock and saves are local to each device. The reset takes effect when a player loads this release; it cannot replace code already running in an old tab.

## Follow-up playtest review

- Raid controls reserve separate space for the wallet and Skip button on desktop and narrow screens. A new, positive raid loss produces a timed arcade receipt; replaying a seen raid neither credits/debits coins nor repeats the new-loss notice.
- The village sheriff has a cream hat, gold badge, larger silhouette, and a loop along both main streets. The 3D and fallback versions only appear after the office is complete.
- Village pause now reacts synchronously to mine entry. Master audio outputs are disconnected and zeroed, pending recordings are invalidated, and mine gestures cannot unlock the village soundscape. Return reconnects its output. Web Audio parameter readback can lag a render quantum; the disconnected graph guarantees silence during that interval.
- Builder-hammer inventory is visible beside the construction count. Hammer eligibility is independent of the physical parcel list; unaffordable empty parcels keep clickable barriers and hide their floating tags. White/blue/green tags consistently mean constructed/purchasable/action ready, with selection expressed by an outline.
- House II requires the original Home at level 2; Houses III and IV require a completed House II. Existing built houses and construction projects remain usable. Hammers respect the same prerequisites.
- The five visual levels retain each building’s identity and add visible structures. The level-2 farm silo was fully occluded from the review camera and now stands beside the barn. Bank/shop early upgrades now add larger architectural details; level 4 adds raised flowers and banners, and level 5 adds a timber entrance pergola. The square’s third tier is substantially taller, with lanterns at level 5. These are batched static additions. The shop’s late gem displays also now wrap their four-color palette instead of requesting undefined colors.
- An old shuffle/replay test mocked match detection before generating the campaign, forcing all generated levels through their retry limit. Scope the mock after bootstrap so it tests shuffle behavior without wasting time or timing out.

### Rendering measurements and next improvement

Profiled a 390 × 844 viewport at device scale 2, with an empty village and a mature village (11 animated actors / 651 parts). Each sample ran for about 4.5 seconds, with a continuous orbit for camera samples. This headless Chromium environment uses software rendering: these figures locate bottlenecks and compare experiments, **not physical phone frame rates**.

| Baseline sample     | Draws/second | Actor update mean | Render submission mean |
| ------------------- | -----------: | ----------------: | ---------------------: |
| Sparse idle         |         14.5 |           0.19 ms |                2.85 ms |
| Mature idle         |          9.2 |           1.04 ms |                3.38 ms |
| Mature camera orbit |          1.5 |           0.97 ms |                6.76 ms |

The idle animation had an explicit 30 fps ceiling. Camera frames returned before advancing village time: only 0.10 seconds of animation advanced during a 6.09-second orbit sample. Both scheduling issues are fixed: allow up to 60 fps, advance animation before deferring the draw to the pending camera frame, and preserve pause/reduced-motion behavior.

The expensive camera path redraws the static landscape into a half-float color/depth target with four-sample anti-aliasing, then composites it with animated actors. Runtime experiments at DPR 1 improved the mature orbit from 1.5 to 1.9 draws/second; also removing offscreen MSAA reached 4.3. Actor updates stayed near 1 ms, so reducing actor counts alone would miss the larger rendering cost. The experiments used the same camera orbit and mature fixture, with only these settings changed; software GPU results need confirmation on devices.

**Proposed next optimization:** an adaptive mobile quality tier that reduces offscreen MSAA first and pixel ratio second during slow camera interaction, restoring the sharper stationary view afterward. Verify image quality and frame timing on a representative iPhone and Android device before choosing thresholds. The current patch retains the existing rendering resolution and anti-aliasing; only the measured scheduling bugs are changed. Source-level candidates after that are incremental rebuilding of the changed building and avoiding redundant actor color uploads, rather than deleting scene detail without measurement.

A follow-up sample after the scheduling fix measured 23.8 draws/second in the sparse village, 9.5 in the mature idle village, and 1.6 while orbiting. Camera motion now advanced village time by 3.70 seconds over 5.69 seconds, instead of 0.10 over 6.09; the remaining difference is the existing 0.5-second maximum animation step when software rendering stalls. The mature camera path remains GPU-bound in this environment, so this patch does not claim a mobile 60 fps result.

### Follow-up verification

- `npm run verify` passed: **355 tests across 29 files**, formatting, and production build. Removed unreachable locked/in-progress branches from the purchase-only directory and three obsolete translations introduced by the prior house-unlock and parcel hints; localization validation was rerun afterward.
- At widths **320, 390 and 1440**, builder-hammer counts updated from 0 to 5 and back to 0 after a real hammer purchase. The counter fit beside the construction count without overlapping Available plots. A saloon tap collected exactly 17 coins with five coin cues and no building popup; a second tap opened details without another credit. Unaffordable empty parcels had no label, retained geometry, and opened details when tapped directly. White and green computed colors matched the action convention.
- **1536 × 864, 390 × 844, 320 × 568 and 844 × 390**, including French labels: raid coin counter and Skip button did not overlap; completion showed the saved loss once, replay did not repeat it, and the sheriff moved with his badge visible. Mine entry disconnected village audio synchronously, and later mine gestures did not resume it.
- Mine-flow checks at **390 × 844 and 1440 × 1000** exercised a real match, chest opening (4,564 ms reel), retained scene/audio return, ready scaffolding, completion, fountain, story popup and reduced motion. No application or failed-request errors were recorded.
- Generated and visually reviewed **55 distinct 3D renders**: all five levels for each of the 11 building types. Extra wells, farms and houses use those same type renderers. The comparison caught and corrected the occluded farm silo.
- Forced WebGL failure at **390 × 844**: the SVG sheriff traversed the shared patrol path, adding a hammer did not remove parcels, Houses III/IV appeared only after a real hammer purchase of House II, and reduced motion displayed a static coin receipt. No application errors were recorded.

## Story overview and audio lifecycle follow-up

The story popup now shows live population (residents and visitors), savings, water/food capacity and demand, happiness, hourly saloon income and stored earnings, completed/active construction and builder-hammer inventory. Values use the existing town rules, including all extra wells/farms/homes; unfinished construction grants no capacity. Demand is housing plus visitor capacity, so a supply shortfall remains visible even when it limits actual population. The two-column overview stays inside the full-screen dialog and scrolls with the story.

Following another report of village sounds in mine play, the earlier output gate passed locally but the reported leak was not reproduced. The audio lifecycle is now stricter: normal/continuous mine entry or any departure from the village synchronously disposes its entire soundscape, aborts loads and closes its AudioContext. Returning creates a fresh soundscape only for an active village. The WebGL scene remains retained. This replaces the earlier retained-audio behavior described in the initial checks above; audio may briefly load again on return, with assets served from browser cache. A lifecycle regression checks synchronous disposal, mine-gesture rejection and fresh creation on return.

Verification for this follow-up: **356 tests across 30 files** and production build passed. At **320 × 568 (French), 390 × 844 and 1440 × 900**, the story overview reported the fixture’s correct capacities, population, happiness and income, then updated when farm capacity changed while the popup remained open. Closing it preserved full screen. The audio check played real birds/chatter/horse recordings before navigation and verified that every village context closed, every source and pending request cleared, and later mine gestures created no village audio in both normal and continuous play. Returning to the village created a fresh active soundscape. No application errors were recorded.

## Remembered label visibility

An eye button beside the story/full-screen controls toggles floating building and mine labels in both the 3D and SVG views. It defaults on and persists independently of the progress generation, so mine visits, page reloads and progress resets retain the choice. The toggle changes only label visibility; physical lots and building interaction remain available and the renderer does not rebuild. The coin badge reserves room for the third control, including large balances. Preference-storage failures leave the toggle usable for the current session.

Verification: **358 tests across 31 files**, formatting and production build pass. Chromium checks at **320 × 844 and 1440 × 900 (3D)** and **390 × 844 (SVG fallback)** confirm default-on behavior, both saved choices after reload, hidden-label building interaction and controls fitting beside a maximum-safe-integer coin balance. The 3D check also confirms that the choice survives a mine round trip and toggling labels does not rebuild the scene. No application errors were recorded.

## Result navigation, sequential parcels and depth rewards

Continue mining and Back to village now share a row directly above the coin recap. Both remain visible without scrolling at 320 × 568 (French), 390 × 844, 844 × 390 (French landscape), and 1440 × 1000. Browser checks exercised both destinations, chest-to-results navigation, chapter 2's exact +10 depth coins on a 200-coin subtotal, and the single village button after level 60.

The original home, farm or well must finish level 2 before its second parcel unlocks. Farm III additionally requires Farm II; each extra house requires its predecessor. This replaces the earlier simultaneous III/IV house unlock. Coins and hammers use the same prerequisite resolver, and locked details point to the actual missing building. Existing buildings and funded projects survive the rule change. A simple building tap also used to disable automatic camera framing; only actual camera movement now leaves the overview, and automatic reframing during a construction tap does not count as a user camera move.

Depth adds five percentage points per chapter to mining coin subtotals, rounded down once: 0% in chapter 1 through 45% in chapter 10. The recap shows the additional coins separately. Normal replay uses the level being replayed; continuous mode applies the same percentage to its gem income while retaining the 25-coin lifetime cap. Chest awards and saloon income keep their existing rates. Regression checks cover chapter boundaries, rounding, wallet/recap agreement, repeated settlement, saved progress, and continuous caps.

Verification: **376 tests across 31 files**, formatting and production build pass. Parcel browser checks at **320 × 844 and 1440 × 950 (3D)** and **390 × 844 (SVG fallback)** confirm unlocks only after finishing the original improvement, sequential coin/hammer purchases, inspecting an unlabeled House II parcel, and persistence after reload. The 3D checks confirm taps retain overview framing while real drag/zoom gestures leave it. Result and parcel checks recorded no application or unexpected request errors.

## Corrected level requirement for repeated buildings

The earlier sequential-parcel change required only level 1 of the previous extra building. Each extra house or farm now requires its predecessor at **completed level 2**: Farm II level 2 opens Farm III, House II level 2 opens House III, and House III level 2 opens House IV. The original level-2 requirement still applies. The directory, rendered parcels and coin/hammer commands share this rule; waiting or ready scaffolding does not count as the completed improvement. Existing paid projects and buildings remain accessible. English/French hints now state the level requirement, and the obsolete level-1 prerequisite message is removed.

Updated regression cases failed against the old rule for both homes and farms. They now check the level-1 state, in-progress and ready upgrades (including save/reload), explicit completion, and instant hammer upgrades before allowing the next parcel.

Verification: `npm run verify` passes all **376 tests across 31 files**, formatting, and production build. Chromium checks at **320 × 844 and 1440 × 950 (3D)** and **390 × 844 (SVG fallback)** confirm that level 1, upgrading, and ready-after-reload states keep Farm III unavailable and reject coin/hammer attempts without spending. Completing Farm II level 2 reveals it; hammer upgrades of House II and III reveal the next houses only at level 2. No application or unexpected request errors were recorded.

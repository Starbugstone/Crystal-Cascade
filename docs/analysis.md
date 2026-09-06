# Develop review — September 2026

This review covers the merged game, village, rewards, persistence, audio and input paths, together with the requested gameplay and interface changes. It replaces the historical prototype report, whose save model and test counts no longer described the application.

## Bugs and performance

| Finding                                                                                                 | Change                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Returning from the mine destroyed and rebuilt the village renderer and audio controller.                | Retain the village after its first visit, stop its animation and audio while hidden, and defer visual changes until it becomes active. Reuse the scene, camera and decoded audio on return. |
| Unchanged resize notifications redrew the village; stopping an absent raid rebuilt actors.              | Ignore unchanged dimensions and make stopping an absent raid a no-op.                                                                                                                       |
| A restored WebGL context could reuse a stale cached frame.                                              | Invalidate frame and shadow caches when the context returns.                                                                                                                                |
| A delayed Phaser initialization could attach a renderer after the board was unmounted.                  | Guard the initialization callback after disposal.                                                                                                                                           |
| A buffered move or power could start while a guide or settings dialog paused input.                     | Apply the pause guard at action boundaries and drain the buffer once input resumes.                                                                                                         |
| Keyboard focus could point outside a newly smaller board.                                               | Clamp focus when its layout changes.                                                                                                                                                        |
| Buildings granted their benefits automatically on the winning run.                                      | Save a ready construction receipt; apply benefits only when the player opens that building. Reject duplicate or stale completion requests.                                                  |
| Saloon income automatically credited the wallet; its old away limit did not cap stored online earnings. | Store earnings separately with an eight-hour capacity. Only a player collection credits the wallet. Settle old rates before changing benefits and preserve already stored coins.            |

The scene still rebuilds its village geometry when buildings, scaffolding or chapter art change. Initial Three.js construction remains expensive compared with returning to an unchanged scene. Keeping the paused village retains its WebGL context and memory while Phaser runs; this trades memory for faster navigation. WebGL failure retains the SVG fallback.

A repeated-navigation browser check also caught labels being hidden by a render before the retained canvas became visible. Rendering now skips hidden canvases; an unchanged-size return refreshes labels without reallocating the drawing buffer. A regression test covers this visibility transition. Plot buttons also preserve their anchor translation when pressed: the generic button scale previously displaced them instantly with reduced motion enabled, interrupting clicks.

## Gameplay and interface

- Village opens full screen on entry. Coin counter, story book popup, available-parcel directory, cheerful action colors, and a central fountain are available in the village. Persistent camera/help text is removed; a one-time construction tip explains opening the first ready building.
- All building and shop coin prices increase by 50%. First materials remain free. Builder hammers are excluded from shop stock, purchase validation and tutorial shop claims; mine bonus chests remain their only reward source. Shop levels now offer 1, 2, 3, 4 and 5 items so every upgrade adds a choice.
- Saloon base income changes from 3 to 2 coins per person per level per hour before happiness. Its gold tag shows stored income; tap to collect. This is roughly one-third less before integer rounding.
- Roulette symbols take 310 ms instead of 350 ms, approximately 13% faster. Its complete reel lasts 4.34 seconds. Automatic reward weighting is unchanged.
- Village sound effects use 90% of their previous gain. Music volume is unchanged.
- This release uses `crystal-cascade-profile-v3` as a new progress generation. Earlier v1/v2 saves are not loaded. New progress survives reloads and later deployments using this same key; old open tabs cannot write old progress into it. There is no remote account database in this repository.

## Simplification

Removed unused shuffle allowance/penalty state, its timer and CSS, the unused starting-move constant, the obsolete bonus-swap preview path, unused inventory UI state, and an unused chest-roll helper. Consolidated repeated board-resolution commits into one shared action. Replaced stale preview tests with current power-preview coverage and removed redundant board mocks/assertions. Shared price scaling and purchase eligibility prevent the shop, parcel list and map labels from drifting apart. Removed the prior single-project and one-off raid migrations after the release reset, along with their obsolete tests. Removed obsolete story markup and styles after moving its existing content into the popup.

CI now includes the actual case-sensitive `Develop` branch. Dependencies were audited without changing the lockfile; the audit reported zero advisories.

## Verification

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

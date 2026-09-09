# Issue #30 and the mine forecourt

This review continues the four-era, 144-level progression work. Source report: [GitHub issue #30](https://github.com/Starbugstone/Crystal-Cascade/issues/30).

The subsequent [mobile village and gem clarity review](mobile-village-and-gem-clarity.md) replaces the mobile summary with an optional popup, softens gem variants and corrects seal outlines. Its screenshots supersede the corresponding presentation shown below.

## Changes

- **Level 37:** removed the separate shrink rule and fitted the surrounding controls more tightly. Levels 36 and 37 now use equal-width gems on desktop. At 1366×768, level-37 cells increased from 38.7 to 48.7 pixels; the board and all five bonus buttons fit. At 390×844, cells remain 51.7 pixels with no horizontal overflow.
- **Steam encounter:** manually controlled characters now join the moving-character renderer, so the patrol and thieves appear and animate. Coins, protection, saved outcomes and skip behavior retain their existing rules.
- **Steam construction:** the first modernization still needs two normal puzzles. Improvements two and three take one. Already-paid two-puzzle saves keep their work and become ready after one win.
- **Electric gate:** the power house still needs to finish before powered modernization. The illustrated next-step panel leads to the power house when needed.
- **Transport and roads:** entering Electric paves village tracks. Each completed station/harbor modernization changes its train/boat. The former stables become a motor garage, and its second Electric improvement replaces visiting horses with touring cars. Motor Age preserves that traffic and adds its bus route.
- **Electricity:** completing the power house adds overhead wires, roadside poles and a service connection to every built plot and the mine, including later buildings. Poles keep out of the mine encounter lanes.
- **Mine identity:** timber and steam equipment, electric framing and lamps, then Motor Age frontage distinguish the entrances and mine chambers while chapter-specific gems and scenery remain.
- **Chains:** chained gems cannot swap. Matches must include them, or a bonus must hit their cell directly. Neighboring matches do not release them. Other gems fall past the pinned cell. The illustrated guide and English/French tips show this rule.
- **Mine forecourt:** the open encounter space now connects to the tunnel through a continuous work yard, flush rail marks, edging, crates and ore. Tall props stay outside the riders' lanes. Electric-era paving carries into the yard. The SVG map includes the same worksite cues.

The review also caught a supply bottleneck: previously, even a finished Steam town lacked water for its homes and visitors. The main well now adds 20 capacity at each of Steam stages two and three. Electric and Motor Age each add another 20 at their final well stage. This preserves the final Motor capacity of 140 while making every completed era fully support its population.

## Verification

The final engine sample covers every level with 30 refill seeds: **4,320 completions**, no inventory powers, and no sample above 70 moves. The new rule's long-tail layouts at 103, 111 and 128 were eased. Motor chapters typically take 19–20 moves; their 90th percentiles are 32–34 moves. Full sampling uses legal hints, earned board bonuses and free dead-board shuffles; it is separate from the real-browser playthroughs.

The mining-only town model completes all four eras in 129–139 normal puzzles (median 134), with at most two puzzles without a new purchase or funded construction. Adding one guaranteed chest, direct chapter gifts and immediate earned hammers gives 114–126 completions (median 120), before passive income. These models describe pacing, not measured human retention.

The final full suite passed **847 tests across 51 files**. Formatting and production compilation passed; the existing large-bundle advisory remains. The final SVG viewport/click adjustment was checked in the browser and rebuilt after those engine tests.

Browser verification used disposable profiles in Chromium on local Vite servers at `127.0.0.1:5173` and `127.0.0.1:5174`. Desktop checks used 1440×900 and 1366×768, with tablet 768×1024 and French mobile 390×844 and 320×740. Real pointer swipes completed levels 37 (42 moves) and 144 (39 moves) after the chain change. Level 144 saved its record, all 144 completions, chapter-24 reward, and zero pending chests; results return to the village. The earlier Motor review also played 121 and verified a purchased garage finishing through that puzzle.

The Steam incident's crew renders on the shared animated layer. Four separate village fixtures verified the forecourt and mine entrance in each era with no application exceptions. Electric has 34 service connections including its mine; the completed Motor town has 37 building plots. A forced WebGL-unavailable check verified the SVG map, new garage click, power wires, forecourt, French details, reduced motion, and no horizontal overflow at 390 or 320 pixels. Its expected renderer-fallback notice is separate from application errors; no uncaught errors or failed HTTP requests occurred in that check. The fallback bounds include the new western plots, and purely decorative scenery cannot intercept building clicks.

## Visual evidence

- [Level 37 on a laptop](images/issue30-mine37-laptop.png)
- [Steam patrol responding](images/issue30-steam-encounter.png)
- [Electric roads, vehicles and connected power](images/issue30-electric-village.png)
- [Completed Motor village on desktop](images/issue30-motor-desktop.png) and [French mobile](images/issue30-motor-french-mobile.png)
- [Final mine level](images/issue30-mine144-french-mobile.png) and [saved completion rewards](images/issue30-results144-french-mobile.png)
- [SVG fallback](images/issue30-fallback-french-mobile.png) and [garage details at 320 pixels](images/issue30-fallback-garage-320.png)

The forecourt and entrance across the four eras:

| Frontier                                           | Steam                                                     | Electric                                                     | Motor Age                                                |
| -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| [Work yard](images/issue30-forecourt-frontier.png) | [Steam entrance](images/issue30-forecourt-river-rail.png) | [Electric entrance](images/issue30-forecourt-industrial.png) | [Motor entrance](images/issue30-forecourt-motor-age.png) |

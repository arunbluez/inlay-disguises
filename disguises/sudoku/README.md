# Sudoku

A daily number puzzle: four puzzles a day (Easy, Medium, Hard, Expert), any puzzle by its number, notes, undo and redo, hints, a timer, a streak and stats. It runs fully offline; `allowedHosts` is empty.

## Puzzles

`src/engine/` is plain TypeScript with no dependencies.

- **Puzzle numbers.** Every number from 1 to 999,999,999 is one fixed puzzle, the same on every device: the number seeds the generator (`random.ts`, mulberry32). Levels take turns: #1 is Easy, #2 Medium, #3 Hard, #4 Expert, #5 Easy again.
- **Daily puzzles.** Day 0 is 1 January 2025 by the local calendar; day _d_ has puzzles 4_d_ + 1 to 4_d_ + 4, one per level (`daily.ts`).
- **Solver.** `solver.ts` fills forced cells, then branches on the cell with the fewest candidates; it counts solutions up to two, which is how the generator keeps each solution unique.
- **Generator.** `generator.ts` fills a random grid, takes givens away while the solution stays unique, then gives some back until the puzzle's level can finish it. An attempt that lands on another level starts again from the same seed.
- **Levels.** `grade.ts` solves by deduction alone. Easy needs singles only, and keeps at least 36 givens. Medium adds pointing and claiming. Hard adds pairs and triples. Expert needs more than that.

`__tests__/engine.test.ts` checks 500 numbers per level for uniqueness, a valid solution and the right level, and checks that the same number always gives the same puzzle. It also prints how long generation takes.

## Icons

`assets/icon/` holds six 1024 px PNGs, drawn from the Sudoku row of the design system's App icons panel. The method is the same as Compress's set.

- The 3 × 3 grid is inset 21% (iOS) or 31% (Android foreground, inside the 66 dp safe zone), with gaps of 7%. The top-right square is solid; the other eight are faded.
- **iOS light:** accent ground `#236ade`, mark `#f3f2f2`, faded squares at 38%.
- **iOS dark:** ground `#151413`, mark in the dark accent `#5590f3`, faded squares mixed 38% in OKLab.
- **iOS tinted:** black ground, mark `#d7d3d3`, faded squares at 36%.
- **Android:** the background is the accent. The foreground is the mark `#f3f2f2` on transparent, with faded squares at 60% alpha. The monochrome layer is the same in white.

The PNGs are written pixel by pixel with Node's `zlib`. Square edges are rounded to whole pixels and have no anti-aliasing.

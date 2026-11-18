// Puzzle #n: one fixed grid and level for every n, the same on every device.
import { grade, LEVELS, solvesWith, type Level } from './grade';
import { createRandom, seedFor, shuffle } from './random';
import { CELLS, isUnique, search } from './solver';

/** The highest puzzle number. */
export const MAX_PUZZLE = 999_999_999;

/** Easy puzzles keep this many givens, so they stay relaxed. */
const EASY_GIVENS = 36;

export interface Puzzle {
  n: number;
  level: Level;
  /** The starting grid; 0 is an empty cell. */
  givens: number[];
  solution: number[];
}

/** Levels take turns: #1 is easy, #2 medium, #3 hard, #4 expert, #5 easy again. */
export function levelOf(n: number): Level {
  return LEVELS[(n - 1) % LEVELS.length]!;
}

export function isPuzzleNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_PUZZLE;
}

/**
 * Builds puzzle #n from a generator seeded by n. An attempt fills a random grid, then takes givens
 * away in a random order for as long as the solution stays unique. If that leaves a puzzle harder
 * than n's level, givens come back (latest removed first) until deduction at n's level finishes
 * it. An attempt that ends at any other level starts over from the same generator, so the result
 * is still fixed.
 */
export function generate(n: number): Puzzle {
  if (!isPuzzleNumber(n)) throw new RangeError(`No puzzle #${n}`);
  const level = levelOf(n);
  const rank = LEVELS.indexOf(level);
  const random = createRandom(seedFor(n));
  for (;;) {
    const solution = search(new Array<number>(CELLS).fill(0), 1, random).solution!;
    const givens = solution.slice();
    const removed: number[] = [];
    for (const cell of shuffle(
      Array.from({ length: CELLS }, (_, i) => i),
      random,
    )) {
      givens[cell] = 0;
      if (isUnique(givens)) removed.push(cell);
      else givens[cell] = solution[cell]!;
    }
    if (LEVELS.indexOf(grade(givens)) < rank) continue;
    if (level !== 'expert') {
      const enough = () =>
        solvesWith(givens, level) && (level !== 'easy' || CELLS - removed.length >= EASY_GIVENS);
      while (!enough()) {
        const cell = removed.pop()!;
        givens[cell] = solution[cell]!;
      }
    }
    if (grade(givens) === level) return { n, level, givens, solution };
  }
}

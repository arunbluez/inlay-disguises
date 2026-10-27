// The puzzle engine on its own: every puzzle number gives one fixed, uniquely solvable grid at its
// level. Generation times are printed per level (p50 / p95 on this machine).
import {
  generate,
  isPuzzleNumber,
  levelOf,
  MAX_PUZZLE,
  type Puzzle,
} from '../src/engine/generator';
import { grade, LEVELS, solvesWith, type Level } from '../src/engine/grade';
import { CELLS, isSolved, isUnique, search } from '../src/engine/solver';

/** Seeds per level for the uniqueness, solution and grading checks. */
const SEEDS = 500;

/** The `SEEDS` puzzle numbers of `level`, spread over the whole range. */
function numbersOf(level: Level): number[] {
  const offset = LEVELS.indexOf(level) + 1;
  const stride = Math.floor(MAX_PUZZLE / (SEEDS * LEVELS.length)) * LEVELS.length;
  return Array.from({ length: SEEDS }, (_, i) => i * stride + offset);
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

describe.each(LEVELS)('%s puzzles', (level) => {
  const puzzles: Puzzle[] = [];
  const times: number[] = [];

  beforeAll(() => {
    for (const n of numbersOf(level)) {
      const start = performance.now();
      puzzles.push(generate(n));
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const givens = puzzles.map((p) => p.givens.filter((v) => v !== 0).length);
    console.log(
      `${level}: ${SEEDS} puzzles, generation p50 ${percentile(times, 50).toFixed(1)} ms, ` +
        `p95 ${percentile(times, 95).toFixed(1)} ms, max ${times.at(-1)!.toFixed(1)} ms; ` +
        `givens ${Math.min(...givens)}–${Math.max(...givens)}`,
    );
  }, 600_000);

  it(`has the level its number names, for ${SEEDS} numbers`, () => {
    for (const puzzle of puzzles) {
      expect(puzzle.level).toBe(level);
      expect(levelOf(puzzle.n)).toBe(level);
    }
  });

  it('has exactly one solution, and it is the stored one', () => {
    for (const puzzle of puzzles) {
      expect(puzzle.givens).toHaveLength(CELLS);
      expect(isUnique(puzzle.givens)).toBe(true);
      expect(search(puzzle.givens, 1).solution).toEqual(puzzle.solution);
    }
  });

  it('solves to a valid, complete grid that keeps every given', () => {
    for (const puzzle of puzzles) {
      expect(isSolved(puzzle.solution)).toBe(true);
      puzzle.givens.forEach((digit, cell) => {
        if (digit !== 0) expect(puzzle.solution[cell]).toBe(digit);
      });
    }
  });

  it('grades as its level: the level below cannot finish it, its own level can', () => {
    for (const puzzle of puzzles) {
      expect(grade(puzzle.givens)).toBe(level);
      const below = LEVELS[LEVELS.indexOf(level) - 1];
      if (below && below !== 'expert') expect(solvesWith(puzzle.givens, below)).toBe(false);
      if (level !== 'expert') expect(solvesWith(puzzle.givens, level)).toBe(true);
    }
  });
});

describe('puzzle numbers', () => {
  it('are deterministic: two fresh module loads give identical grids', () => {
    const numbers = [1, 2, 3, 4, 1284, 246_810, 482_916, MAX_PUZZLE];
    const load = () => {
      let grids: Puzzle[] = [];
      jest.isolateModules(() => {
        const fresh =
          jest.requireActual<typeof import('../src/engine/generator')>('../src/engine/generator');
        grids = numbers.map((n) => fresh.generate(n));
      });
      return grids;
    };
    const first = load();
    const second = load();
    expect(second).toEqual(first);
    // Different numbers give different grids.
    expect(new Set(first.map((p) => p.givens.join(''))).size).toBe(numbers.length);
  });

  it('take levels in turn', () => {
    expect([1, 2, 3, 4, 5, 8, 9].map(levelOf)).toEqual([
      'easy',
      'medium',
      'hard',
      'expert',
      'easy',
      'expert',
      'easy',
    ]);
  });

  it('run from 1 to 999,999,999; anything else is not a puzzle', () => {
    expect(isPuzzleNumber(1)).toBe(true);
    expect(isPuzzleNumber(MAX_PUZZLE)).toBe(true);
    for (const n of [0, -1, 1.5, MAX_PUZZLE + 1, Number.NaN]) {
      expect(isPuzzleNumber(n)).toBe(false);
      expect(() => generate(n)).toThrow(RangeError);
    }
  });
});

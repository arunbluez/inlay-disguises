// The board's geometry and a complete solver. A grid is 81 numbers, row by row; 0 is an empty cell.
// Candidates are 9-bit masks: bit d - 1 set means digit d can go there.
import { shuffle, type Random } from './random';

export type Grid = readonly number[];

export const SIZE = 9;
export const CELLS = SIZE * SIZE;
/** Every digit possible. */
export const ALL = 0x1ff;

export const rowOf = (cell: number) => Math.floor(cell / SIZE);
export const colOf = (cell: number) => cell % SIZE;
export const boxOf = (cell: number) =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3);

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** The 27 units: nine rows, nine columns, nine boxes, each as its nine cells. */
export const UNITS: readonly (readonly number[])[] = [
  ...range(SIZE).map((r) => range(SIZE).map((c) => r * SIZE + c)),
  ...range(SIZE).map((c) => range(SIZE).map((r) => r * SIZE + c)),
  ...range(SIZE).map((b) => range(CELLS).filter((cell) => boxOf(cell) === b)),
];

/** The 20 cells that share a row, column or box with each cell. */
export const PEERS: readonly (readonly number[])[] = range(CELLS).map((cell) =>
  range(CELLS).filter(
    (other) =>
      other !== cell &&
      (rowOf(other) === rowOf(cell) ||
        colOf(other) === colOf(cell) ||
        boxOf(other) === boxOf(cell)),
  ),
);

/** Set bits in each 9-bit mask. */
export const BITS: readonly number[] = range(ALL + 1).map((mask) =>
  range(SIZE).reduce((sum, i) => sum + ((mask >> i) & 1), 0),
);

export const bit = (digit: number) => 1 << (digit - 1);

/** The digits in `mask`, smallest first. */
export function digitsOf(mask: number): number[] {
  return range(SIZE)
    .filter((i) => mask & (1 << i))
    .map((i) => i + 1);
}

export interface SearchResult {
  /** Solutions found, stopping at the limit. */
  count: number;
  /** The first solution found, or null when there is none. */
  solution: number[] | null;
}

// Lookup tables for the search's inner loop.
const ROW = range(CELLS).map(rowOf);
const COL = range(CELLS).map(colOf);
const BOX = range(CELLS).map(boxOf);
/** The digit of each mask with one bit set. */
const DIGIT: readonly number[] = range(ALL + 1).map((mask) =>
  BITS[mask] === 1 ? Math.log2(mask) + 1 : 0,
);

/**
 * Depth-first search for solutions of `grid`, up to `limit`. Each step fills every cell left with
 * a single candidate, then branches on the empty cell with the fewest candidates. With `random`,
 * the branch order of digits is shuffled (the generator uses it to fill an empty grid). Written
 * with plain loops: it runs thousands of times per puzzle.
 */
export function search(grid: Grid, limit: number, random?: Random): SearchResult {
  const cells = grid.slice();
  const rows = new Array<number>(SIZE).fill(0);
  const cols = new Array<number>(SIZE).fill(0);
  const boxes = new Array<number>(SIZE).fill(0);
  const result: SearchResult = { count: 0, solution: null };

  const toggle = (cell: number, mask: number) => {
    rows[ROW[cell]!]! ^= mask;
    cols[COL[cell]!]! ^= mask;
    boxes[BOX[cell]!]! ^= mask;
  };
  const free = (cell: number) =>
    ALL & ~(rows[ROW[cell]!]! | cols[COL[cell]!]! | boxes[BOX[cell]!]!);

  for (let cell = 0; cell < CELLS; cell++) {
    const digit = cells[cell]!;
    if (digit === 0) continue;
    if (!(free(cell) & bit(digit))) return result;
    toggle(cell, bit(digit));
  }

  /** Empties the cells filled since `mark` in `trail`. */
  const trail: number[] = [];
  const undo = (mark: number) => {
    while (trail.length > mark) {
      const cell = trail.pop()!;
      toggle(cell, bit(cells[cell]!));
      cells[cell] = 0;
    }
  };
  const place = (cell: number, digit: number) => {
    cells[cell] = digit;
    toggle(cell, bit(digit));
    trail.push(cell);
  };

  /** True when the limit is reached and the search should stop. */
  const visit = (): boolean => {
    const mark = trail.length;
    let branch = -1;
    for (let progress = true; progress;) {
      progress = false;
      branch = -1;
      let fewest = SIZE + 1;
      for (let cell = 0; cell < CELLS; cell++) {
        if (cells[cell] !== 0) continue;
        const mask = free(cell);
        const count = BITS[mask]!;
        if (count === 0) {
          undo(mark);
          return false;
        }
        if (count === 1) {
          place(cell, DIGIT[mask]!);
          progress = true;
        } else if (count < fewest) {
          fewest = count;
          branch = cell;
        }
      }
    }
    if (branch === -1) {
      result.count += 1;
      if (!result.solution) result.solution = cells.slice();
      undo(mark);
      return result.count >= limit;
    }
    const digits = digitsOf(free(branch));
    if (random) shuffle(digits, random);
    for (let i = 0; i < digits.length; i++) {
      const before = trail.length;
      place(branch, digits[i]!);
      const done = visit();
      undo(before);
      if (done) {
        undo(mark);
        return true;
      }
    }
    undo(mark);
    return false;
  };

  visit();
  return result;
}

/** Whether `grid` has exactly one solution. */
export function isUnique(grid: Grid): boolean {
  return search(grid, 2).count === 1;
}

/** Whether `grid` is a complete, valid solution. */
export function isSolved(grid: Grid): boolean {
  return UNITS.every(
    (unit) => unit.reduce((mask, cell) => mask | bit(grid[cell]! || 10), 0) === ALL,
  );
}

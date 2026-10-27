// Difficulty, graded by the techniques a person needs: the grid is solved by deduction alone, with
// the techniques each level allows, and the level is the first one that finishes it.
//   easy    singles: a cell with one candidate left, or a digit with one place left in a unit
//           (a "lone single")
//   medium  + pointing and claiming: a digit confined to one line inside a box, or to one box
//           inside a line, leaves the rest of that line or box
//   hard    + pairs and triples: two or three cells of a unit holding only two or three digits,
//           or two or three digits with only two or three places in a unit
//   expert  needs more than that
import { ALL, BITS, bit, boxOf, CELLS, colOf, PEERS, rowOf, UNITS, type Grid } from './solver';

export const LEVELS = ['easy', 'medium', 'hard', 'expert'] as const;
export type Level = (typeof LEVELS)[number];

/** Levels that deduction can finish; `expert` is whatever is left. */
export type LogicLevel = Exclude<Level, 'expert'>;

interface Board {
  values: number[];
  /** Candidates of each empty cell; 0 for a filled one. */
  candidates: number[];
}

/** The digit of a mask with one bit set. */
const digitOf = (mask: number) => 32 - Math.clz32(mask);

function place(board: Board, cell: number, digit: number): void {
  board.values[cell] = digit;
  board.candidates[cell] = 0;
  const peers = PEERS[cell]!;
  for (let i = 0; i < peers.length; i++) board.candidates[peers[i]!]! &= ~bit(digit);
}

/**
 * Where each digit can still go in `unit`: entry d - 1 has bit i set when `unit[i]` may hold d.
 */
function placesIn(board: Board, unit: readonly number[]): number[] {
  const places = new Array<number>(9).fill(0);
  for (let i = 0; i < 9; i++) {
    for (let mask = board.candidates[unit[i]!]!; mask; mask &= mask - 1) {
      places[digitOf(mask & -mask) - 1]! |= 1 << i;
    }
  }
  return places;
}

/** Removes `mask` from the cells of `unit` outside `keep` (unit positions); true if any changed. */
function removeIn(board: Board, unit: readonly number[], keep: number, mask: number): boolean {
  let changed = false;
  for (let i = 0; i < 9; i++) {
    const cell = unit[i]!;
    if (!(keep & (1 << i)) && board.candidates[cell]! & mask) {
      board.candidates[cell]! &= ~mask;
      changed = true;
    }
  }
  return changed;
}

function singles(board: Board): boolean {
  let placed = false;
  for (let cell = 0; cell < CELLS; cell++) {
    const mask = board.candidates[cell]!;
    if (board.values[cell] === 0 && BITS[mask] === 1) {
      place(board, cell, digitOf(mask));
      placed = true;
    }
  }
  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u]!;
    const places = placesIn(board, unit);
    for (let d = 0; d < 9; d++) {
      if (BITS[places[d]!] !== 1) continue;
      const cell = unit[digitOf(places[d]!) - 1]!;
      // An earlier placement in this sweep may have taken the digit already.
      if (board.candidates[cell]! & (1 << d)) {
        place(board, cell, d + 1);
        placed = true;
      }
    }
  }
  return placed;
}

/** Rows, columns and boxes: where each kind starts in `UNITS`. */
const KINDS = [
  { of: rowOf, first: 0 },
  { of: colOf, first: 9 },
  { of: boxOf, first: 18 },
] as const;

function pointingAndClaiming(board: Board): boolean {
  let changed = false;
  for (const unit of UNITS) {
    placesIn(board, unit).forEach((places, d) => {
      if (BITS[places]! < 2) return;
      const spots = unit.filter((_, i) => places & (1 << i));
      // Inside a box: all in one row or column. Inside a line: all in one box.
      for (const { of, first } of KINDS) {
        const at = of(spots[0]!);
        if (of(unit[0]!) === of(unit[8]!) || !spots.every((cell) => of(cell) === at)) continue;
        const other = UNITS[first + at]!;
        const keep = other.reduce(
          (sum, cell, i) => (unit.includes(cell) ? sum | (1 << i) : sum),
          0,
        );
        if (removeIn(board, other, keep, 1 << d)) changed = true;
      }
    });
  }
  return changed;
}

function pairsAndTriples(board: Board): boolean {
  let changed = false;
  for (const unit of UNITS) {
    // k cells holding only k digits: those digits leave the rest of the unit.
    const open = unit.flatMap((cell, i) => (board.values[cell] === 0 ? [i] : []));
    const held = (i: number) => board.candidates[unit[i]!]!;
    for (let a = 0; a < open.length; a++) {
      for (let b = a + 1; b < open.length; b++) {
        const two = held(open[a]!) | held(open[b]!);
        if (BITS[two] === 2) {
          if (removeIn(board, unit, (1 << open[a]!) | (1 << open[b]!), two)) changed = true;
          continue;
        }
        if (BITS[two]! > 3) continue;
        for (let c = b + 1; c < open.length; c++) {
          const three = two | held(open[c]!);
          const keep = (1 << open[a]!) | (1 << open[b]!) | (1 << open[c]!);
          if (BITS[three] === 3 && removeIn(board, unit, keep, three)) changed = true;
        }
      }
    }
    // k digits with only k places: those places keep only those digits.
    const places = placesIn(board, unit);
    const restrict = (keep: number, digits: number) =>
      removeIn(board, unit, ALL & ~keep, ALL & ~digits);
    for (let a = 0; a < 9; a++) {
      if (!places[a]) continue;
      for (let b = a + 1; b < 9; b++) {
        if (!places[b]) continue;
        const two = places[a]! | places[b]!;
        if (BITS[two] === 2) {
          if (restrict(two, (1 << a) | (1 << b))) changed = true;
          continue;
        }
        if (BITS[two]! > 3) continue;
        for (let c = b + 1; c < 9; c++) {
          if (!places[c]) continue;
          const three = two | places[c]!;
          if (BITS[three] === 3 && restrict(three, (1 << a) | (1 << b) | (1 << c))) changed = true;
        }
      }
    }
  }
  return changed;
}

const RANK: Record<Level, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

/** Whether deduction with the techniques up to `level` fills every cell of `grid`. */
export function solvesWith(grid: Grid, level: LogicLevel): boolean {
  const board: Board = { values: grid.slice(), candidates: new Array<number>(CELLS).fill(ALL) };
  for (let cell = 0; cell < CELLS; cell++) {
    if (grid[cell]) place(board, cell, grid[cell]!);
  }
  const rank = RANK[level];
  for (;;) {
    let open = 0;
    for (let cell = 0; cell < CELLS; cell++) {
      if (board.values[cell] !== 0) continue;
      if (board.candidates[cell] === 0) return false;
      open += 1;
    }
    if (open === 0) return true;
    if (singles(board)) continue;
    if (rank >= RANK.medium && pointingAndClaiming(board)) continue;
    if (rank >= RANK.hard && pairsAndTriples(board)) continue;
    return false;
  }
}

/** The level of a grid with one solution. */
export function grade(grid: Grid): Level {
  return LEVELS.find((level) => level === 'expert' || solvesWith(grid, level))!;
}

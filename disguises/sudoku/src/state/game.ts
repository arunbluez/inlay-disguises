// Playing a puzzle: every change touches one cell and is recorded as a move, so it can be undone
// and redone. Pure functions; the store keeps the result.
import type { Puzzle } from '../engine/generator';
import { bit, CELLS } from '../engine/solver';
import { UNDO_LIMIT, type Game, type Move } from './storage';

export function newGame(puzzle: Puzzle): Game {
  return {
    n: puzzle.n,
    values: puzzle.givens.slice(),
    notes: new Array<number>(CELLS).fill(0),
    elapsedMs: 0,
    undo: [],
    redo: [],
  };
}

function apply(game: Game, cell: number, value: number, notes: number): Game {
  const values = game.values.slice();
  const allNotes = game.notes.slice();
  values[cell] = value;
  allNotes[cell] = notes;
  return { ...game, values, notes: allNotes };
}

/** Sets one cell, recording the move; a change to nothing records nothing. */
function edit(game: Game, cell: number, value: number, notes: number): Game {
  const before = [game.values[cell]!, game.notes[cell]!];
  if (before[0] === value && before[1] === notes) return game;
  const move: Move = [cell, before[0]!, before[1]!, value, notes];
  return {
    ...apply(game, cell, value, notes),
    undo: [...game.undo, move].slice(-UNDO_LIMIT),
    redo: [],
  };
}

/**
 * A number pad key on `cell`. In notes mode it toggles that note (and empties the cell); otherwise
 * it enters the digit, or takes it out again when the cell already holds it. Givens don't change.
 */
export function enter(
  game: Game,
  puzzle: Puzzle,
  cell: number,
  digit: number,
  notesMode: boolean,
): Game {
  if (puzzle.givens[cell] !== 0) return game;
  if (notesMode) return edit(game, cell, 0, game.notes[cell]! ^ bit(digit));
  return edit(game, cell, game.values[cell] === digit ? 0 : digit, 0);
}

export function erase(game: Game, puzzle: Puzzle, cell: number): Game {
  return puzzle.givens[cell] !== 0 ? game : edit(game, cell, 0, 0);
}

/**
 * Fills one cell with its solution: `selected` when it is empty or wrong, else the first cell that
 * is. Returns the game and the cell it filled, or null when every cell is already right.
 */
export function hint(
  game: Game,
  puzzle: Puzzle,
  selected: number | null,
): { game: Game; cell: number } | null {
  const open = (cell: number) => game.values[cell] !== puzzle.solution[cell];
  const cell =
    selected !== null && open(selected) ? selected : game.values.findIndex((_, i) => open(i));
  if (cell < 0) return null;
  return { game: edit(game, cell, puzzle.solution[cell]!, 0), cell };
}

export function undo(game: Game): Game {
  const move = game.undo.at(-1);
  if (!move) return game;
  const [cell, value, notes] = move;
  return {
    ...apply(game, cell, value, notes),
    undo: game.undo.slice(0, -1),
    redo: [...game.redo, move],
  };
}

export function redo(game: Game): Game {
  const move = game.redo.at(-1);
  if (!move) return game;
  const [cell, , , value, notes] = move;
  return {
    ...apply(game, cell, value, notes),
    undo: [...game.undo, move],
    redo: game.redo.slice(0, -1),
  };
}

export function isComplete(game: Game, puzzle: Puzzle): boolean {
  return game.values.every((value, cell) => value === puzzle.solution[cell]);
}

/** How many of `digit` are still to place correctly. */
export function remaining(game: Game, puzzle: Puzzle, digit: number): number {
  return game.values.reduce(
    (left, value, cell) => (value === digit && puzzle.solution[cell] === digit ? left - 1 : left),
    9,
  );
}

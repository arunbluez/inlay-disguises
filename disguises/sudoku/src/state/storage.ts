// What Sudoku keeps between launches, as JSON under versioned keys: the game in progress, the
// stats and the settings. Anything missing or unreadable reads as a fresh install.
import type { DisguiseStorage } from '@inlay/disguise-sdk';

import { dayOfPuzzle } from '../engine/daily';
import { LEVELS, type Level } from '../engine/grade';
import { CELLS } from '../engine/solver';

export const GAME_KEY = 'sudoku.game.v1';
export const STATS_KEY = 'sudoku.stats.v1';
export const SETTINGS_KEY = 'sudoku.settings.v1';

/** Undo steps kept; older ones drop off. */
export const UNDO_LIMIT = 100;
/** Solves kept for the Stats chart. */
export const RECENT_LIMIT = 7;
/** Days with a daily solve kept for the streak and the week row. */
const DAYS_LIMIT = 400;

/** One change to one cell: [cell, value before, notes before, value after, notes after]. */
export type Move = [number, number, number, number, number];

export interface Game {
  /** The puzzle number. */
  n: number;
  /** The board as played: the givens plus what the player entered; 0 is empty. */
  values: number[];
  /** Notes of each cell as a 9-bit mask (bit d - 1 for digit d). */
  notes: number[];
  elapsedMs: number;
  /** Oldest first, at most `UNDO_LIMIT`. */
  undo: Move[];
  redo: Move[];
}

export interface LevelStats {
  solved: number;
  bestMs: number | null;
  totalMs: number;
}

export interface Solve {
  n: number;
  level: Level;
  ms: number;
  /** When it was solved, in ms since the epoch. */
  at: number;
}

export interface Stats {
  levels: Record<Level, LevelStats>;
  /** The latest solves, oldest first, at most `RECENT_LIMIT`. */
  recent: Solve[];
  /** Days (see `dayOf`) on which that day's daily puzzle was solved, ascending. */
  days: number[];
}

export interface Settings {
  showTimer: boolean;
  /** Tint every cell holding the selected cell's digit. */
  matching: boolean;
  /** Show entries that don't match the solution in the danger colour. */
  mistakes: boolean;
}

export const DEFAULT_SETTINGS: Settings = { showTimer: true, matching: true, mistakes: true };

export function emptyStats(): Stats {
  const levels = Object.fromEntries(
    LEVELS.map((level) => [level, { solved: 0, bestMs: null, totalMs: 0 }]),
  ) as Record<Level, LevelStats>;
  return { levels, recent: [], days: [] };
}

function read(storage: DisguiseStorage, key: string): unknown {
  const text = storage.getString(key);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isCells = (value: unknown, max: number): value is number[] =>
  Array.isArray(value) && value.length === CELLS && value.every((v) => isCount(v) && v <= max);

const isMove = (value: unknown): value is Move =>
  Array.isArray(value) && value.length === 5 && value.every(isCount);

const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

export function loadGame(storage: DisguiseStorage): Game | null {
  const game = read(storage, GAME_KEY) as Partial<Game> | undefined;
  if (
    !game ||
    !isCount(game.n) ||
    !isCells(game.values, 9) ||
    !isCells(game.notes, 0x1ff) ||
    !isCount(game.elapsedMs)
  ) {
    return null;
  }
  const moves = (list: unknown) => (Array.isArray(list) ? list.filter(isMove) : []);
  return { ...(game as Game), undo: moves(game.undo), redo: moves(game.redo) };
}

export function saveGame(storage: DisguiseStorage, game: Game | null): void {
  if (game) storage.set(GAME_KEY, JSON.stringify(game));
  else storage.delete(GAME_KEY);
}

export function loadStats(storage: DisguiseStorage): Stats {
  const stored = read(storage, STATS_KEY) as Partial<Stats> | undefined;
  const stats = emptyStats();
  if (!stored || typeof stored !== 'object') return stats;
  for (const level of LEVELS) {
    const entry = stored.levels?.[level];
    if (!entry || !isCount(entry.solved) || !isCount(entry.totalMs)) continue;
    stats.levels[level] = {
      solved: entry.solved,
      totalMs: entry.totalMs,
      bestMs: isCount(entry.bestMs) ? entry.bestMs : null,
    };
  }
  if (Array.isArray(stored.recent)) {
    stats.recent = stored.recent.filter(
      (solve: Partial<Solve>) =>
        isCount(solve.n) && isLevel(solve.level) && isCount(solve.ms) && isCount(solve.at),
    );
  }
  if (Array.isArray(stored.days)) stats.days = stored.days.filter(isCount);
  return stats;
}

/**
 * Adds `solve` to the stats, stores the result and returns it. A daily puzzle solved on its own
 * day (`today`) counts towards the streak.
 */
export function recordSolve(
  storage: DisguiseStorage,
  stats: Stats,
  solve: Solve,
  today: number,
): Stats {
  const level = stats.levels[solve.level];
  const days =
    dayOfPuzzle(solve.n) === today && !stats.days.includes(today)
      ? [...stats.days, today].slice(-DAYS_LIMIT)
      : stats.days;
  const next: Stats = {
    levels: {
      ...stats.levels,
      [solve.level]: {
        solved: level.solved + 1,
        totalMs: level.totalMs + solve.ms,
        bestMs: level.bestMs === null ? solve.ms : Math.min(level.bestMs, solve.ms),
      },
    },
    recent: [...stats.recent, solve].slice(-RECENT_LIMIT),
    days,
  };
  storage.set(STATS_KEY, JSON.stringify(next));
  return next;
}

/** Days in a row with a daily solve, up to today (or up to yesterday, while today is open). */
export function streak(stats: Stats, today: number): number {
  const days = new Set(stats.days);
  let day = days.has(today) ? today : today - 1;
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day -= 1;
  }
  return count;
}

export function loadSettings(storage: DisguiseStorage): Settings {
  const stored = read(storage, SETTINGS_KEY) as Partial<Settings> | undefined;
  const flag = (key: keyof Settings) =>
    typeof stored?.[key] === 'boolean' ? stored[key] : DEFAULT_SETTINGS[key];
  return { showTimer: flag('showTimer'), matching: flag('matching'), mistakes: flag('mistakes') };
}

export function saveSettings(storage: DisguiseStorage, settings: Settings): void {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
}

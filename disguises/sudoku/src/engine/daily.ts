// The daily puzzles: four a day, one per level, numbered from the first day.
import { LEVELS, type Level } from './grade';

const DAY_MS = 86_400_000;
/** Day 0, the first day with daily puzzles (#1 to #4). */
const FIRST_DAY = Date.UTC(2025, 0, 1);

/** Days since the first day, by the calendar date where the player is. */
export function dayOf(date: Date): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((local - FIRST_DAY) / DAY_MS);
}

/** The number of `day`'s daily puzzle at `level`; its level is `level` (see `levelOf`). */
export function dailyPuzzle(day: number, level: Level): number {
  return day * LEVELS.length + LEVELS.indexOf(level) + 1;
}

/** The day whose daily puzzles include #n. */
export function dayOfPuzzle(n: number): number {
  return Math.floor((n - 1) / LEVELS.length);
}

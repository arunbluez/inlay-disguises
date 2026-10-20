import type { DisguiseStorage } from '@inlay/disguise-sdk';

import type { OutputFormat } from '../engine/compress';

/** One finished compression. */
export interface Run {
  /** The photo's name, or "3 photos". */
  name: string;
  /** Type of the first photo, for the file tile. */
  ext: string;
  photos: number;
  /** When it finished, in ms since the epoch. */
  at: number;
  /** Total bytes before and after. */
  before: number;
  after: number;
}

export interface History {
  /** Every byte saved by every run, including runs no longer in `runs`. */
  savedBytes: number;
  /** Every run ever, including runs no longer in `runs`. */
  count: number;
  /** Newest first, at most `HISTORY_LIMIT`. */
  runs: Run[];
}

/** What a new compression starts with. */
export interface Defaults {
  quality: number;
  format: OutputFormat;
}

export const HISTORY_KEY = 'history';
export const DEFAULTS_KEY = 'defaults';
/** Runs kept for the History list. */
export const HISTORY_LIMIT = 100;

export const EMPTY_HISTORY: History = { savedBytes: 0, count: 0, runs: [] };
export const FACTORY_DEFAULTS: Defaults = { quality: 70, format: 'original' };

function read(storage: DisguiseStorage, key: string): unknown {
  const text = storage.getString(key);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function isRun(value: unknown): value is Run {
  const run = value as Partial<Run> | null;
  return (
    typeof run === 'object' &&
    run !== null &&
    typeof run.name === 'string' &&
    typeof run.ext === 'string' &&
    [run.photos, run.at, run.before, run.after].every(isNumber)
  );
}

/** The stored history; anything missing or unreadable reads as empty. */
export function loadHistory(storage: DisguiseStorage): History {
  const stored = read(storage, HISTORY_KEY) as Partial<History> | undefined;
  if (!stored || !isNumber(stored.savedBytes) || !isNumber(stored.count)) return EMPTY_HISTORY;
  const runs = Array.isArray(stored.runs) ? stored.runs.filter(isRun) : [];
  return { savedBytes: stored.savedBytes, count: stored.count, runs };
}

/** Adds `run` as the newest entry, stores the result and returns it. */
export function recordRun(storage: DisguiseStorage, history: History, run: Run): History {
  const next: History = {
    savedBytes: history.savedBytes + Math.max(0, run.before - run.after),
    count: history.count + 1,
    runs: [run, ...history.runs].slice(0, HISTORY_LIMIT),
  };
  storage.set(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function loadDefaults(storage: DisguiseStorage): Defaults {
  const stored = read(storage, DEFAULTS_KEY) as Partial<Defaults> | undefined;
  return {
    quality: isNumber(stored?.quality) ? stored.quality : FACTORY_DEFAULTS.quality,
    format: stored?.format === 'jpeg' ? 'jpeg' : FACTORY_DEFAULTS.format,
  };
}

export function saveDefaults(storage: DisguiseStorage, defaults: Defaults): void {
  storage.set(DEFAULTS_KEY, JSON.stringify(defaults));
}

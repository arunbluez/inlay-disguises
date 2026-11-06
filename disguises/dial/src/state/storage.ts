// What Dial keeps between launches: the face and three switches, and the second time as an
// offset from the current time. Every value is a string; anything missing or unreadable reads as
// the default.
import type { DisguiseStorage } from '@inlay/disguise-sdk';

import { DEFAULT_THEME, themeById, type ThemeId } from '../themes';

export const KEYS = {
  theme: 'theme',
  twentyFourHour: 'twentyFourHour',
  showSeconds: 'showSeconds',
  showDate: 'showDate',
  secondTimeOffsetMinutes: 'secondTimeOffsetMinutes',
} as const;

export interface Settings {
  theme: ThemeId;
  twentyFourHour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  /** Minutes from the current time to the second time; `null` when none is pinned. */
  secondTimeOffsetMinutes: number | null;
}

export type Switch = 'twentyFourHour' | 'showSeconds' | 'showDate';

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  twentyFourHour: false,
  showSeconds: true,
  showDate: true,
  secondTimeOffsetMinutes: null,
};

function readJson(storage: DisguiseStorage, key: string): unknown {
  const raw = storage.getString(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readBoolean(storage: DisguiseStorage, key: Switch): boolean {
  const value = readJson(storage, key);
  return typeof value === 'boolean' ? value : DEFAULT_SETTINGS[key];
}

export function loadSettings(storage: DisguiseStorage): Settings {
  const offset = readJson(storage, KEYS.secondTimeOffsetMinutes);
  return {
    theme: themeById(storage.getString(KEYS.theme)).id,
    twentyFourHour: readBoolean(storage, 'twentyFourHour'),
    showSeconds: readBoolean(storage, 'showSeconds'),
    showDate: readBoolean(storage, 'showDate'),
    secondTimeOffsetMinutes: typeof offset === 'number' && Number.isInteger(offset) ? offset : null,
  };
}

export function saveTheme(storage: DisguiseStorage, theme: ThemeId) {
  storage.set(KEYS.theme, theme);
}

export function saveSwitch(storage: DisguiseStorage, key: Switch, value: boolean) {
  storage.set(KEYS[key], JSON.stringify(value));
}

export function saveSecondTime(storage: DisguiseStorage, offsetMinutes: number | null) {
  if (offsetMinutes === null) storage.delete(KEYS.secondTimeOffsetMinutes);
  else storage.set(KEYS.secondTimeOffsetMinutes, JSON.stringify(offsetMinutes));
}

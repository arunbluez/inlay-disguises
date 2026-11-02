// Dial faces as data. A face's palette is its own (a railway clock is white with a red seconds
// hand whatever the phone's scheme); everything around the dial uses the host theme's colours.
import type { ColorScheme } from '@inlay/disguise-sdk';

export type ThemeId = 'classic' | 'minimal' | 'station' | 'night' | 'roman';

export interface DialPalette {
  face: string;
  /** The ring around the face. */
  rim: string;
  /** Minute and hour ticks. */
  ticks: string;
  numerals: string;
  hour: string;
  minute: string;
  second: string;
  /** The cap where the hands meet. */
  cap: string;
}

/** A hand's length (share of the radius), width and tail (share of the radius behind the centre). */
export interface HandShape {
  length: number;
  /** Share of the radius. */
  width: number;
  tail: number;
  /** `bar`: square ends. `round`: pill ends. `taper`: narrows to the tip. */
  shape: 'bar' | 'round' | 'taper';
}

export interface DialTheme {
  id: ThemeId;
  name: string;
  /** `arabic` 1 to 12, `roman` I to XII, `none`. */
  numerals: 'arabic' | 'roman' | 'none';
  /**
   * `fine`: 60 thin ticks, hours longer. `bold`: railway ticks, thick hour bars. `quarters`: four
   * markers only. `hours`: twelve dots.
   */
  ticks: 'fine' | 'bold' | 'quarters' | 'hours';
  hour: HandShape;
  minute: HandShape;
  /** `line`: a thin needle. `disc`: a needle with a round counterweight near the tip. */
  second: 'line' | 'disc';
  light: DialPalette;
  dark: DialPalette;
}

export const dialThemes: readonly DialTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    numerals: 'arabic',
    ticks: 'fine',
    hour: { length: 0.5, width: 0.035, tail: 0.1, shape: 'round' },
    minute: { length: 0.74, width: 0.025, tail: 0.12, shape: 'round' },
    second: 'line',
    light: {
      face: '#fbfaf7',
      rim: '#d9d5cf',
      ticks: '#3a3632',
      numerals: '#2a2724',
      hour: '#2a2724',
      minute: '#2a2724',
      second: '#c24a1f',
      cap: '#2a2724',
    },
    dark: {
      face: '#2b2927',
      rim: '#3d3a37',
      ticks: '#cfcac4',
      numerals: '#eeebe7',
      hour: '#eeebe7',
      minute: '#eeebe7',
      second: '#f08257',
      cap: '#eeebe7',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    numerals: 'none',
    ticks: 'quarters',
    hour: { length: 0.46, width: 0.05, tail: 0, shape: 'round' },
    minute: { length: 0.72, width: 0.035, tail: 0, shape: 'round' },
    second: 'line',
    light: {
      face: '#f1efeb',
      rim: '#f1efeb',
      ticks: '#8f8a84',
      numerals: '#25221f',
      hour: '#25221f',
      minute: '#25221f',
      second: '#2f6fd6',
      cap: '#25221f',
    },
    dark: {
      face: '#262423',
      rim: '#262423',
      ticks: '#7d7873',
      numerals: '#eeebe7',
      hour: '#eeebe7',
      minute: '#eeebe7',
      second: '#6ea0f5',
      cap: '#eeebe7',
    },
  },
  {
    id: 'station',
    name: 'Station',
    numerals: 'none',
    ticks: 'bold',
    hour: { length: 0.56, width: 0.07, tail: 0.18, shape: 'bar' },
    minute: { length: 0.86, width: 0.055, tail: 0.18, shape: 'bar' },
    second: 'disc',
    light: {
      face: '#ffffff',
      rim: '#1b1b1b',
      ticks: '#111111',
      numerals: '#111111',
      hour: '#111111',
      minute: '#111111',
      second: '#d4211c',
      cap: '#111111',
    },
    dark: {
      face: '#e9e7e3',
      rim: '#0d0d0d',
      ticks: '#111111',
      numerals: '#111111',
      hour: '#111111',
      minute: '#111111',
      second: '#d4211c',
      cap: '#111111',
    },
  },
  {
    id: 'night',
    name: 'Night',
    numerals: 'arabic',
    ticks: 'hours',
    hour: { length: 0.5, width: 0.06, tail: 0.08, shape: 'taper' },
    minute: { length: 0.76, width: 0.045, tail: 0.1, shape: 'taper' },
    second: 'line',
    light: {
      face: '#1c2733',
      rim: '#33414f',
      ticks: '#b9f2c9',
      numerals: '#d9e6ef',
      hour: '#b9f2c9',
      minute: '#b9f2c9',
      second: '#ffb347',
      cap: '#b9f2c9',
    },
    dark: {
      face: '#0e141a',
      rim: '#222c36',
      ticks: '#8fe3a8',
      numerals: '#9fb3c2',
      hour: '#8fe3a8',
      minute: '#8fe3a8',
      second: '#f2a03d',
      cap: '#8fe3a8',
    },
  },
  {
    id: 'roman',
    name: 'Roman',
    numerals: 'roman',
    ticks: 'fine',
    hour: { length: 0.48, width: 0.045, tail: 0.08, shape: 'taper' },
    minute: { length: 0.7, width: 0.032, tail: 0.1, shape: 'taper' },
    second: 'line',
    light: {
      face: '#f6efe2',
      rim: '#b08d57',
      ticks: '#4a3b28',
      numerals: '#3b2e1e',
      hour: '#2e2418',
      minute: '#2e2418',
      second: '#8a2a1e',
      cap: '#b08d57',
    },
    dark: {
      face: '#2a241c',
      rim: '#8a6d42',
      ticks: '#d8c6a4',
      numerals: '#eadbbd',
      hour: '#eadbbd',
      minute: '#eadbbd',
      second: '#e07a5f',
      cap: '#c9a66b',
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'classic';

export function themeById(id: string | undefined): DialTheme {
  return dialThemes.find((theme) => theme.id === id) ?? dialThemes[0]!;
}

export function paletteFor(theme: DialTheme, scheme: ColorScheme): DialPalette {
  return theme[scheme];
}

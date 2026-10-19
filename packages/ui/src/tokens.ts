// Design tokens, taken from the design source ("Inlay System", soft style on Modernist foundations).
// Every value here is read from that file; nothing is invented. Plain data, no React Native imports.

/** 4-pt spacing scale, keyed by its value. */
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  48: 48,
} as const;

/** Fixed layout sizes: screen gutter, list row, primary action height, minimum hit target. */
export const layout = {
  gutter: 20,
  row: 52,
  primaryAction: 56,
  minHit: 44,
} as const;

/**
 * Archivo, one family name per loaded weight. Hosts load the files under exactly these names
 * (they match the export names of `@expo-google-fonts/archivo`); text styles pick the family by
 * weight instead of setting `fontWeight`, so no platform synthesises a weight.
 */
export const fontFamily = {
  400: 'Archivo_400Regular',
  500: 'Archivo_500Medium',
  600: 'Archivo_600SemiBold',
  800: 'Archivo_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fontFamily;

/** Tabular figures, for every numeric field, size, count and timer. */
export const tabularNums = ['tabular-nums'] as const;

/**
 * Type scale: size range (px), weight, tracking (fraction of the size, CSS `em`), line height
 * (multiple of the size). Unset line heights are not given by the source.
 */
export const typeScale = {
  display: { sizes: [56, 112], weight: 800, tracking: -0.04, lineHeight: 1 },
  title: { sizes: [32, 32], weight: 800, tracking: -0.025, lineHeight: 1.05 },
  heading: { sizes: [18, 22], weight: 800 },
  action: { sizes: [15, 16], weight: 800 },
  body: { sizes: [15, 15], weight: 400, lineHeight: 1.5 },
  caption: { sizes: [12, 13], weight: 400 },
  label: { sizes: [10, 11], weight: 600, tracking: 0.1, uppercase: true },
} as const satisfies Record<
  string,
  {
    sizes: readonly [number, number];
    weight: FontWeight;
    tracking?: number;
    lineHeight?: number;
    uppercase?: boolean;
  }
>;

export type TypeRole = keyof typeof typeScale;

/** A React Native compatible text style. */
export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'uppercase';
}

/**
 * Resolves a type role to a text style at `size` (defaults to the smallest size in the role's
 * range). Tracking and line height are converted from relative to absolute points.
 */
export function textStyle(role: TypeRole, size: number = typeScale[role].sizes[0]): TextStyleToken {
  const spec: (typeof typeScale)[TypeRole] = typeScale[role];
  const style: TextStyleToken = { fontFamily: fontFamily[spec.weight], fontSize: size };
  if ('tracking' in spec) style.letterSpacing = spec.tracking * size;
  if ('lineHeight' in spec) style.lineHeight = spec.lineHeight * size;
  if ('uppercase' in spec) style.textTransform = 'uppercase';
  return style;
}

/** Soft corners: 22 cards and sheets, 16 buttons and fields, 12 tiles, pills for toggles. */
export const radii = {
  card: 22,
  sheet: 22,
  button: 16,
  field: 16,
  tile: 12,
  /** Fully rounded ends; any value at least half the control's height. */
  pill: 9999,
} as const;

/** Stroke widths: rule between sections, hairline between rows and cells. */
export const strokes = {
  rule: 2,
  hairline: 1,
} as const;

/**
 * Shadows for light surfaces, as React Native `boxShadow` strings. Dark surfaces don't cast
 * shadows; cards step up to the `surface` colour instead (see `Theme.elevation`).
 */
export const elevation = {
  sm: '0 1px 2px rgba(45,43,43,.14)',
  md: '0 3px 10px rgba(45,43,43,.16)',
  /** Dialogs. */
  lg: '0 12px 32px rgba(45,43,43,.22)',
} as const;

/** Motion: one easing curve and the named durations (ms). */
export const motion = {
  /** cubic-bezier(.2, 0, 0, 1), as control points for `Easing.bezier`. */
  ease: [0.2, 0, 0, 1],
  /** Button fill steps to the deep accent. */
  press: 120,
  /** Hold threshold for a long press; shorter taps do the normal action. */
  longPressCommit: 600,
  /** Fade out, swap, fade in. */
  unlockFade: { duration: 450, out: 230, in: 220 },
  /** Fade to the disguise ground, reset to home, fade in. */
  lockToDisguise: { duration: 210, out: 170, in: 40 },
  /** Opacity over `opacity` ms while scale goes from `scaleFrom` to 1 over `duration` ms. */
  galleryToViewer: { duration: 280, opacity: 240, scaleFrom: 0.94 },
  /** Toggle knob slide; sheets rise without bounce. */
  sheetToggle: 140,
} as const;

export type ColorScheme = 'light' | 'dark';

/** Neutral ground colours, named as in the source. */
export interface Ground {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  rule: string;
  hair2: string;
  /** Ink on top of an accent fill. */
  on: string;
}

export const LIGHT = {
  bg: '#ebe9e6',
  surface: '#f9f8f6',
  ink: '#25221f',
  muted: 'rgba(37,34,31,.62)',
  rule: 'rgba(37,34,31,.16)',
  hair2: 'rgba(37,34,31,.17)',
  on: '#f9f8f6',
} as const satisfies Ground;

/** Graphite, not black. */
export const DARK = {
  bg: '#1f1e1d',
  surface: '#2b2927',
  ink: '#eeebe7',
  muted: 'rgba(238,235,231,.62)',
  rule: 'rgba(238,235,231,.16)',
  hair2: 'rgba(238,235,231,.17)',
  on: '#1f1e1d',
} as const satisfies Ground;

export interface Accent {
  /** Fills: primary action, selected segment, active tab, toggle on. */
  accent: string;
  /** Text actions and the pressed fill. */
  deep: string;
}

/** A complete colour set for one scheme of one theme. */
export interface Palette extends Ground, Accent {}

/** A theme: one palette per colour scheme. */
export interface ThemeDefinition {
  light: Palette;
  dark: Palette;
}

/**
 * The three built-in accents. Sudoku and Brief share one OKLCH lightness and chroma and only turn
 * the hue; the source gives them in OKLCH, converted to sRGB hex by `scripts/oklch.ts`.
 */
export const accents = {
  compress: {
    light: { accent: '#ec3013', deep: '#ae1800' },
    dark: { accent: '#ff563c', deep: '#ff9783' },
  },
  sudoku: {
    light: {
      accent: '#236ade', // oklch(0.55 0.19 260)
      deep: '#0a46a2', // oklch(0.42 0.16 260)
    },
    dark: {
      accent: '#5590f3', // oklch(0.66 0.16 260)
      deep: '#98bffe', // oklch(0.8 0.1 260)
    },
  },
  brief: {
    light: {
      accent: '#1c8742', // oklch(0.55 0.14 150)
      deep: '#0b5d2a', // oklch(0.42 0.11 150)
    },
    dark: {
      accent: '#4eb068', // oklch(0.68 0.14 150)
      deep: '#8ed09c', // oklch(0.8 0.1 150)
    },
  },
} as const satisfies Record<string, Record<ColorScheme, Accent>>;

export type BuiltInThemeId = keyof typeof accents;

/** Builds a theme from the neutral grounds and an accent pair per scheme. */
export function defineTheme(accent: Record<ColorScheme, Accent>): ThemeDefinition {
  return { light: { ...LIGHT, ...accent.light }, dark: { ...DARK, ...accent.dark } };
}

export const themes: Record<BuiltInThemeId, ThemeDefinition> = {
  compress: defineTheme(accents.compress),
  sudoku: defineTheme(accents.sudoku),
  brief: defineTheme(accents.brief),
};

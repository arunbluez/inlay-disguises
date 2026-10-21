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

/** A family and/or weight, ready to spread into a React Native text style. */
export interface FontStyleToken {
  fontFamily?: string;
  fontWeight?: `${FontWeight}`;
}

/**
 * The Archivo family for `weight`. When the host couldn't load Archivo (`archivo` false), the
 * platform system font at the same weight instead: no family, so iOS and Android pick their own.
 */
export function fontStyle(weight: FontWeight, archivo = true): FontStyleToken {
  return archivo ? { fontFamily: fontFamily[weight] } : { fontWeight: `${weight}` };
}

/** Tabular figures, for every numeric field, size, count and timer. */
export const tabularNums = ['tabular-nums'] as const;

/**
 * Type scale: size range (px), weight, tracking (fraction of the size, CSS `em`), line height
 * (multiple of the size). Display, Title and Body line heights are the source's; Heading, Action,
 * Caption and Label aren't given there and are set so every size in the range lands on the 4-pt
 * grid (D-33). `textStyle` rounds each line height up to the next multiple of 4.
 */
export const typeScale = {
  display: { sizes: [56, 112], weight: 800, tracking: -0.04, lineHeight: 1 },
  title: { sizes: [32, 32], weight: 800, tracking: -0.025, lineHeight: 1.05 },
  heading: { sizes: [18, 22], weight: 800, lineHeight: 1.2 },
  action: { sizes: [15, 16], weight: 800, lineHeight: 1.25 },
  body: { sizes: [15, 15], weight: 400, lineHeight: 1.5 },
  caption: { sizes: [12, 13], weight: 400, lineHeight: 1.2 },
  /** Uppercase only, so no descenders: the line can sit just over the size. */
  label: { sizes: [10, 11], weight: 600, tracking: 0.1, lineHeight: 1.05, uppercase: true },
} as const satisfies Record<
  string,
  {
    sizes: readonly [number, number];
    weight: FontWeight;
    tracking?: number;
    lineHeight: number;
    uppercase?: boolean;
  }
>;

/** Line heights snap up to this grid (the 4-pt spacing scale). */
const LINE_GRID = 4;

export type TypeRole = keyof typeof typeScale;

/** A React Native compatible text style. */
export interface TextStyleToken extends FontStyleToken {
  fontSize: number;
  letterSpacing?: number;
  lineHeight: number;
  textTransform?: 'uppercase';
}

/**
 * Resolves a type role to a text style at `size` (defaults to the smallest size in the role's
 * range). Tracking is converted to absolute points; the line height to points on the 4-pt grid.
 * `archivo` false falls back to the system font (see `fontStyle`); themed components pass
 * `useTheme().archivo`.
 */
export function textStyle(
  role: TypeRole,
  size: number = typeScale[role].sizes[0],
  archivo = true,
): TextStyleToken {
  const spec: (typeof typeScale)[TypeRole] = typeScale[role];
  const style: TextStyleToken = {
    ...fontStyle(spec.weight, archivo),
    fontSize: size,
    lineHeight: Math.ceil((spec.lineHeight * size) / LINE_GRID - 1e-9) * LINE_GRID,
  };
  if ('tracking' in spec) style.letterSpacing = spec.tracking * size;
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
  /** How long a toast stays up before it dismisses itself. */
  toastHold: 2400,
} as const;

/**
 * Interaction states shared by every control.
 * - Pressed: accent fills step to `deep`, danger fills to `dangerDeep` (`motion.press`); outlined,
 *   text, chip, segment and row controls lay the palette's `press` tint over their ground.
 * - Disabled: `disabledOpacity`, no pressed feedback, no focus, `accessibilityState.disabled`.
 * - Focused (keyboard or switch access): an ink ring `focusRing.width` wide, `focusRing.offset`
 *   outside the control's edge (inside it for full-width rows, tabs and segments).
 */
export const states = {
  /** Disabled controls drop to 45% opacity (the prototype's not-ready Continue button). */
  disabledOpacity: 0.45,
  focusRing: { width: 2, offset: 2 },
} as const;

/** Dims the screen behind a sheet; the same in both schemes. */
export const scrim = 'rgba(0,0,0,.5)';

/**
 * Control dimensions that the base scale doesn't name, read from the design source's Themes panel
 * and the prototype screens that use each control. Where the two disagree the Themes panel wins,
 * unless the System panel states the size in words (row 52, primary action 56, hit target 44) or
 * a named type role covers the text (D-33).
 */
export const controls = {
  /** Trailing glyph in buttons; tab icons. */
  icon: 22,
  /** Chevron at the end of a pressable row. */
  chevron: 18,
  /** Field box height; text inset inside it. */
  field: 46,
  fieldInset: 12,
  /** Field label size (extra bold, outside the named roles) and its space above the box. */
  fieldLabel: 13,
  labelGap: 6,
  /** Type size of text and number input (regular and semibold, outside the named roles). */
  fieldText: 17,
  numberText: 17,
  /** Outlined (secondary) button height and inset. */
  secondary: { height: 44, inset: 12 },
  chip: { height: 34, inset: 12 },
  /** Segments of a ChipRow; the hit target is padded out to `layout.minHit`. */
  segment: { height: 36, inset: 10 },
  toggle: { width: 44, height: 26, knob: 18, knobInset: 2, border: 2 },
  slider: { fill: 4, thumb: 20 },
  progress: 4,
  tab: { height: 58, heightNoIcon: 50, gap: 4 },
  sheet: { top: 6, headerTop: 12, headerBottom: 14 },
  /** Toast padding and type size (semibold, outside the named roles). */
  toast: { vertical: 12, horizontal: 14, text: 13 },
  emptyState: { padding: 14 },
  /** Leading file-type tile of a file row; its label sits `inset` from the bottom-left corner. */
  fileBadge: { size: 40, inset: 4 },
  /** Remove action at the end of a file row and its glyph; the hit target pads out to 44. */
  rowAction: { size: 36, glyph: 18 },
  /** The accent card that starts a screen's main task ("Add files"), and its leading glyph. */
  actionCard: { height: 120, vertical: 14, horizontal: 16, icon: 26 },
} as const;

export type ColorScheme = 'light' | 'dark';

/** Neutral ground colours, named as in the source; shared by every theme. */
export interface Ground {
  bg: string;
  surface: string;
  /** Tab bars and sheets (the prototype's `--bar`). */
  bar: string;
  ink: string;
  muted: string;
  rule: string;
  hair2: string;
  /** Ink on top of an accent fill. */
  on: string;
  /**
   * Tint laid over any ground while an outlined, text, chip, segment or row control is pressed;
   * also the resting fill of a file row's type tile, which reads as a recess on any ground.
   */
  press: string;
  /** Fill of a destructive action, distinct from every accent; `dangerDeep` is its pressed fill. */
  danger: string;
  dangerDeep: string;
  /** Ink on top of a danger fill. */
  onDanger: string;
}

// `muted` light alpha .62 -> .65 and the danger colours are D-33 additions to the source; the
// danger values are the committed conversion of `oklchGrounds` in `scripts/oklch.ts`.
export const LIGHT = {
  bg: '#ebe9e6',
  surface: '#f9f8f6',
  bar: '#f9f8f6',
  ink: '#25221f',
  muted: 'rgba(37,34,31,.65)',
  rule: 'rgba(37,34,31,.16)',
  hair2: 'rgba(37,34,31,.17)',
  on: '#f9f8f6',
  press: 'rgba(37,34,31,.08)',
  danger: '#b6143f', // oklch(0.5 0.19 15)
  dangerDeep: '#89002a', // oklch(0.4 0.16 15)
  onDanger: '#f9f8f6',
} as const satisfies Ground;

/** Graphite, not black. */
export const DARK = {
  bg: '#1f1e1d',
  surface: '#2b2927',
  bar: '#262423',
  ink: '#eeebe7',
  muted: 'rgba(238,235,231,.62)',
  rule: 'rgba(238,235,231,.16)',
  hair2: 'rgba(238,235,231,.17)',
  on: '#1f1e1d',
  press: 'rgba(238,235,231,.08)',
  danger: '#ec7380', // oklch(0.7 0.15 15)
  dangerDeep: '#f7a3a9', // oklch(0.8 0.1 15)
  onDanger: '#1f1e1d',
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
 * the hue; the source gives them in OKLCH, converted to sRGB hex by `scripts/oklch.ts`. The light
 * Compress and Brief accents sit lower in OKLCH lightness than the source (D-33) so `on` text over
 * them reaches 4.5:1.
 */
export const accents = {
  compress: {
    light: {
      accent: '#dd2200', // oklch(0.575 0.221 31.5); source #ec3013
      deep: '#ae1800',
    },
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
      accent: '#14833e', // oklch(0.535 0.14 150); source oklch(0.55 0.14 150)
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

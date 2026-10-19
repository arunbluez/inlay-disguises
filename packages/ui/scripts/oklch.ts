// OKLCH -> sRGB hex conversion for the accent and danger colours.
//
// React Native does not parse `oklch()` colour strings, so the accents that the design source gives
// in OKLCH are converted here once and committed as hex in `src/tokens.ts`. The tokens test re-runs
// this conversion against `oklchSource` and `oklchGrounds` so a committed hex value can never drift from its source.
// Run `pnpm accents` to print the table.

export type Oklch = readonly [l: number, c: number, h: number];

type Scheme = 'light' | 'dark';

/**
 * Accent values in OKLCH: as the design source (`Inlay System.dc.html`, `A`) gives them, except
 * where D-33 lowers the lightness so `on` text over the fill reaches 4.5:1 (hue kept; chroma kept
 * where the sRGB gamut allows). Compress is a hex value in the source; only its adjusted light
 * accent is listed here.
 */
export const oklchSource = {
  compress: {
    // Source #ec3013 = oklch(0.611 0.225 31.5); lower lightness pulls the gamut's chroma limit in.
    light: { accent: [0.575, 0.221, 31.5] },
  },
  sudoku: {
    light: { accent: [0.55, 0.19, 260], deep: [0.42, 0.16, 260] },
    dark: { accent: [0.66, 0.16, 260], deep: [0.8, 0.1, 260] },
  },
  brief: {
    // Source accent oklch(0.55 0.14 150).
    light: { accent: [0.535, 0.14, 150], deep: [0.42, 0.11, 150] },
    dark: { accent: [0.68, 0.14, 150], deep: [0.8, 0.1, 150] },
  },
} as const satisfies Record<
  string,
  Partial<Record<Scheme, Partial<Record<'accent' | 'deep', Oklch>>>>
>;

/**
 * Ground colours that aren't in the design source (D-33): the destructive fill and its pressed
 * fill. Crimson (hue 15) so it never reads as the Compress red (hue 31.5).
 */
export const oklchGrounds = {
  light: { danger: [0.5, 0.19, 15], dangerDeep: [0.4, 0.16, 15] },
  dark: { danger: [0.7, 0.15, 15], dangerDeep: [0.8, 0.1, 15] },
} as const satisfies Record<Scheme, Record<'danger' | 'dangerDeep', Oklch>>;

/** Formats a source value the way CSS writes it, for comments and the printed table. */
export function formatOklch([l, c, h]: Oklch): string {
  return `oklch(${l} ${c} ${h})`;
}

function linearToSrgb(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

/**
 * Converts OKLCH to an sRGB hex string (Björn Ottosson's OKLab matrices, CSS Color 4).
 * Throws if the colour lies outside the sRGB gamut, so nothing is silently clipped.
 */
export function oklchToHex(value: Oklch): string {
  const [l, c, h] = value;
  const hue = (h * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);

  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ] as const;
  const linear = [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];

  const epsilon = 1e-4;
  if (linear.some((channel) => channel < -epsilon || channel > 1 + epsilon)) {
    throw new Error(`${formatOklch(value)} is outside the sRGB gamut`);
  }

  return (
    '#' +
    linear
      .map((channel) => {
        const byte = Math.round(linearToSrgb(Math.min(1, Math.max(0, channel))) * 255);
        return byte.toString(16).padStart(2, '0');
      })
      .join('')
  );
}

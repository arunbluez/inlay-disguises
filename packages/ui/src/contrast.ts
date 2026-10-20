// WCAG 2 contrast for palette colours, and the text/fill pairs the components actually draw. The
// contrast tests check every pair in every theme, so a token change can't quietly drop below AA.
import type { Palette } from './tokens';

type Rgba = [r: number, g: number, b: number, a: number];

/** Parses `#rrggbb` or `rgba(r,g,b,a)` (the two forms the palettes use). */
function parse(color: string): Rgba {
  if (color.startsWith('#')) {
    return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).concat(1) as Rgba;
  }
  const parts = /^rgba?\(([^)]+)\)$/.exec(color)?.[1]?.split(',').map(Number);
  if (!parts || parts.length < 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unsupported colour "${color}"`);
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
}

/** Lays `layers` over an opaque `base`, bottom first; returns opaque 0-255 channels. */
function flatten(base: string, layers: readonly string[]): [number, number, number] {
  const [r, g, b, a] = parse(base);
  if (a !== 1) throw new Error(`Base colour "${base}" must be opaque`);
  return layers.reduce<[number, number, number]>(
    (under, layer) => {
      const [lr, lg, lb, la] = parse(layer);
      return [
        lr * la + under[0] * (1 - la),
        lg * la + under[1] * (1 - la),
        lb * la + under[2] * (1 - la),
      ];
    },
    [r, g, b],
  );
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * WCAG 2 contrast ratio of `fg` drawn over `bg`. `bg` is an opaque colour, or an opaque colour with
 * translucent layers over it (bottom first); a translucent `fg` is composited over the result.
 */
export function contrastRatio(fg: string, bg: string | readonly [string, ...string[]]): number {
  const [base, ...layers] = typeof bg === 'string' ? [bg] : bg;
  const ground = flatten(base, layers);
  const [hi, lo] = [luminance(flatten(base, [...layers, fg])), luminance(ground)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

type Key = keyof Palette;

export interface ContrastPair {
  fg: Key;
  /** A ground, or a ground with a translucent palette colour over it. */
  bg: Key | readonly [Key, Key];
  /** 4.5 for text; 3 for large text and the edges of controls and state indicators. */
  min: 4.5 | 3;
  /** Where the components draw it. */
  use: string;
}

const text = (fg: Key, bg: ContrastPair['bg'], use: string): ContrastPair => ({
  fg,
  bg,
  min: 4.5,
  use,
});
const ui = (fg: Key, bg: ContrastPair['bg'], use: string): ContrastPair => ({
  fg,
  bg,
  min: 3,
  use,
});

/** Every foreground/background pair the `@inlay/ui` components draw. */
export const contrastPairs: readonly ContrastPair[] = [
  text('ink', 'bg', 'titles, labels, secondary buttons, screen headers'),
  text('ink', 'surface', 'row titles, field text, empty states'),
  text('ink', 'bar', 'sheet titles'),
  text('muted', 'bg', 'helper text, section labels, file row meta on the ground'),
  text('muted', 'surface', 'row values, placeholders, units, file row meta'),
  text('muted', 'bar', 'inactive tabs, sheet notes'),
  text('deep', 'bg', 'text actions, header actions, file row figures on the ground'),
  text('deep', 'surface', 'text actions in cards, file row figures'),
  text('deep', 'bar', 'sheet close action'),
  text('accent', 'bar', 'active tab label'),
  text('on', 'accent', 'primary button, selected segment, action card'),
  text('on', 'deep', 'pressed primary button, pressed action card'),
  text('onDanger', 'danger', 'destructive button'),
  text('onDanger', 'dangerDeep', 'pressed destructive button'),
  text('bg', 'ink', 'toast, selected chip'),
  text('ink', ['bg', 'press'], 'pressed secondary button, chip, segment, back; file tile label'),
  text('deep', ['bg', 'press'], 'pressed text action'),
  text('deep', ['bar', 'press'], 'pressed sheet close action'),
  text('ink', ['surface', 'press'], 'pressed row title, file tile label in cards'),
  text('muted', ['surface', 'press'], 'pressed row value, pressed remove action in cards'),
  ui('accent', 'bg', 'toggle on, slider fill, progress'),
  ui('accent', 'surface', 'toggle on inside a row'),
  ui('accent', 'bar', 'active tab bar'),
  ui('danger', 'bg', 'destructive button edge'),
  ui('danger', 'surface', 'destructive button in a dialog'),
  ui('ink', 'bg', 'focus ring, slider thumb'),
  ui('ink', 'surface', 'focus ring inside cards'),
  ui('ink', 'bar', 'focus ring on tabs and sheets'),
  ui('muted', ['bg', 'press'], 'pressed remove glyph on the ground'),
];

/** The pairs in `palette` that fall below their minimum, with their ratios. */
export function contrastFailures(palette: Palette) {
  return contrastPairs
    .map((pair) => {
      const bg =
        typeof pair.bg === 'string'
          ? palette[pair.bg]
          : ([palette[pair.bg[0]], palette[pair.bg[1]]] as const);
      return { ...pair, ratio: Math.round(contrastRatio(palette[pair.fg], bg) * 100) / 100 };
    })
    .filter((pair) => pair.ratio < pair.min);
}

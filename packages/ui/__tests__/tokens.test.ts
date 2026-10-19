import { oklchSource, oklchToHex, type Oklch } from '../scripts/oklch';
import {
  accents,
  DARK,
  fontFamily,
  LIGHT,
  textStyle,
  themes,
  typeScale,
  type BuiltInThemeId,
  type ColorScheme,
} from '../src';

const ids: BuiltInThemeId[] = ['compress', 'sudoku', 'brief'];
const schemes: ColorScheme[] = ['light', 'dark'];

// WCAG 2 relative luminance and contrast ratio for opaque #rrggbb colours.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('accents', () => {
  it.each(Object.keys(oklchSource) as (keyof typeof oklchSource)[])(
    '%s hex values are the committed conversion of the source OKLCH values',
    (id) => {
      for (const scheme of schemes) {
        for (const role of ['accent', 'deep'] as const) {
          const source: Oklch = oklchSource[id][scheme][role];
          expect({ id, scheme, role, hex: accents[id][scheme][role] }).toEqual({
            id,
            scheme,
            role,
            hex: oklchToHex(source),
          });
        }
      }
    },
  );

  it('rejects an OKLCH colour outside the sRGB gamut instead of clipping it', () => {
    expect(() => oklchToHex([0.7, 0.4, 150])).toThrow('outside the sRGB gamut');
  });
});

describe('themes', () => {
  it.each(ids)('%s puts its own accent on the neutral LIGHT and DARK grounds', (id) => {
    expect(themes[id].light).toEqual({ ...LIGHT, ...accents[id].light });
    expect(themes[id].dark).toEqual({ ...DARK, ...accents[id].dark });
  });

  it.each(schemes)('%s ink reads at AAA contrast (>= 7:1) on bg and surface', (scheme) => {
    const ground = scheme === 'light' ? LIGHT : DARK;
    expect(contrast(ground.ink, ground.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(ground.ink, ground.surface)).toBeGreaterThanOrEqual(7);
  });

  it.each(ids.flatMap((id) => schemes.map((scheme) => [id, scheme] as const)))(
    '%s %s: deep text actions reach AA (>= 4.5:1) on bg; `on` over the accent reaches 3:1',
    (id, scheme) => {
      const palette = themes[id][scheme];
      expect(contrast(palette.deep, palette.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.on, palette.accent)).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('type scale', () => {
  it('resolves a role to its weight family, absolute tracking and line height', () => {
    expect(textStyle('title')).toEqual({
      fontFamily: fontFamily[800],
      fontSize: 32,
      letterSpacing: -0.8,
      lineHeight: 33.6,
    });
    expect(textStyle('body')).toEqual({
      fontFamily: fontFamily[400],
      fontSize: 15,
      lineHeight: 22.5,
    });
    expect(textStyle('label', 11)).toEqual({
      fontFamily: fontFamily[600],
      fontSize: 11,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    });
    expect(textStyle('display', 112).letterSpacing).toBeCloseTo(-4.48);
  });

  it('defaults to the smallest size in each role and only uses loaded weights', () => {
    for (const role of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      expect(textStyle(role).fontSize).toBe(typeScale[role].sizes[0]);
      expect(Object.values(fontFamily)).toContain(textStyle(role).fontFamily);
    }
  });
});

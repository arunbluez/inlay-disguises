import { oklchGrounds, oklchSource, oklchToHex, type Oklch } from '../scripts/oklch';
import {
  accents,
  contrastRatio,
  DARK,
  fontFamily,
  fontStyle,
  LIGHT,
  textStyle,
  themes,
  typeScale,
  type BuiltInThemeId,
  type ColorScheme,
} from '../src';

const ids: BuiltInThemeId[] = ['compress', 'sudoku', 'brief'];
const schemes: ColorScheme[] = ['light', 'dark'];

describe('OKLCH colours', () => {
  it.each(Object.keys(oklchSource) as (keyof typeof oklchSource)[])(
    '%s hex values are the committed conversion of the source OKLCH values',
    (id) => {
      for (const [scheme, roles] of Object.entries(oklchSource[id]) as [
        ColorScheme,
        Partial<Record<'accent' | 'deep', Oklch>>,
      ][]) {
        for (const [role, source] of Object.entries(roles) as ['accent' | 'deep', Oklch][]) {
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

  it('danger colours are the committed conversion of their OKLCH values', () => {
    for (const scheme of schemes) {
      const ground = scheme === 'light' ? LIGHT : DARK;
      for (const role of ['danger', 'dangerDeep'] as const) {
        expect({ scheme, role, hex: ground[role] }).toEqual({
          scheme,
          role,
          hex: oklchToHex(oklchGrounds[scheme][role]),
        });
      }
    }
  });

  it('rejects an OKLCH colour outside the sRGB gamut instead of clipping it', () => {
    expect(() => oklchToHex([0.7, 0.4, 150])).toThrow('outside the sRGB gamut');
  });

  it('keeps danger apart from the Compress red: a different hue, never the accent or deep', () => {
    for (const scheme of schemes) {
      const ground = scheme === 'light' ? LIGHT : DARK;
      const { accent, deep } = accents.compress[scheme];
      expect([accent, deep]).not.toContain(ground.danger);
      expect(oklchGrounds[scheme].danger[2]).toBeLessThan(25);
    }
  });

  it('the source light Compress accent (#ec3013) was below AA for `on` text; the new one is not', () => {
    expect(contrastRatio(LIGHT.on, '#ec3013')).toBeLessThan(4.5);
    expect(contrastRatio(LIGHT.on, accents.compress.light.accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('themes', () => {
  it.each(ids)('%s puts its own accent on the neutral LIGHT and DARK grounds', (id) => {
    expect(themes[id].light).toEqual({ ...LIGHT, ...accents[id].light });
    expect(themes[id].dark).toEqual({ ...DARK, ...accents[id].dark });
  });

  it.each(schemes)('%s ink reads at AAA contrast (>= 7:1) on bg, surface and bar', (scheme) => {
    const ground = scheme === 'light' ? LIGHT : DARK;
    expect(contrastRatio(ground.ink, ground.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(ground.ink, ground.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(ground.ink, ground.bar)).toBeGreaterThanOrEqual(7);
  });

  it('the bar is the surface in light and its own darker step in dark', () => {
    expect(LIGHT.bar).toBe(LIGHT.surface);
    expect(DARK.bar).toBe('#262423');
  });
});

describe('type scale', () => {
  it('resolves a role to its weight family, absolute tracking and a 4-pt line height', () => {
    expect(textStyle('title')).toEqual({
      fontFamily: fontFamily[800],
      fontSize: 32,
      letterSpacing: -0.8,
      lineHeight: 36,
    });
    expect(textStyle('body')).toEqual({
      fontFamily: fontFamily[400],
      fontSize: 15,
      lineHeight: 24,
    });
    expect(textStyle('label', 11)).toEqual({
      fontFamily: fontFamily[600],
      fontSize: 11,
      letterSpacing: 1.1,
      lineHeight: 12,
      textTransform: 'uppercase',
    });
    expect(textStyle('display', 112).letterSpacing).toBeCloseTo(-4.48);
  });

  it('puts every size of every role on the 4-pt grid, never tighter than the size', () => {
    const lines: Record<string, number[]> = {};
    for (const role of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      const [min, max] = typeScale[role].sizes;
      lines[role] = [];
      for (let size = min; size <= max; size++) {
        const { lineHeight } = textStyle(role, size);
        expect(lineHeight % 4).toBe(0);
        expect(lineHeight).toBeGreaterThanOrEqual(size);
        lines[role].push(lineHeight);
      }
    }
    expect(lines).toMatchObject({
      heading: [24, 24, 24, 28, 28],
      action: [20, 20],
      caption: [16, 16],
      label: [12, 12],
    });
  });

  it('defaults to the smallest size in each role and only uses loaded weights', () => {
    for (const role of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      expect(textStyle(role).fontSize).toBe(typeScale[role].sizes[0]);
      expect(Object.values(fontFamily)).toContain(textStyle(role).fontFamily);
    }
  });

  it('falls back to the system font at the same weight when Archivo is not loaded', () => {
    expect(fontStyle(800, false)).toEqual({ fontWeight: '800' });
    expect(fontStyle(800)).toEqual({ fontFamily: fontFamily[800] });
    expect(textStyle('action', 16, false)).toEqual({
      fontWeight: '800',
      fontSize: 16,
      lineHeight: 20,
    });
  });
});

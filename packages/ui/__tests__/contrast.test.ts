import {
  contrastFailures,
  contrastPairs,
  contrastRatio,
  themes,
  type BuiltInThemeId,
  type ColorScheme,
} from '../src';

const cases = (Object.keys(themes) as BuiltInThemeId[]).flatMap((id) =>
  (['light', 'dark'] as ColorScheme[]).map((scheme) => [id, scheme] as const),
);

describe('contrastRatio', () => {
  it('matches the WCAG 2 reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    // #767676 is the classic lightest grey that passes 4.5:1 on white.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('composites translucent foregrounds and ground layers before measuring', () => {
    expect(contrastRatio('rgba(0,0,0,0)', '#ffffff')).toBe(1);
    expect(contrastRatio('rgba(0,0,0,1)', ['#ffffff', 'rgba(0,0,0,0)'])).toBeCloseTo(21, 5);
    expect(contrastRatio('#000000', ['#ffffff', 'rgba(0,0,0,.5)'])).toBeLessThan(21);
  });
});

describe('every text/fill pair the components draw', () => {
  it.each(cases)('%s %s meets AA (4.5:1 text, 3:1 control edges)', (id, scheme) => {
    const failures = contrastFailures(themes[id][scheme]);
    if (failures.length) {
      console.log(`${id} ${scheme} below minimum:\n` + JSON.stringify(failures, null, 2));
    }
    expect(failures).toEqual([]);
  });

  it('covers every palette colour that is drawn as a foreground', () => {
    const foregrounds = new Set(contrastPairs.map((pair) => pair.fg));
    expect([...foregrounds].sort()).toEqual(
      ['accent', 'bg', 'danger', 'deep', 'ink', 'muted', 'on', 'onDanger'].sort(),
    );
  });
});

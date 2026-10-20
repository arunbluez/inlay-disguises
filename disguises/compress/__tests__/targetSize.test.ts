import { base64Bytes, MAX_ENCODES } from '../src/engine/compress';
import { fitToTarget, type Encoder } from '../src/engine/targetSize';

/**
 * A stand-in encoder whose output shrinks with quality and pixel count: `bytesPerQuality` bytes
 * per quality point at full size, times `scale ** areaExponent` (2 when bytes follow the pixel
 * count exactly; real JPEGs shrink a little slower). Records every quality and scale asked for.
 */
function modelEncoder(bytesPerQuality: number, areaExponent = 2) {
  const asked: number[] = [];
  const scales: number[] = [];
  const encode: Encoder = async (quality, scale) => {
    asked.push(quality);
    scales.push(scale);
    const bytes = Math.round(quality * bytesPerQuality * scale ** areaExponent);
    return { uri: `file:///out-${quality}-${scale.toFixed(3)}.jpg`, bytes };
  };
  return { encode, asked, scales };
}

const search = { floor: 10, maxSteps: 7, maxResizes: 3 };

describe('fitToTarget', () => {
  it('encodes once at the chosen quality when there is no target', async () => {
    const { encode, asked } = modelEncoder(1000);
    const fit = await fitToTarget(encode, { quality: 70, ...search });
    console.log('no target →', asked, fit);
    expect(asked).toEqual([70]);
    expect(fit).toEqual({
      uri: 'file:///out-70-1.000.jpg',
      bytes: 70_000,
      quality: 70,
      scale: 1,
      fits: true,
    });
  });

  it('encodes once when the first result already fits the target', async () => {
    const { encode, asked } = modelEncoder(1000);
    const fit = await fitToTarget(encode, { quality: 70, targetBytes: 80_000, ...search });
    expect(asked).toEqual([70]);
    expect(fit).toMatchObject({ quality: 70, scale: 1, fits: true });
  });

  it('finds the highest quality that fits, within the step bound, at full size', async () => {
    const { encode, asked, scales } = modelEncoder(1000);
    const fit = await fitToTarget(encode, { quality: 90, targetBytes: 43_500, ...search });
    console.log('target 43 500 B from q90 → tried', asked, '→', fit);
    expect(fit).toMatchObject({ quality: 43, bytes: 43_000, scale: 1, fits: true });
    expect(asked.length).toBeLessThanOrEqual(1 + 7);
    expect(asked[0]).toBe(90);
    asked.forEach((quality) => expect(quality).toBeGreaterThanOrEqual(10));
    expect(scales.every((scale) => scale === 1)).toBe(true);
  });

  it('stops at the step bound and keeps the best fit so far', async () => {
    const { encode, asked } = modelEncoder(1000);
    const fit = await fitToTarget(encode, {
      ...search,
      quality: 100,
      targetBytes: 43_500,
      maxSteps: 2,
    });
    console.log('maxSteps 2 → tried', asked, '→', fit);
    expect(asked).toHaveLength(3);
    expect(fit?.fits).toBe(true);
    expect(fit!.bytes).toBeLessThanOrEqual(43_500);
  });

  // The emulator report: a 14 MB photo came out at 592 KB with a 300 KB target, because the
  // quality search bottomed out at the floor at full size. Model that photo: 592 KB at q10.
  it('scales the photo down when even the floor quality misses the target (14 MB → 300 KB)', async () => {
    const atFloor = 592 * 1024;
    const target = 300 * 1024;
    const { encode, asked, scales } = modelEncoder(atFloor / 10);
    const fit = await fitToTarget(encode, { quality: 70, targetBytes: target, ...search });
    console.log(
      'target 300 KB, 592 KB at q10 → tried',
      asked.map((q, i) => `q${q}@${scales[i]!.toFixed(3)}`),
      '→',
      fit,
    );
    expect(fit?.fits).toBe(true);
    expect(fit!.bytes).toBeLessThanOrEqual(target);
    expect(fit!.quality).toBe(10);
    expect(fit!.scale).toBeLessThan(1);
    // Not shrunk further than needed: within the 0.9 margin of the target's linear scale.
    expect(fit!.scale).toBeGreaterThan(Math.sqrt(target / atFloor) * 0.85);
    expect(asked.length).toBeLessThanOrEqual(MAX_ENCODES);
  });

  it('keeps scaling down when bytes shrink slower than the pixel count', async () => {
    const { encode, asked, scales } = modelEncoder(60_000, 1.2);
    const fit = await fitToTarget(encode, { quality: 70, targetBytes: 300_000, ...search });
    console.log(
      'slow-shrinking photo → tried',
      asked.map((q, i) => `q${q}@${scales[i]!.toFixed(3)}`),
      '→',
      fit,
    );
    const resizes = scales.filter((scale) => scale < 1);
    expect(resizes.length).toBeGreaterThan(1);
    expect(fit?.fits).toBe(true);
    expect(fit!.bytes).toBeLessThanOrEqual(300_000);
  });

  it('returns the smallest result, unfit, when nothing reaches the target', async () => {
    // A floor under which the encoder cannot go, whatever the quality or size.
    const asked: string[] = [];
    const encode: Encoder = async (quality, scale) => {
      asked.push(`q${quality}@${scale.toFixed(3)}`);
      return { uri: `file:///out-${asked.length}.jpg`, bytes: 20_000 + quality * 1000 * scale };
    };
    const fit = await fitToTarget(encode, { quality: 70, targetBytes: 5_000, ...search });
    console.log('unreachable target → tried', asked, '→', fit);
    expect(fit?.fits).toBe(false);
    expect(fit!.quality).toBe(10);
    expect(fit!.scale).toBeLessThan(1);
    expect(asked.filter((tried) => !tried.endsWith('@1.000'))).toHaveLength(3);
    expect(asked.length).toBeLessThanOrEqual(MAX_ENCODES);
  });

  it('with no quality range (PNG), only scales down', async () => {
    const { encode, asked, scales } = modelEncoder(10_000);
    const fit = await fitToTarget(encode, {
      ...search,
      quality: 70,
      floor: 70,
      targetBytes: 350_000,
    });
    console.log('PNG 700 000 B → 350 000 B → tried', asked, scales, '→', fit);
    expect(asked.every((quality) => quality === 70)).toBe(true);
    expect(scales[0]).toBe(1);
    expect(fit).toMatchObject({ quality: 70, fits: true });
    expect(fit!.bytes).toBeLessThanOrEqual(350_000);
  });

  it('reports each encode and stops with null once cancelled', async () => {
    const { encode, asked } = modelEncoder(1000);
    const encodes: number[] = [];
    let cancelled = false;
    const fit = await fitToTarget(encode, {
      quality: 90,
      targetBytes: 1_000,
      ...search,
      onEncode: (n) => {
        encodes.push(n);
        if (n === 2) cancelled = true;
      },
      isCancelled: () => cancelled,
    });
    expect(fit).toBeNull();
    expect(asked).toHaveLength(2);
    expect(encodes).toEqual([1, 2]);
  });

  it('stops with null when cancelled during the scale-downs', async () => {
    // Shrinks slowly, so a second scale-down would follow the first.
    const { encode, scales } = modelEncoder(60_000, 1.2);
    let cancelled = false;
    const fit = await fitToTarget(encode, {
      quality: 70,
      targetBytes: 300_000,
      ...search,
      onEncode: () => {
        if (scales.at(-1)! < 1) cancelled = true;
      },
      isCancelled: () => cancelled,
    });
    expect(fit).toBeNull();
    expect(scales.filter((scale) => scale < 1)).toHaveLength(1);
  });
});

describe('base64Bytes', () => {
  it('counts the bytes a base64 string encodes, padding included', () => {
    expect(base64Bytes('')).toBe(0);
    expect(base64Bytes('QQ==')).toBe(1);
    expect(base64Bytes('QUI=')).toBe(2);
    expect(base64Bytes('QUJD')).toBe(3);
  });
});

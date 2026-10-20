import { base64Bytes } from '../src/engine/compress';
import { fitToTarget, type Encoder } from '../src/engine/targetSize';

/**
 * A stand-in encoder whose output shrinks with quality: `bytesPerQuality` bytes per quality
 * point. Records every quality it is asked for.
 */
function linearEncoder(bytesPerQuality: number) {
  const asked: number[] = [];
  const encode: Encoder = async (quality) => {
    asked.push(quality);
    return { uri: `file:///out-${quality}.jpg`, bytes: quality * bytesPerQuality };
  };
  return { encode, asked };
}

describe('fitToTarget', () => {
  it('encodes once at the chosen quality when there is no target', async () => {
    const { encode, asked } = linearEncoder(1000);
    const fit = await fitToTarget(encode, { quality: 70, floor: 10, maxSteps: 7 });
    console.log('no target →', asked, fit);
    expect(asked).toEqual([70]);
    expect(fit).toEqual({ uri: 'file:///out-70.jpg', bytes: 70_000, quality: 70, fits: true });
  });

  it('encodes once when the first result already fits the target', async () => {
    const { encode, asked } = linearEncoder(1000);
    const fit = await fitToTarget(encode, {
      quality: 70,
      targetBytes: 80_000,
      floor: 10,
      maxSteps: 7,
    });
    expect(asked).toEqual([70]);
    expect(fit?.quality).toBe(70);
    expect(fit?.fits).toBe(true);
  });

  it('finds the highest quality that fits, within the step bound', async () => {
    const { encode, asked } = linearEncoder(1000);
    const fit = await fitToTarget(encode, {
      quality: 90,
      targetBytes: 43_500,
      floor: 10,
      maxSteps: 7,
    });
    console.log('target 43 500 B from q90 → tried', asked, '→', fit);
    expect(fit).toMatchObject({ quality: 43, bytes: 43_000, fits: true });
    expect(asked.length).toBeLessThanOrEqual(1 + 7);
    expect(asked[0]).toBe(90);
    asked.forEach((quality) => expect(quality).toBeGreaterThanOrEqual(10));
  });

  it('stops at the step bound and keeps the best fit so far', async () => {
    const { encode, asked } = linearEncoder(1000);
    const fit = await fitToTarget(encode, {
      quality: 100,
      targetBytes: 43_500,
      floor: 10,
      maxSteps: 2,
    });
    console.log('maxSteps 2 → tried', asked, '→', fit);
    expect(asked).toHaveLength(3);
    expect(fit?.fits).toBe(true);
    expect(fit!.bytes).toBeLessThanOrEqual(43_500);
  });

  it('returns the smallest result, at the floor, when nothing fits', async () => {
    const { encode, asked } = linearEncoder(1000);
    const fit = await fitToTarget(encode, {
      quality: 70,
      targetBytes: 5_000,
      floor: 10,
      maxSteps: 7,
    });
    console.log('unreachable target → tried', asked, '→', fit);
    expect(fit).toMatchObject({ quality: 10, bytes: 10_000, fits: false });
    expect(asked).toContain(10);
  });

  it('reports each encode and stops with null once cancelled', async () => {
    const { encode, asked } = linearEncoder(1000);
    const encodes: number[] = [];
    let cancelled = false;
    const fit = await fitToTarget(encode, {
      quality: 90,
      targetBytes: 1_000,
      floor: 10,
      maxSteps: 7,
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
});

describe('base64Bytes', () => {
  it('counts the bytes a base64 string encodes, padding included', () => {
    expect(base64Bytes('')).toBe(0);
    expect(base64Bytes('QQ==')).toBe(1);
    expect(base64Bytes('QUI=')).toBe(2);
    expect(base64Bytes('QUJD')).toBe(3);
  });
});

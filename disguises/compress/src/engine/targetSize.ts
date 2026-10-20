/** One encode of a photo: what it produced and how many bytes it takes. */
export interface Encoded {
  uri: string;
  bytes: number;
}

/**
 * Encodes the photo at `quality` (1–100), scaled to `scale` (0–1] of its width and height.
 */
export type Encoder = (quality: number, scale: number) => Promise<Encoded>;

export interface FitOptions {
  /** The quality the user picked: the first try and the upper bound of the search. */
  quality: number;
  /** Stop when the result is at most this many bytes; `undefined` encodes once at `quality`. */
  targetBytes?: number;
  /** Lowest quality the search goes down to. */
  floor: number;
  /** Encodes after the first while searching the quality, at most. */
  maxSteps: number;
  /** Scale-downs after the quality search, at most, when even `floor` misses the target. */
  maxResizes: number;
  /** Called after every encode with the number of encodes so far. */
  onEncode?: (encodes: number) => void;
  /** Checked before every encode; when it returns true the search stops and resolves `null`. */
  isCancelled?: () => boolean;
}

export interface Fit extends Encoded {
  quality: number;
  /** Fraction of the photo's width and height kept: 1 unless it had to be scaled down. */
  scale: number;
  /** Whether the result is at most `targetBytes` (always true without a target). */
  fits: boolean;
}

/**
 * Each scale-down aims this far under the target: bytes only roughly follow the pixel count, so
 * aiming at the target itself would often land just over it.
 */
const RESIZE_MARGIN = 0.9;

/**
 * Encodes at `quality`; with a target that result exceeds, binary-searches the integer quality in
 * [`floor`, `quality`) for the highest one that fits, in at most `maxSteps` more encodes. When
 * even `floor` is too big, scales the photo down at that quality (the area by target ÷ bytes,
 * less a margin) until it fits, in at most `maxResizes` more encodes. When nothing fits, returns
 * the smallest result tried.
 */
export async function fitToTarget(encode: Encoder, options: FitOptions): Promise<Fit | null> {
  const { quality, targetBytes, floor, maxSteps, maxResizes, onEncode, isCancelled } = options;
  let encodes = 0;
  const attempt = async (q: number, scale: number): Promise<Fit | null> => {
    if (isCancelled?.()) return null;
    const result = await encode(q, scale);
    encodes += 1;
    onEncode?.(encodes);
    return {
      ...result,
      quality: q,
      scale,
      fits: targetBytes === undefined || result.bytes <= targetBytes,
    };
  };

  const first = await attempt(quality, 1);
  if (!first || first.fits || targetBytes === undefined) return first;

  let best: Fit | null = null;
  let smallest = first;
  let low = floor;
  let high = quality - 1;
  for (let step = 0; step < maxSteps && low <= high; step++) {
    const mid = Math.ceil((low + high) / 2);
    const tried = await attempt(mid, 1);
    if (!tried) return null;
    if (tried.bytes < smallest.bytes) smallest = tried;
    if (tried.fits) {
      best = tried;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best) return best;

  // Each scale-down starts from the last one, so a result that didn't shrink still goes smaller.
  let last = smallest;
  for (let resize = 0; resize < maxResizes && !smallest.fits; resize++) {
    const scale = last.scale * Math.sqrt(targetBytes / last.bytes) * RESIZE_MARGIN;
    const tried = await attempt(last.quality, scale);
    if (!tried) return null;
    last = tried;
    if (tried.bytes < smallest.bytes) smallest = tried;
  }
  return smallest;
}

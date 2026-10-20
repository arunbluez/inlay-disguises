/** One encode of a photo: what it produced and how many bytes it takes. */
export interface Encoded {
  uri: string;
  bytes: number;
}

/** Encodes the photo at `quality` (1–100). */
export type Encoder = (quality: number) => Promise<Encoded>;

export interface FitOptions {
  /** The quality the user picked: the first try and the upper bound of the search. */
  quality: number;
  /** Stop when the result is at most this many bytes; `undefined` encodes once at `quality`. */
  targetBytes?: number;
  /** Lowest quality the search goes down to. */
  floor: number;
  /** Encodes after the first, at most. */
  maxSteps: number;
  /** Called after every encode with the number of encodes so far. */
  onEncode?: (encodes: number) => void;
  /** Checked before every encode; when it returns true the search stops and resolves `null`. */
  isCancelled?: () => boolean;
}

export interface Fit extends Encoded {
  quality: number;
  /** Whether the result is at most `targetBytes` (always true without a target). */
  fits: boolean;
}

/**
 * Encodes at `quality`; with a target that result exceeds, binary-searches the integer quality in
 * [`floor`, `quality`) for the highest one that fits, in at most `maxSteps` more encodes. When
 * nothing fits, returns the smallest result tried (the one at the lowest quality).
 */
export async function fitToTarget(encode: Encoder, options: FitOptions): Promise<Fit | null> {
  const { quality, targetBytes, floor, maxSteps, onEncode, isCancelled } = options;
  let encodes = 0;
  const attempt = async (q: number): Promise<Fit | null> => {
    if (isCancelled?.()) return null;
    const result = await encode(q);
    encodes += 1;
    onEncode?.(encodes);
    return {
      ...result,
      quality: q,
      fits: targetBytes === undefined || result.bytes <= targetBytes,
    };
  };

  const first = await attempt(quality);
  if (!first || first.fits) return first;

  let best: Fit | null = null;
  let smallest = first;
  let low = floor;
  let high = quality - 1;
  for (let step = 0; step < maxSteps && low <= high; step++) {
    const mid = Math.ceil((low + high) / 2);
    const tried = await attempt(mid);
    if (!tried) return null;
    if (tried.bytes < smallest.bytes) smallest = tried;
    if (tried.fits) {
      best = tried;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best ?? smallest;
}

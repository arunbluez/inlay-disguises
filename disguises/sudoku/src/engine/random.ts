// Seeded randomness for the generator: the same seed gives the same sequence on every device.

/** A source of floats in [0, 1). */
export type Random = () => number;

/** Spreads a puzzle number over 32 bits, so neighbouring numbers start far apart. */
export function seedFor(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** mulberry32: a small, fast 32-bit generator. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffles `items` in place (Fisher–Yates) and returns it. */
export function shuffle<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const item = items[i]!;
    items[i] = items[j]!;
    items[j] = item;
  }
  return items;
}

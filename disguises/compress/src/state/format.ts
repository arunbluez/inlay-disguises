import { strings } from '../strings';

const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

/** "820 KB", "4.2 MB", "61 MB", "1.2 GB": one decimal below 10, whole numbers above. */
export function formatBytes(bytes: number): string {
  const [value, unit] =
    bytes >= GB
      ? [bytes / GB, 'GB']
      : bytes >= MB
        ? [bytes / MB, 'MB']
        : [Math.max(0, bytes) / KB, 'KB'];
  const shown = unit !== 'KB' && value < 10 ? value.toFixed(1) : String(Math.round(value));
  return `${shown} ${unit}`;
}

/** "−72%" for a saving; "+5%" when the result is larger; "0%" with nothing to compare. */
export function formatSaving(before: number, after: number): string {
  if (before <= 0) return '0%';
  const pct = Math.round((1 - after / before) * 100);
  return pct > 0 ? `−${pct}%` : pct < 0 ? `+${-pct}%` : '0%';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Yesterday", a weekday within the last week, else "9 Oct". */
export function formatDay(at: number, now: number = Date.now()): string {
  const day = new Date(at);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const daysAgo = Math.ceil((midnight.getTime() - day.getTime()) / 86_400_000);
  if (daysAgo <= 0) return strings.history.today;
  if (daysAgo === 1) return strings.history.yesterday;
  if (daysAgo < 7) return WEEKDAYS[day.getDay()]!;
  return `${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

/** KB typed in the Target size field → bytes; `undefined` when empty or zero. */
export function targetBytes(targetSize: string): number | undefined {
  const kb = Number(targetSize);
  return targetSize !== '' && kb > 0 ? kb * KB : undefined;
}

/**
 * The Estimated figure before compressing: about 12% of the original plus half the quality
 * fraction, capped by the target size (the UI Source's estimate).
 */
export function estimateBytes(sizes: readonly number[], quality: number, target?: number): number {
  return sizes.reduce((sum, bytes) => {
    const guess = bytes * (0.12 + (0.5 * quality) / 100);
    return sum + (target === undefined ? guess : Math.min(guess, target));
  }, 0);
}

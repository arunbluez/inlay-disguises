// Clock arithmetic for Dial, plain TypeScript with no React. A time of day is a whole number of
// minutes since midnight, 0 to 1439; angles are degrees clockwise from 12 o'clock.

export const MINUTES_PER_DAY = 24 * 60;
const HALF_DAY = 12 * 60;

/** Inside this share of the radius a drag turns the hour hand; outside it, the minute hand. */
export const HOUR_RING = 0.55;

/** Where set mode starts: 12:00, both hands up. */
export const SET_START = HALF_DAY;

export type Ring = 'hour' | 'minute';

export interface HandAngles {
  hour: number;
  minute: number;
  second: number;
}

/** `n` mod `m`, always in [0, m). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Hand angles for a time of day. The minute hand carries the seconds' fraction and the hour hand
 * the minutes' fraction, the way a real movement does: at 3:30 the hour hand sits half way from 3
 * to 4.
 */
export function timeToAngles(minutesOfDay: number, seconds = 0): HandAngles {
  const minutes = mod(minutesOfDay, MINUTES_PER_DAY);
  const h = Math.floor(minutes / 60) % 12;
  const m = minutes % 60;
  return {
    hour: h * 30 + m * 0.5 + seconds / 120,
    minute: m * 6 + seconds * 0.1,
    second: seconds * 6,
  };
}

/** The angle of the point (`dx`, `dy`) from the centre, with y pointing down as on screen. */
export function pointToAngle(dx: number, dy: number): number {
  return mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360);
}

/** Which hand a touch at `distance` from the centre of a dial of `radius` turns. */
export function ringAt(distance: number, radius: number): Ring {
  return distance <= radius * HOUR_RING ? 'hour' : 'minute';
}

/**
 * The time after a hand is turned to `angle`.
 *
 * - `minute`: snaps to the nearest of 60 positions and keeps the hour. With `carry` (a finger
 *   still moving), passing 12 turns the hour on or back, like the crown of a watch: from :50 to
 *   :05 is the next hour.
 * - `hour`: snaps to the nearest of 12 positions and keeps the minutes and the half of the day.
 */
export function angleToTime(angle: number, ring: Ring, current: number, carry = false): number {
  const now = mod(current, MINUTES_PER_DAY);
  const a = mod(angle, 360);
  if (ring === 'hour') {
    const position = Math.round(a / 30) % 12;
    const half = Math.floor(now / HALF_DAY);
    return half * HALF_DAY + position * 60 + (now % 60);
  }
  const minute = Math.round(a / 6) % 60;
  const before = now % 60;
  let hourStart = now - before;
  if (carry && before >= 45 && minute < 15) hourStart += 60;
  if (carry && before < 15 && minute >= 45) hourStart -= 60;
  return mod(hourStart + minute, MINUTES_PER_DAY);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `H:MM` (1 to 12, no AM or PM) or, with `twentyFourHour`, `HH:MM` (00 to 23). */
export function formatTime(minutesOfDay: number, twentyFourHour: boolean): string {
  const minutes = mod(minutesOfDay, MINUTES_PER_DAY);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return twentyFourHour ? `${pad2(h)}:${pad2(m)}` : `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)}`;
}

/** Where the hour hand points, 0 (12) to 11, ignoring the minutes. */
export function hourPosition(minutesOfDay: number): number {
  return Math.floor(mod(minutesOfDay, MINUTES_PER_DAY) / 60) % 12;
}

/** The digit the hour hand points at: 1 to 9 on those numerals, 0 on 12; 10 and 11 give none. */
export function hourDigit(minutesOfDay: number): string | null {
  const position = hourPosition(minutesOfDay);
  return position <= 9 ? String(position) : null;
}

/** Minutes since midnight of `date`, local time. */
export function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * The offset from now to a time set on the dial. On a 24-hour readout the offset runs forward,
 * 0 to 1439. On a 12-hour readout the half of the day isn't shown, so the nearer one is taken:
 * -720 to 719.
 */
export function offsetTo(set: number, now: number, twentyFourHour: boolean): number {
  const forward = mod(set - now, MINUTES_PER_DAY);
  if (twentyFourHour) return forward;
  const ahead = mod(forward, HALF_DAY);
  return ahead >= HALF_DAY / 2 ? ahead - HALF_DAY : ahead;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Monday 2 November". */
export function longDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** The numeral at hour position `i` (0 is the top). */
export function numeral(i: number, roman: boolean): string {
  return roman ? ROMAN[i % 12]! : String(i % 12 === 0 ? 12 : i % 12);
}

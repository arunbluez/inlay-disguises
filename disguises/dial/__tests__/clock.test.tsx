// The clock arithmetic and the one-second timer.
import { act, render } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { useNow } from '../src/state/now';
import {
  angleToTime,
  formatTime,
  longDate,
  offsetTo,
  pointToAngle,
  readoutDigits,
  ringAt,
  timeToAngles,
} from '../src/time';

/** "h:mm" → minutes since midnight. */
const t = (text: string) => {
  const [h, m] = text.split(':').map(Number);
  return h! * 60 + m!;
};

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('timeToAngles', () => {
  it.each([
    ['0:00', 0, { hour: 0, minute: 0, second: 0 }],
    ['12:00', 0, { hour: 0, minute: 0, second: 0 }],
    ['3:00', 0, { hour: 90, minute: 0, second: 0 }],
    // At 3:30 the hour hand is half way from 3 to 4.
    ['3:30', 0, { hour: 105, minute: 180, second: 0 }],
    ['15:30', 0, { hour: 105, minute: 180, second: 0 }],
    ['7:45', 0, { hour: 232.5, minute: 270, second: 0 }],
    ['10:08', 0, { hour: 304, minute: 48, second: 0 }],
    // Seconds move the minute hand a tenth of a degree each, the seconds hand six.
    ['10:10', 30, { hour: 305.25, minute: 63, second: 180 }],
    ['23:59', 59, { hour: 359.991666, minute: 359.9, second: 354 }],
  ])('%s and %ss', (time, seconds, expected) => {
    const angles = timeToAngles(t(time), seconds);
    expect(angles.hour).toBeCloseTo(expected.hour, 4);
    expect(angles.minute).toBeCloseTo(expected.minute, 4);
    expect(angles.second).toBeCloseTo(expected.second, 4);
  });
});

describe('angleToTime', () => {
  it.each([
    // Minute ring: snaps to 60 positions and keeps the hour.
    [270, 'minute', '12:00', false, '12:45'],
    [272.9, 'minute', '19:00', false, '19:45'],
    [273.1, 'minute', '19:00', false, '19:46'],
    [30, 'minute', '19:10', false, '19:05'],
    [359, 'minute', '7:30', false, '7:00'],
    [-90, 'minute', '7:00', false, '7:45'],
    // Without carry a touch down never changes the hour.
    [30, 'minute', '7:55', false, '7:05'],
    [330, 'minute', '7:05', false, '7:55'],
    // With carry (a moving finger), passing 12 turns the hour on or back.
    [30, 'minute', '7:55', true, '8:05'],
    [330, 'minute', '7:05', true, '6:55'],
    [6, 'minute', '23:58', true, '0:01'],
    [354, 'minute', '0:02', true, '23:59'],
    [90, 'minute', '7:30', true, '7:15'],
    // Hour ring: snaps to 12 positions, keeps the minutes and the half of the day.
    [210, 'hour', '12:00', false, '19:00'],
    [210, 'hour', '0:45', false, '7:45'],
    [224, 'hour', '12:45', false, '19:45'],
    [226, 'hour', '12:45', false, '20:45'],
    [0, 'hour', '19:05', false, '12:05'],
    [359, 'hour', '7:05', false, '0:05'],
    [90, 'hour', '7:20', true, '3:20'],
  ] as const)('%s° on the %s ring from %s (carry %s) is %s', (angle, ring, from, carry, to) => {
    expect(angleToTime(angle, ring, t(from), carry)).toBe(t(to));
  });
});

describe('pointToAngle and ringAt', () => {
  it.each([
    [0, -10, 0],
    [10, 0, 90],
    [0, 10, 180],
    [-10, 0, 270],
    [10, -10, 45],
  ])('(%s, %s) is %s°', (dx, dy, angle) => {
    expect(pointToAngle(dx, dy)).toBeCloseTo(angle, 6);
  });

  it('the inner 55% of the radius turns the hour hand', () => {
    expect(ringAt(50, 100)).toBe('hour');
    expect(ringAt(55, 100)).toBe('hour');
    expect(ringAt(56, 100)).toBe('minute');
    expect(ringAt(120, 100)).toBe('minute');
  });
});

describe('readout', () => {
  it.each([
    ['7:45', false, '7:45', '0745'],
    ['19:45', false, '7:45', '0745'],
    ['12:00', false, '12:00', '1200'],
    ['0:00', false, '12:00', '1200'],
    ['7:05', false, '7:05', '0705'],
    ['19:05', true, '19:05', '1905'],
    ['0:00', true, '00:00', '0000'],
    ['7:05', true, '07:05', '0705'],
    ['12:00', true, '12:00', '1200'],
  ] as const)('%s (24-hour %s) reads %s, code %s', (time, h24, text, code) => {
    expect(formatTime(t(time), h24)).toBe(text);
    expect(readoutDigits(t(time), h24)).toBe(code);
    expect(code).toMatch(/^\d{4}$/);
  });

  it('dates read in words', () => {
    expect(longDate(new Date(2026, 10, 2))).toBe('Monday 2 November');
  });
});

describe('offsetTo', () => {
  it.each([
    // 12-hour: the nearer half of the day.
    ['19:45', '10:10', false, -145],
    ['7:45', '10:10', false, -145],
    ['16:10', '10:10', false, -360],
    ['16:09', '10:10', false, 359],
    // 24-hour: forward, 0 to 1439.
    ['19:45', '10:10', true, 575],
    ['7:45', '10:10', true, 1295],
    ['10:10', '10:10', true, 0],
  ] as const)('%s from %s (24-hour %s) is %s min', (set, now, h24, offset) => {
    expect(offsetTo(t(set), t(now), h24)).toBe(offset);
  });
});

describe('useNow', () => {
  function Probe() {
    const now = useNow();
    return <Text testID="now">{now.toISOString()}</Text>;
  }

  it('the second-hand interval is cleared on unmount', async () => {
    jest.useFakeTimers({ now: new Date(2026, 2, 14, 10, 10, 0, 400) });
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');

    const screen = await render(<Probe />);
    // The first step lands on the next whole second, then one step a second.
    await act(async () => jest.advanceTimersByTime(600));
    expect(screen.getByTestId('now')).toHaveTextContent(
      new Date(2026, 2, 14, 10, 10, 1).toISOString(),
    );
    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.getByTestId('now')).toHaveTextContent(
      new Date(2026, 2, 14, 10, 10, 2).toISOString(),
    );
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const id = setIntervalSpy.mock.results[0]!.value;

    await act(async () => screen.unmount());
    expect(clearIntervalSpy).toHaveBeenCalledWith(id);
    // Nothing ticks any more.
    const calls = setIntervalSpy.mock.calls.length;
    await act(async () => jest.advanceTimersByTime(5000));
    expect(setIntervalSpy).toHaveBeenCalledTimes(calls);
  });

  it('stops in the background and reads the clock again on return', async () => {
    jest.useFakeTimers({ now: new Date(2026, 2, 14, 10, 10, 0) });
    let listener: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const screen = await render(<Probe />);
    await act(async () => jest.advanceTimersByTime(1000));
    const id = setIntervalSpy.mock.results[0]!.value;

    await act(async () => listener!('background'));
    expect(clearIntervalSpy).toHaveBeenCalledWith(id);
    const before = String(screen.getByTestId('now').props.children);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(screen.getByTestId('now')).toHaveTextContent(before);

    jest.setSystemTime(new Date(2026, 2, 14, 11, 0, 0));
    await act(async () => listener!('active'));
    expect(screen.getByTestId('now')).not.toHaveTextContent(before);
    expect(screen.getByTestId('now')).toHaveTextContent(
      new Date(2026, 2, 14, 11, 0, 0).toISOString(),
    );
    await act(async () => screen.unmount());
  });
});

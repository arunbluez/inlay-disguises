// The Sudoku trigger under the testkit's MockHost: type a number on Play puzzle #, hold Play.
// Nothing is replaced: the engine, the SDK, storage and every screen are real. The hold is Gesture
// Handler's native long press, so these tests drive its states the way the native recognizer
// reports them (BEGAN on touch down, ACTIVE once held for 600 ms, END on release, FAILED when a
// tap lifts early).
import { renderDisguise } from '@inlay/testkit';
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import sudoku from '../src';
import { MAX_PUZZLE } from '../src/engine/generator';
import { GAME_KEY } from '../src/state/storage';
import { PUZZLE_NUMBER_MAX_DIGITS } from '../src/state/store';

const CODE = '246810';

async function press(testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

/** Today → the "Play puzzle #" row → Play puzzle #. */
async function openPlayNumber() {
  await press('sudoku-play-number-row');
  expect(screen.getByTestId('sudoku-play-number')).toBeOnTheScreen();
}

async function typeNumber(text: string) {
  await fireEvent.changeText(screen.getByTestId('sudoku-puzzle-number'), text);
}

/**
 * Play's native long press. Bound to the gesture object itself, so it can still deliver a release
 * after Play puzzle # has gone (the last callbacks the screen rendered).
 */
const holdGesture = () =>
  createGestureController(getByGestureTestId('sudoku-play-number-play-hold'));

/** Touch down, held to the threshold (`onHold`), then released (`onHoldEnd`). */
async function holdAndRelease() {
  const hold = holdGesture();
  await act(() => hold.begin());
  await act(() => hold.activate());
  await act(async () => hold.end());
}

/** A tap: the long press begins on touch down and fails when the finger lifts early. */
async function tap() {
  const hold = holdGesture();
  await act(() => hold.begin());
  await act(() => hold.fail());
  await press('sudoku-play-number-play');
}

/** The board's puzzle number once its puzzle is built ("#246,810"). */
async function boardNumber(): Promise<string> {
  await screen.findByTestId('sudoku-grid');
  return String(screen.getByTestId('sudoku-board-number').props.children);
}

afterEach(() => {
  jest.useRealTimers();
});

describe('Sudoku trigger', () => {
  it('is a 600 ms native long press on Play', async () => {
    await renderDisguise(sudoku);
    await openPlayNumber();
    const { config } = getByGestureTestId('sudoku-play-number-play-hold') as unknown as {
      config: Record<string, unknown>;
    };
    console.log('hold gesture config', config);
    expect(config).toMatchObject({ minDurationMs: 600 });
  });

  it('hold with a typed number submits it once, at the hold mark; the release opens the puzzle', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber(CODE);

    const hold = holdGesture();
    await act(() => hold.begin());
    expect(host.submittedCodes).toEqual([]);
    await act(() => hold.activate());
    console.log('submitted at the hold mark', host.submittedCodes);
    expect(host.submittedCodes).toEqual([CODE]);
    // Nothing visible happens at the hold mark: still Play puzzle #.
    expect(screen.getByTestId('sudoku-play-number')).toBeOnTheScreen();

    await act(async () => hold.end());
    const number = await boardNumber();
    console.log('board after the release', number);
    expect(number).toBe('#246,810');
    expect(host.submittedCodes).toEqual([CODE]);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent(`Last code: ${CODE}`);
  });

  it('submits the number exactly as typed; the puzzle drops the leading zeros', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber('0042');
    await holdAndRelease();
    expect(host.submittedCodes).toEqual(['0042']);
    expect(await boardNumber()).toBe('#42');
  });

  it('a tap opens the puzzle and submits nothing', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber(CODE);
    await tap();
    console.log('tap → submitted', host.submittedCodes);
    expect(host.submittedCodes).toEqual([]);
    expect(await boardNumber()).toBe('#246,810');
  });

  it('with an empty field Play is disabled and a hold submits nothing', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    expect(screen.getByTestId('sudoku-play-number-play')).toBeDisabled();
    const { config } = getByGestureTestId('sudoku-play-number-play-hold') as unknown as {
      config: Record<string, unknown>;
    };
    expect(config).toMatchObject({ enabled: false });
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([]);
    expect(screen.getByTestId('sudoku-play-number')).toBeOnTheScreen();
  });

  it('a wrong code is recorded and its puzzle loads, like any other number', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber('1234');
    await holdAndRelease();
    // MockHost never accepts: the disguise learns nothing and plays puzzle #1234.
    expect(host.submittedCodes).toEqual(['1234']);
    expect(await boardNumber()).toBe('#1,234');
  });

  it('host reset returns to Today; Play puzzle # opens with an empty field', async () => {
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber(CODE);

    await act(async () => host.reset());
    expect(screen.getByTestId('sudoku-today')).toBeOnTheScreen();

    await openPlayNumber();
    expect(screen.getByTestId('sudoku-puzzle-number')).toHaveDisplayValue('');
  });

  it('hold, reset before release, release: no puzzle opens', async () => {
    jest.useFakeTimers();
    const { host } = await renderDisguise(sudoku);
    await openPlayNumber();
    await typeNumber(CODE);

    const hold = holdGesture();
    await act(() => hold.begin());
    await act(() => hold.activate());
    expect(host.submittedCodes).toEqual([CODE]);

    // What the host does when it accepts the code.
    await act(async () => host.reset());
    await act(async () => hold.end());
    await act(async () => jest.runOnlyPendingTimers());

    expect(screen.getByTestId('sudoku-today')).toBeOnTheScreen();
    expect(screen.queryByTestId('sudoku-board-number')).toBeNull();
    // The puzzle never opened, so it never became the game in progress.
    const stored = host.storage.entries.get(GAME_KEY);
    console.log('stored game after reset + release', stored ?? 'none');
    expect(stored ?? '').not.toContain('246810');
  });

  it('takes up to 9 digits and drops anything else', async () => {
    await renderDisguise(sudoku);
    await openPlayNumber();
    expect(PUZZLE_NUMBER_MAX_DIGITS).toBe(String(MAX_PUZZLE).length);
    expect(PUZZLE_NUMBER_MAX_DIGITS).toBe(9);
    await typeNumber('12a34');
    expect(screen.getByTestId('sudoku-puzzle-number')).toHaveDisplayValue('1234');
  });

  it('logs nothing it submits', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(console, level),
    );
    try {
      await renderDisguise(sudoku);
      await openPlayNumber();
      await typeNumber('97531');
      await holdAndRelease();
      await boardNumber();
      const printed = spies.flatMap((spy) => spy.mock.calls.flat().map(String));
      expect(printed.filter((line) => line.includes('97531'))).toEqual([]);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

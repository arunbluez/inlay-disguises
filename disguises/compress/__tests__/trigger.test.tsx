// The Compress trigger under the testkit's MockHost: type a number into Target size, hold Compress.
// Only the third-party native modules are replaced (the photo picker and the image encoder); the
// SDK, the hold gesture's JS side, storage and every screen are real. The hold is Gesture
// Handler's native long press, so these tests drive its states the way the native recognizer
// reports them (BEGAN on touch down, ACTIVE once held for 600 ms, END on release, FAILED when a
// tap lifts early).
import { renderDisguise } from '@inlay/testkit';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { launchImageLibraryAsync, type ImagePickerResult } from 'expo-image-picker';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import compress from '../src';
import { TARGET_SIZE_MAX_DIGITS } from '../src/state/store';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

// Jest only lets a mock factory read variables named `mock…`.
/** Every photo the encoder was asked to decode, in order: one per photo a run compresses. */
const mockDecoded: string[] = [];

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: (uri: string) => {
      mockDecoded.push(uri);
      return {
        renderAsync: async () => ({
          width: 4000,
          height: 3000,
          // 3 bytes out, whatever the quality.
          saveAsync: async () => ({
            uri: 'file:///cache/ImageManipulator/out.jpg',
            width: 4000,
            height: 3000,
            base64: 'AAAA',
          }),
          release: () => undefined,
        }),
        release: () => undefined,
      };
    },
  },
}));

const pick = launchImageLibraryAsync as jest.MockedFunction<typeof launchImageLibraryAsync>;

function picked(...names: string[]): ImagePickerResult {
  return {
    canceled: false,
    assets: names.map((name) => ({
      uri: `file:///cache/ImagePicker/${name}`,
      fileName: name,
      fileSize: 300_000,
      width: 4000,
      height: 3000,
      type: 'image',
    })),
  };
}

const CODE = '246810';

beforeEach(() => {
  jest.useFakeTimers();
  mockDecoded.length = 0;
  pick.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Home → Compress now → Setup, then the picker with `names` picked; with none, no files. */
async function openSetup(...names: string[]) {
  await fireEvent.press(screen.getByTestId('compress-now'));
  if (names.length > 0) {
    pick.mockResolvedValueOnce(picked(...names));
    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-add-files'));
    });
  }
  expect(screen.getByTestId('compress-setup')).toBeOnTheScreen();
}

async function typeTarget(text: string) {
  await fireEvent.changeText(screen.getByTestId('compress-target-size'), text);
}

/**
 * The Compress button's native long press. Bound to the gesture object itself, so it can still
 * deliver a release after Setup has gone (the last callbacks Setup rendered).
 */
const holdGesture = () => createGestureController(getByGestureTestId('compress-run-hold'));

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
  await act(async () => {
    await fireEvent.press(screen.getByTestId('compress-run'));
  });
}

const toastText = () => screen.queryByTestId('compress-toast');

describe('Compress trigger', () => {
  it('is a 600 ms native long press on the Compress button', async () => {
    await renderDisguise(compress);
    await openSetup();
    const { config } = getByGestureTestId('compress-run-hold') as unknown as {
      config: Record<string, unknown>;
    };
    console.log('hold gesture config', config);
    expect(config).toMatchObject({ minDurationMs: 600, enabled: true });
  });

  it('(a) hold with a typed number submits it once, at the hold mark, not on release', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup('a.jpg');
    await typeTarget(CODE);

    const hold = holdGesture();
    await act(() => hold.begin());
    expect(host.submittedCodes).toEqual([]);
    await act(() => hold.activate());
    console.log('submitted at the hold mark', host.submittedCodes);
    expect(host.submittedCodes).toEqual([CODE]);
    // Nothing visible happens at the hold mark: still Setup, same label, no toast.
    expect(screen.getByTestId('compress-setup')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Compress 1 file' })).toBeOnTheScreen();
    expect(toastText()).toBeNull();

    await act(async () => hold.end());
    expect(host.submittedCodes).toEqual([CODE]);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent(`Last code: ${CODE}`);
  });

  it('passes the value exactly as typed, leading zeros included', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup();
    await typeTarget('0042');
    await holdAndRelease();
    expect(host.submittedCodes).toEqual(['0042']);
  });

  it('(b) a tap compresses as normal and submits nothing', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup('a.jpg');
    await typeTarget(CODE);
    await tap();
    console.log('tap → submitted', host.submittedCodes, 'decoded', mockDecoded);
    expect(host.submittedCodes).toEqual([]);
    expect(mockDecoded).toEqual(['file:///cache/ImagePicker/a.jpg']);
    expect(screen.getByTestId('compress-result')).toBeOnTheScreen();
  });

  it('(c) hold with an empty field submits nothing; the release does the normal action', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup();
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([]);
    expect(toastText()).toHaveTextContent('Add files to compress');
    expect(mockDecoded).toEqual([]);
  });

  it('a wrong-looking code without photos: the release shows the normal toast', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup();
    await typeTarget('482916');
    await holdAndRelease();
    // MockHost never accepts: like any wrong code, Compress does its normal thing.
    expect(host.submittedCodes).toEqual(['482916']);
    expect(toastText()).toHaveTextContent('Add files to compress');
    expect(screen.getByTestId('compress-setup')).toBeOnTheScreen();
  });

  it('(d) host reset returns to Home with an empty Target size', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup('a.jpg');
    await typeTarget(CODE);

    await act(async () => host.reset());
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();

    await openSetup('b.jpg');
    expect(screen.getByText('Files · 1')).toBeOnTheScreen();
    expect(screen.getByTestId('compress-target-size')).toHaveDisplayValue('');
  });

  it('(e) hold, reset before release, release: no compression, no toast', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup('a.jpg');
    await typeTarget(CODE);

    const hold = holdGesture();
    await act(() => hold.begin());
    await act(() => hold.activate());
    expect(host.submittedCodes).toEqual([CODE]);

    // What the host does when it accepts the code.
    await act(async () => host.reset());
    await act(async () => hold.end());
    await act(async () => jest.runOnlyPendingTimers());

    console.log('after reset + release → decoded', mockDecoded, 'toast', toastText()?.props);
    expect(mockDecoded).toEqual([]);
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();
    expect(screen.queryByTestId('compress-progress')).toBeNull();
    expect(screen.queryByText('Add files to compress')).toBeNull();
  });

  it('(f) a wrong-looking code with photos compresses on release exactly as a tap does', async () => {
    const { host } = await renderDisguise(compress);
    await openSetup('a.jpg', 'b.jpg');
    await typeTarget('482916');
    await tap();
    const byTap = [...mockDecoded];
    const tapResult = screen.getByTestId('compress-result');
    expect(tapResult).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('compress-done'));

    mockDecoded.length = 0;
    await openSetup('a.jpg', 'b.jpg');
    await typeTarget('482916');
    await holdAndRelease();
    console.log('tap decoded', byTap, '| hold decoded', mockDecoded);
    expect(host.submittedCodes).toEqual(['482916']);
    expect(mockDecoded).toEqual(byTap);
    expect(screen.getByTestId('compress-result')).toBeOnTheScreen();
    expect(screen.getByText(/^2 files are/)).toBeOnTheScreen();

    // The typed value is in neither storage nor history.
    const stored = [...host.storage.entries].map(([key, value]) => `${key}=${value}`);
    console.log('storage after two runs', stored);
    expect(stored.length).toBeGreaterThan(0);
    stored.forEach((entry) => expect(entry).not.toContain('482916'));
  });

  it('(g) typing 9 digits leaves 8; non-digits are dropped', async () => {
    await renderDisguise(compress);
    await openSetup();
    expect(TARGET_SIZE_MAX_DIGITS).toBe(8);
    await typeTarget('123456789');
    expect(screen.getByTestId('compress-target-size')).toHaveDisplayValue('12345678');
    await typeTarget('12a34');
    expect(screen.getByTestId('compress-target-size')).toHaveDisplayValue('1234');
  });

  it('logs nothing it submits', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(console, level),
    );
    try {
      await renderDisguise(compress);
      await openSetup('a.jpg');
      await typeTarget('97531');
      await holdAndRelease();
      const printed = spies.flatMap((spy) => spy.mock.calls.flat().map(String));
      expect(printed.filter((line) => line.includes('97531'))).toEqual([]);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

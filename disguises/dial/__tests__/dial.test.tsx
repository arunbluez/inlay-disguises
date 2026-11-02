// Dial under the testkit's MockHost. Nothing is replaced: the SDK, storage, the dial and every
// screen are real. The hold is Gesture Handler's native long press on the centre; drags are the
// responder events the dial's drag surface receives, at points computed from the dial's size.
import { createMockHost, MockHost, renderDisguise } from '@inlay/testkit';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import sdkPackage from '@inlay/disguise-sdk/package.json';
import manifest from '../src';
import { HOUR_RING } from '../src/time';

/** 10:10:00 on a Saturday. */
const START = new Date(2026, 2, 14, 10, 10, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: START });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function press(testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The centre's native long press, bound to the gesture itself. */
const centreHold = () => createGestureController(getByGestureTestId('dial-centre-hold'));

/** Touch down on the centre and hold past 600 ms; returns the release. */
async function holdCentre() {
  const hold = centreHold();
  await act(() => hold.begin());
  await act(() => hold.activate());
  return { release: () => act(async () => hold.end()) };
}

/** A tap: the long press begins and fails as the finger lifts early; the Pressable fires. */
async function tapCentre() {
  const hold = centreHold();
  await act(() => hold.begin());
  await act(() => hold.fail());
  await press('dial-centre');
}

/** Touches the drag surface at `angle` degrees in a ring, then lifts. */
async function touchRing(ring: 'hour' | 'minute', angle: number, moves: number[] = []) {
  const surface = screen.getByTestId('dial-drag');
  const size = Number(StyleSheet.flatten(surface.props.style).width);
  const radius = size / 2;
  const at = (deg: number) => {
    const distance = radius * (ring === 'hour' ? HOUR_RING * 0.7 : 0.82);
    const rad = (deg * Math.PI) / 180;
    return {
      nativeEvent: {
        locationX: radius + distance * Math.sin(rad),
        locationY: radius - distance * Math.cos(rad),
      },
    };
  };
  await fireEvent(surface, 'responderGrant', at(angle));
  for (const deg of moves) await fireEvent(surface, 'responderMove', at(deg));
  await fireEvent(surface, 'responderRelease', at(moves.at(-1) ?? angle));
}

/** Turns the hands to `h`:`mm` on the 12-position dial (hour first, then minutes). */
async function turnTo(h: number, m: number) {
  await touchRing('hour', (h % 12) * 30);
  await touchRing('minute', m * 6);
}

function readout(): string {
  return String(screen.getByTestId('dial-readout-text').props.children);
}

function readoutOpacity(): number {
  return Number(StyleSheet.flatten(screen.getByTestId('dial-readout-text').props.style).opacity);
}

/** Renders Dial with `stored` already in its storage. */
async function renderWith(stored: Record<string, string>) {
  const host = createMockHost();
  for (const [key, value] of Object.entries(stored)) host.storage.set(key, value);
  await render(<MockHost manifest={manifest} host={host} />);
  return { host };
}

describe('Dial manifest', () => {
  it('pro tier, empty allowedHosts, full icon set', () => {
    expect(manifest).toMatchObject({
      id: 'dial',
      name: 'Dial',
      version: '0.0.0',
      minSdk: sdkPackage.version,
      triggerDescription: 'Tap the centre, turn the hands to your code, then hold the centre.',
      allowedHosts: [],
      tier: 'pro',
    });
    expect(Object.keys(manifest.icon.ios)).toEqual(['light', 'dark', 'tinted']);
    expect(Object.keys(manifest.icon.android)).toEqual(['foreground', 'background', 'monochrome']);
    for (const icon of [
      ...Object.values(manifest.icon.ios),
      ...Object.values(manifest.icon.android),
    ]) {
      expect(icon).toBeDefined();
    }
  });
});

describe('Dial trigger', () => {
  it('the centre is a 600 ms native long press around a Pressable', async () => {
    await renderDisguise(manifest);
    const { config } = getByGestureTestId('dial-centre-hold') as unknown as {
      config: Record<string, unknown>;
    };
    expect(config).toMatchObject({ minDurationMs: 600 });
    expect(screen.getByTestId('dial-centre')).toBeOnTheScreen();
  });

  it('tap on the centre in live mode enters set mode and submits nothing', async () => {
    const { host } = await renderDisguise(manifest);
    expect(screen.queryByTestId('dial-readout')).toBeNull();

    await tapCentre();

    expect(readout()).toBe('12:00');
    expect(readoutOpacity()).toBeLessThan(1);
    expect(screen.getByTestId('dial-cancel')).toBeOnTheScreen();
    expect(screen.queryByTestId('dial-seconds-hand')).toBeNull();
    expect(host.submittedCodes).toEqual([]);
  });

  it('hold on the centre in live mode submits nothing and enters set mode on release', async () => {
    const { host } = await renderDisguise(manifest);

    const { release } = await holdCentre();
    expect(host.submittedCodes).toEqual([]);
    expect(screen.queryByTestId('dial-readout')).toBeNull();

    await release();
    expect(readout()).toBe('12:00');
    expect(host.submittedCodes).toEqual([]);
  });

  it('in set mode, a tap confirms and submits nothing', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    expect(readout()).toBe('7:45');
    expect(readoutOpacity()).toBe(1);

    await tapCentre();

    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:45');
    expect(screen.getByTestId('dial-subdial')).toBeOnTheScreen();
    expect(host.submittedCodes).toEqual([]);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent('Last code: (none)');
  });

  it('in set mode, a hold submits the readout once; the release pins the second time', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);

    const { release } = await holdCentre();
    expect(host.submittedCodes).toEqual(['0745']);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent('Last code: 0745');
    // Nothing else yet: still in set mode, nothing pinned.
    expect(readout()).toBe('7:45');
    expect(screen.queryByTestId('dial-second-time')).toBeNull();

    await release();
    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:45');
    expect(host.submittedCodes).toEqual(['0745']);
  });

  it('a hold and a tap end in the same screen', async () => {
    const tapped = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    await tapCentre();
    const afterTap = tapped.toJSON();

    const held = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    const { release } = await holdCentre();
    await release();
    // The banner is the playground's, not the disguise's, and each render numbers its gesture
    // handlers afresh; everything else must match.
    const disguise = (tree: unknown) => {
      const text = JSON.stringify(tree).replace(/"handlerTags":\[\d+\]/g, '');
      return text.slice(text.indexOf('"testID":"dial-clock"'));
    };
    expect(disguise(held.toJSON())).toEqual(disguise(afterTap));
  });

  it('a hold with unmoved hands submits nothing and just leaves set mode', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    expect(readout()).toBe('12:00');

    const { release } = await holdCentre();
    expect(host.submittedCodes).toEqual([]);
    await release();

    expect(host.submittedCodes).toEqual([]);
    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(host.storage.entries.size).toBe(0);
  });

  it('a tap with unmoved hands leaves set mode without pinning', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await tapCentre();
    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(host.storage.entries.size).toBe(0);
  });

  it('Cancel leaves set mode without pinning', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    await press('dial-cancel');
    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(host.submittedCodes).toEqual([]);
  });

  it('24-hour mode yields four digits', async () => {
    // 24-hour: 12:00, hour hand to 7 keeps the afternoon half, minutes to 05.
    const { host } = await renderWith({ twentyFourHour: 'true' });
    await tapCentre();
    expect(readout()).toBe('12:00');
    await turnTo(7, 5);
    expect(readout()).toBe('19:05');
    let { release } = await holdCentre();
    await release();
    expect(host.submittedCodes).toEqual(['1905']);

    // A tap on the readout adds or takes away 12 hours.
    await tapCentre();
    await turnTo(7, 5);
    await press('dial-readout');
    expect(readout()).toBe('07:05');
    ({ release } = await holdCentre());
    await release();
    expect(host.submittedCodes).toEqual(['1905', '0705']);
  });

  it('12-hour mode yields four digits', async () => {
    const { host } = await renderDisguise(manifest);

    // 12:00, with the minute hand set on 12.
    await tapCentre();
    await touchRing('minute', 0);
    expect(readout()).toBe('12:00');
    expect(readoutOpacity()).toBe(1);
    let { release } = await holdCentre();
    await release();
    expect(host.submittedCodes).toEqual(['1200']);

    await tapCentre();
    await turnTo(7, 5);
    expect(readout()).toBe('7:05');
    ({ release } = await holdCentre());
    await release();
    expect(host.submittedCodes).toEqual(['1200', '0705']);

    // The readout does nothing on a 12-hour dial.
    await tapCentre();
    await turnTo(7, 5);
    await press('dial-readout');
    expect(readout()).toBe('7:05');
  });

  it('a drag of the minute hand past 12 carries the hour', async () => {
    await renderDisguise(manifest);
    await tapCentre();
    await touchRing('hour', 90);
    await touchRing('minute', 300, [330, 354, 12, 30]);
    expect(readout()).toBe('4:05');
    await touchRing('minute', 30, [12, 354, 330]);
    expect(readout()).toBe('3:55');
  });

  it('the code is never written to storage', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    const { release } = await holdCentre();
    await release();

    expect(host.submittedCodes).toEqual(['0745']);
    const entries = [...host.storage.entries];
    expect(entries.map(([key]) => key)).toEqual(['secondTimeOffsetMinutes']);
    for (const [key, value] of entries) {
      expect(key).not.toContain('0745');
      expect(value).not.toContain('0745');
      expect(value).not.toContain('7:45');
    }
    // 7:45 is 2 h 25 min before 10:10 on a 12-hour dial.
    expect(host.storage.getString('secondTimeOffsetMinutes')).toBe('-145');
  });
});

describe('Dial reset', () => {
  it('host.reset() in set mode returns to live time and clears the readout', async () => {
    const { host } = await renderDisguise(manifest);
    await press('dial-tabs-themes');
    await press('dial-tabs-clock');
    await tapCentre();
    await turnTo(7, 45);

    await act(() => host.reset());

    expect(screen.getByTestId('dial-clock')).toBeOnTheScreen();
    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.queryByTestId('dial-drag')).toBeNull();
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(screen.getByTestId('dial-seconds-hand')).toBeOnTheScreen();
    expect(screen.getByTestId('dial-date')).toHaveTextContent('Saturday 14 March');

    // The next set session starts again from 12:00, dimmed.
    await tapCentre();
    expect(readout()).toBe('12:00');
    expect(readoutOpacity()).toBeLessThan(1);
  });

  it('host.reset() returns to the Clock screen from any tab', async () => {
    const { host } = await renderDisguise(manifest);
    await press('dial-tabs-settings');
    expect(screen.getByTestId('dial-settings')).toBeOnTheScreen();
    await act(() => host.reset());
    expect(screen.getByTestId('dial-clock')).toBeOnTheScreen();
  });

  it('a release after a reset pins nothing', async () => {
    const { host } = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);

    const { release } = await holdCentre();
    expect(host.submittedCodes).toEqual(['0745']);
    await act(() => host.reset());
    await release();

    expect(screen.queryByTestId('dial-readout')).toBeNull();
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(host.storage.entries.size).toBe(0);
    expect(host.submittedCodes).toEqual(['0745']);
  });

  it('a release after a reset in live mode does not enter set mode', async () => {
    const { host } = await renderDisguise(manifest);
    const { release } = await holdCentre();
    await act(() => host.reset());
    await release();
    expect(screen.queryByTestId('dial-readout')).toBeNull();
  });

  it('host.reset() keeps the theme and a previously pinned second time', async () => {
    const { host } = await renderDisguise(manifest);
    await press('dial-tabs-themes');
    await press('dial-theme-station');
    await press('dial-tabs-settings');
    await fireEvent(screen.getByTestId('dial-setting-twentyFourHour'), 'valueChange', true);
    await press('dial-tabs-clock');
    await tapCentre();
    await turnTo(7, 45);
    await tapCentre();
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 19:45');

    await tapCentre();
    await turnTo(3, 0);
    await act(() => host.reset());

    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 19:45');
    expect(host.storage.getString('theme')).toBe('station');
    expect(host.storage.getString('twentyFourHour')).toBe('true');
    await press('dial-tabs-themes');
    expect(screen.getByTestId('dial-theme-station')).toBeSelected();
  });
});

describe('Dial second time', () => {
  it('ticks along at a fixed offset and survives a relaunch', async () => {
    const first = await renderDisguise(manifest);
    await tapCentre();
    await turnTo(7, 45);
    await tapCentre();
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:45');

    await act(async () => jest.advanceTimersByTime(60_000));
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:46');
    const stored = first.host.storage.getString('secondTimeOffsetMinutes')!;

    await renderWith({ secondTimeOffsetMinutes: stored });
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:46');
  });

  it('a tap on the sub-dial offers to clear it', async () => {
    const { host } = await renderWith({ secondTimeOffsetMinutes: '-145' });
    expect(screen.getByTestId('dial-second-time')).toHaveTextContent('Second time 7:45');
    await press('dial-subdial');
    await press('dial-clear');
    expect(screen.queryByTestId('dial-second-time')).toBeNull();
    expect(host.storage.getString('secondTimeOffsetMinutes')).toBeUndefined();
  });
});

describe('Dial settings', () => {
  it('switches persist as strings and change the clock', async () => {
    const { host } = await renderDisguise(manifest);
    expect(screen.getByTestId('dial-seconds-hand')).toBeOnTheScreen();
    expect(screen.getByTestId('dial-date')).toBeOnTheScreen();

    await press('dial-tabs-settings');
    await fireEvent(screen.getByTestId('dial-setting-showSeconds'), 'valueChange', false);
    await fireEvent(screen.getByTestId('dial-setting-showDate'), 'valueChange', false);
    await press('dial-tabs-clock');

    expect(screen.queryByTestId('dial-seconds-hand')).toBeNull();
    expect(screen.queryByTestId('dial-date')).toBeNull();
    expect(host.storage.getString('showSeconds')).toBe('false');
    expect(host.storage.getString('showDate')).toBe('false');
  });

  it('About shows the name, version and licences only', async () => {
    await renderDisguise(manifest);
    await press('dial-tabs-settings');
    const about = screen.getByTestId('dial-about');
    expect(about).toHaveTextContent(/Name\s*Dial/);
    expect(about).toHaveTextContent(/Version\s*0\.0\.0/);
    expect(about).toHaveTextContent(/Licences\s*Apache-2\.0/);
    const texts = within(about)
      .queryAllByText(/.*/)
      .map((node) => String(node.props.children));
    expect(texts).toEqual(['About', 'Name', 'Dial', 'Version', '0.0.0', 'Licences', 'Apache-2.0']);
  });

  it('the Themes screen has at least five faces and applies one on tap', async () => {
    const { host } = await renderDisguise(manifest);
    await press('dial-tabs-themes');
    for (const id of ['classic', 'minimal', 'station', 'night', 'roman']) {
      expect(screen.getByTestId(`dial-theme-${id}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('dial-theme-classic')).toBeSelected();
    await press('dial-theme-roman');
    expect(screen.getByTestId('dial-theme-roman')).toBeSelected();
    expect(host.storage.getString('theme')).toBe('roman');
  });
});

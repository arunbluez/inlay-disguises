// The Brief trigger under the testkit's MockHost: type into Search, hold the masthead. Every feed
// answers with a two-story RSS document; the SDK, the parser, the store and every screen are real. The hold
// is Gesture Handler's native long press, so these tests drive its states the way the native
// recognizer reports them (BEGAN on touch down, ACTIVE once held for 600 ms, END on release,
// FAILED when a tap lifts early, CANCELLED on a scroll).
import { renderDisguise } from '@inlay/testkit';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import {
  createGestureController,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import brief from '../src';
import { sources } from '../src/feeds/defaults';

const CODE = '246810';
const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Wire</title>
<item><title>Thumbnail only</title><link>https://www.example.org/1</link><description>One.</description></item>
<item><title>No image at all</title><link>https://www.example.org/2</link><description>Two.</description></item>
</channel></rss>`;
const feedUrls = new Set(sources.map((source) => source.url));

function respond(url: string): Response {
  return feedUrls.has(url)
    ? new Response(RSS, { headers: { 'content-type': 'application/rss+xml' } })
    : new Response('not found', { status: 404 });
}

/** Lets fetches and parsing finish. */
async function settle() {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function open() {
  const view = await renderDisguise(brief, { respond });
  await settle();
  return view;
}

async function search(text: string) {
  await fireEvent.changeText(screen.getByTestId('brief-search'), text);
}

const holdGesture = () => createGestureController(getByGestureTestId('brief-masthead-hold'));

/** Touch down, held to the threshold, then released. */
async function holdAndRelease() {
  const hold = holdGesture();
  await act(() => hold.begin());
  await act(() => hold.activate());
  await act(() => hold.end());
}

/** A tap: the long press begins on touch down and fails when the finger lifts early. */
async function tap() {
  const hold = holdGesture();
  await act(() => hold.begin());
  await act(() => hold.fail());
}

describe('Brief trigger', () => {
  it('is a 600 ms native long press on the masthead, which draws as a plain title', async () => {
    await open();
    const { config } = getByGestureTestId('brief-masthead-hold') as unknown as {
      config: Record<string, unknown>;
    };
    console.log('masthead hold config', config);
    expect(config).toMatchObject({ minDurationMs: 600, enabled: true });
    const masthead = screen.getByTestId('brief-masthead');
    expect(within(masthead).getByRole('header', { name: 'Brief' })).toBeOnTheScreen();
    // A title, not a control: no button role, nothing pressable.
    expect(within(masthead).queryByRole('button')).toBeNull();
  });

  it('hold with the code submits it once, at the hold mark; Search shows its normal state', async () => {
    const { host } = await open();
    await search(CODE);
    expect(screen.getByText('No results')).toBeOnTheScreen();

    const hold = holdGesture();
    await act(() => hold.begin());
    expect(host.submittedCodes).toEqual([]);
    await act(() => hold.activate());
    console.log('submitted at the hold mark', host.submittedCodes);
    expect(host.submittedCodes).toEqual([CODE]);
    await act(() => hold.end());

    expect(host.submittedCodes).toEqual([CODE]);
    expect(screen.getByTestId('brief-search-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('brief-search').props.value).toBe(CODE);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent(`Last code: ${CODE}`);
  });

  it('a wrong code is submitted and Search behaves as usual: No results', async () => {
    const { host } = await open();
    await search('482916');
    await holdAndRelease();
    // MockHost never accepts: like any wrong code, Brief does its normal thing.
    expect(host.submittedCodes).toEqual(['482916']);
    expect(screen.getByText('No results')).toBeOnTheScreen();
    expect(screen.getByTestId('brief-feed')).toBeOnTheScreen();
  });

  it('text that matches stories is submitted too, and the results stay on screen', async () => {
    const { host } = await open();
    await search('thumbnail');
    await holdAndRelease();
    expect(host.submittedCodes).toEqual(['thumbnail']);
    expect(within(screen.getByTestId('brief-results')).getByText('Thumbnail only')).toBeTruthy();
  });

  it('sends the text untrimmed, exactly as typed', async () => {
    const { host } = await open();
    await search(` ${CODE} `);
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([` ${CODE} `]);
  });

  it('empty or blank Search: a hold submits nothing', async () => {
    const { host } = await open();
    await holdAndRelease();
    await search('   ');
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([]);
    expect(screen.getByTestId('brief-list')).toBeOnTheScreen();
  });

  it('a tap or a scroll on the masthead submits nothing', async () => {
    const { host } = await open();
    await search(CODE);
    await tap();
    const hold = holdGesture();
    await act(() => hold.begin());
    await act(() => hold.cancel());
    expect(host.submittedCodes).toEqual([]);
  });

  it('the query stays across tabs, and the masthead commits it in the Shorts layout', async () => {
    const { host } = await open();
    await search(CODE);
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    await fireEvent.press(screen.getByTestId('brief-layout-shorts'));
    await fireEvent.press(screen.getByTestId('brief-tabs-feed'));
    expect(screen.getByTestId('brief-search').props.value).toBe(CODE);

    // Back to the Shorts pager under the same masthead once Search is cleared.
    await search('');
    expect(screen.getByTestId('brief-shorts-frame')).toBeOnTheScreen();
    await search(CODE);
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([CODE]);
  });

  it('host reset empties Search and returns to Feed', async () => {
    const { host } = await open();
    await search(CODE);
    await fireEvent.press(screen.getByTestId('brief-tabs-saved'));

    await act(async () => host.reset());
    await settle();
    expect(screen.getByTestId('brief-feed')).toBeOnTheScreen();
    expect(screen.getByTestId('brief-search').props.value).toBe('');
    expect(screen.getByTestId('brief-list')).toBeOnTheScreen();
    await holdAndRelease();
    expect(host.submittedCodes).toEqual([]);
  });

  it('logs nothing it submits', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(console, level),
    );
    try {
      await open();
      await search('97531');
      await holdAndRelease();
      const printed = spies.flatMap((spy) => spy.mock.calls.flat().map(String));
      expect(printed.filter((line) => line.includes('97531'))).toEqual([]);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

// Brief under the testkit's MockHost: the feeds and images are answered by the MockHost fetch
// stub (which applies `allowedHosts` exactly like the host app), storage is the MockHost's. The
// SDK, the parser, the store and every screen are real; only `Linking.openURL` is observed.
import { createMockHost, MockHost, type MockHostValue } from '@inlay/testkit';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import brief from '../src';
import { LAYOUT_KEY, SAVED_KEY, SOURCES_OFF_KEY, STORY_LIMIT } from '../src/feeds/cache';
import { allowedHosts, sources, type Source } from '../src/feeds/defaults';
import { httpsHost } from '../src/feeds/url';
import { MAX_IMAGE_BYTES } from '../src/images';

/** A JPEG's first bytes; enough for a `data:` URI. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const JPEG_BASE64 = btoa(String.fromCharCode(...JPEG));

interface Item {
  title: string;
  link?: string;
  image?: string;
  description?: string;
  /** Minutes before the base time. */
  age?: number;
}

const BASE = Date.UTC(2026, 9, 27, 12, 0, 0);

function rss(items: readonly Item[]): string {
  const body = items
    .map(
      ({ title, link, image, description = `${title} in brief.`, age = 0 }) => `<item>
  <title>${title}</title>
  <link>${link ?? `https://www.example.org/${encodeURIComponent(title)}`}</link>
  <pubDate>${new Date(BASE - age * 60_000).toUTCString()}</pubDate>
  <description>${description}</description>
  ${image ? `<media:thumbnail url="${image}"/>` : ''}
</item>`,
    )
    .join('\n');
  return `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>t</title>${body}</channel></rss>`;
}

/** Two stories per source: the first with an image on that source's image host, one without. */
function defaultItems(source: Source, index: number): Item[] {
  const imageHost = {
    'bbc-world': 'ichef.bbci.co.uk',
    'bbc-business': 'ichef.bbci.co.uk',
    'npr-news': 'npr.brightspotcdn.com',
    'ars-technica': 'cdn.arstechnica.net',
    'bbc-sport': 'ichef.bbci.co.uk',
    'science-news': 'www.sciencenews.org',
    nasa: 'assets.science.nasa.gov',
  }[source.id];
  return [
    {
      title: `${source.name} lead`,
      image: `https://${imageHost}/${source.id}/lead.jpg`,
      age: index * 10,
    },
    { title: `${source.name} second`, age: index * 10 + 5 },
  ];
}

/** What each feed URL answers; tests replace entries. */
let feeds: Map<string, () => Response>;
/** What each image URL answers (default: a small JPEG). */
let imageAnswers: Map<string, () => Response>;
/** Every URL Brief asked the host for, permitted or not. */
let attempted: string[];

function respond(url: string): Response {
  const feed = feeds.get(url);
  if (feed) return feed();
  const image = imageAnswers.get(url);
  if (image) return image();
  if (/\.(jpe?g|png)$/.test(url)) {
    return new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } });
  }
  return new Response('not found', { status: 404 });
}

function xmlResponse(xml: string): () => Response {
  return () => new Response(xml, { headers: { 'content-type': 'application/rss+xml' } });
}

beforeEach(() => {
  feeds = new Map(
    sources.map((source, index) => [source.url, xmlResponse(rss(defaultItems(source, index)))]),
  );
  imageAnswers = new Map();
  attempted = [];
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  // The React Native preset's `Linking.openURL` is already a mock, which `restoreAllMocks`
  // leaves in place; clear its calls too.
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

/** A MockHost whose fetch also records every URL asked for, before the host's own check. */
function makeHost(): MockHostValue {
  const host = createMockHost({ allowedHosts: brief.allowedHosts, theme: 'brief', respond });
  const permitted = host.fetch;
  host.fetch = (url, init) => {
    attempted.push(url);
    return permitted(url, init);
  };
  return host;
}

/** Lets fetches, parsing and image loads finish. */
async function settle() {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function open(host = makeHost()) {
  const view = await render(<MockHost manifest={brief} host={host} />);
  await settle();
  return { host, ...view };
}

/** The card (in List) whose headline is `title`. */
function card(title: string) {
  return screen.getByLabelText(title);
}

function storedValues(host: MockHostValue): string {
  return [...host.storage.entries.values()].join('\n');
}

async function refresh(listTestID = 'brief-list') {
  await act(async () => {
    screen.getByTestId(listTestID).props.refreshControl.props.onRefresh();
  });
  await settle();
}

describe('Brief manifest', () => {
  it('is a pro disguise named Brief whose allowedHosts are the presets and their image hosts', () => {
    console.log('allowedHosts:', brief.allowedHosts);
    expect(brief).toMatchObject({ id: 'brief', name: 'Brief', tier: 'pro', minSdk: '0.0.0' });
    expect(brief.allowedHosts).toEqual(allowedHosts);
    expect(brief.triggerDescription).toMatch(/Search/);
    for (const asset of [...Object.values(brief.icon.ios), ...Object.values(brief.icon.android)]) {
      expect(asset).toBeTruthy();
    }
  });
});

describe('Feed (List)', () => {
  it('fetches every preset on open, only from allowedHosts over https, and shows the stories', async () => {
    const { host } = await open();
    console.log('attempted:\n' + attempted.join('\n'));
    for (const url of attempted) {
      expect(url.startsWith('https://')).toBe(true);
      expect(allowedHosts).toContain(httpsHost(url));
    }
    for (const source of sources) {
      expect(attempted.filter((url) => url === source.url)).toHaveLength(1);
    }
    expect(host.fetchCalls).toHaveLength(attempted.length);
    expect(screen.getByTestId('brief-masthead')).toBeTruthy();
    expect(screen.getByText('BBC World lead')).toBeTruthy();
    expect(screen.getByText('NPR News second')).toBeTruthy();
  });

  it('shows an item’s image from memory as a data: URI, and a text card when it has none', async () => {
    await open();
    const lead = within(card('BBC World lead'));
    const image = lead.getByTestId(/^brief-image-/);
    console.log('image uri:', image.props.source.uri);
    expect(image.props.source.uri).toBe(`data:image/jpeg;base64,${JPEG_BASE64}`);
    expect(within(card('BBC World second')).queryByTestId(/^brief-image-/)).toBeNull();
  });

  it('never asks for an image on another host, too large, or not an image: text cards', async () => {
    const big = 'https://ichef.bbci.co.uk/big.jpg';
    const html = 'https://ichef.bbci.co.uk/page.jpg';
    const huge = 'https://ichef.bbci.co.uk/huge.jpg';
    imageAnswers.set(
      big,
      () =>
        new Response(JPEG, {
          headers: { 'content-type': 'image/jpeg', 'content-length': `${MAX_IMAGE_BYTES + 1}` },
        }),
    );
    imageAnswers.set(
      huge,
      () =>
        new Response(new Uint8Array(MAX_IMAGE_BYTES + 1), {
          headers: { 'content-type': 'image/jpeg' },
        }),
    );
    imageAnswers.set(
      html,
      () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    );
    feeds.set(
      sources[0]!.url,
      xmlResponse(
        rss([
          { title: 'Elsewhere', image: 'https://images.example.com/a.jpg' },
          { title: 'Big', image: big },
          { title: 'Huge', image: huge },
          { title: 'Page', image: html },
        ]),
      ),
    );
    await open();
    console.log('attempted:\n' + attempted.join('\n'));
    expect(attempted).not.toContain('https://images.example.com/a.jpg');
    expect(attempted).toEqual(expect.arrayContaining([big, huge, html]));
    for (const title of ['Elsewhere', 'Big', 'Huge', 'Page']) {
      expect(within(card(title)).queryByTestId(/^brief-image-/)).toBeNull();
    }
  });

  it('keeps image bytes out of storage: only Story fields are stored', async () => {
    const { host } = await open();
    await fireEvent.press(within(card('BBC World lead')).getByText('Save'));
    const stored = storedValues(host);
    console.log('storage keys:', [...host.storage.entries.keys()]);
    expect(stored).not.toContain('data:');
    expect(stored).not.toContain(JPEG_BASE64);
    expect(stored).toContain('https://ichef.bbci.co.uk/bbc-world/lead.jpg');
  });

  it('opens the article once in the system browser when a card is tapped, https only', async () => {
    feeds.set(
      sources[0]!.url,
      xmlResponse(
        rss([
          { title: 'Safe link', link: 'https://www.bbc.co.uk/news/1' },
          { title: 'Script link', link: 'javascript:alert(1)' },
          { title: 'Plain link', link: 'http://www.bbc.co.uk/news/2' },
        ]),
      ),
    );
    await open();
    await fireEvent.press(card('Safe link'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.bbc.co.uk/news/1');
    await fireEvent.press(card('Script link'));
    await fireEvent.press(card('Plain link'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });

  it('filters by topic tab', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('brief-topics-sport'));
    expect(screen.getByText('BBC Sport lead')).toBeTruthy();
    expect(screen.queryByText('BBC World lead')).toBeNull();
    await fireEvent.press(screen.getByTestId('brief-topics-all'));
    expect(screen.getByText('BBC World lead')).toBeTruthy();
  });

  it('keeps the cache and says so quietly when a feed fails to refresh', async () => {
    await open();
    for (const source of sources) feeds.set(source.url, () => new Response('', { status: 503 }));
    await refresh();
    expect(screen.getByTestId('brief-toast')).toBeTruthy();
    expect(screen.getByText('Couldn’t refresh')).toBeTruthy();
    expect(screen.getByText('BBC World lead')).toBeTruthy();
  });
});

describe('Shorts', () => {
  it('switches layout in Settings, persists it, and opens the article from Tap to know more', async () => {
    feeds.set(
      sources[0]!.url,
      xmlResponse(
        rss([
          {
            title: 'Paged story',
            link: 'https://www.bbc.co.uk/news/9',
            image: 'https://ichef.bbci.co.uk/p.jpg',
          },
          { title: 'Script page', link: 'javascript:alert(1)', age: 1 },
        ]),
      ),
    );
    const { host } = await open();
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    await fireEvent.press(screen.getByTestId('brief-layout-shorts'));
    expect(host.storage.getString(LAYOUT_KEY)).toBe('shorts');
    await fireEvent.press(screen.getByTestId('brief-tabs-feed'));
    expect(screen.queryByTestId('brief-list')).toBeNull();
    // The pager sizes each page to its frame.
    await fireEvent(screen.getByTestId('brief-shorts-frame'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 700 } },
    });
    await settle();
    const first = within(screen.getByTestId('brief-shorts-0'));
    expect(first.getByText('Paged story')).toBeTruthy();
    expect(first.getByText('Paged story in brief.')).toBeTruthy();
    expect(first.getByTestId(/^brief-image-/).props.source.uri).toMatch(
      /^data:image\/jpeg;base64,/,
    );
    await fireEvent.press(screen.getByTestId('brief-shorts-0-more'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.bbc.co.uk/news/9');
    await fireEvent.press(screen.getByTestId('brief-shorts-1-more'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    await fireEvent.press(screen.getByTestId('brief-layout-list'));
    await fireEvent.press(screen.getByTestId('brief-tabs-feed'));
    expect(screen.getByTestId('brief-list')).toBeTruthy();
    expect(host.storage.getString(LAYOUT_KEY)).toBe('list');
  });

  it('opens in the stored layout', async () => {
    const host = makeHost();
    host.storage.set(LAYOUT_KEY, 'shorts');
    await open(host);
    expect(screen.getByTestId('brief-shorts-frame')).toBeTruthy();
  });
});

describe('Search', () => {
  it('finds cached stories by title or gist, ignoring case and accents', async () => {
    feeds.set(
      sources[0]!.url,
      xmlResponse(
        rss([
          { title: 'Café owners rally', description: 'A morning story.' },
          { title: 'Weather', description: 'Rain over the CAFES of Paris.' },
          { title: 'Unrelated', description: 'Nothing to see.' },
        ]),
      ),
    );
    const { host } = await open();
    await fireEvent.changeText(screen.getByTestId('brief-search'), 'cafe');
    const results = within(screen.getByTestId('brief-results'));
    expect(results.getByText('Café owners rally')).toBeTruthy();
    expect(results.getByText('Weather')).toBeTruthy();
    expect(results.queryByText('Unrelated')).toBeNull();
    expect(host.submittedCodes).toEqual([]);
  });

  it('takes digits like any other text and shows No results', async () => {
    const { host } = await open();
    await fireEvent.changeText(screen.getByTestId('brief-search'), '482915');
    expect(screen.getByTestId('brief-search-empty')).toBeTruthy();
    expect(screen.getByText('No results')).toBeTruthy();
    expect(host.submittedCodes).toEqual([]);
    await fireEvent.changeText(screen.getByTestId('brief-search'), '');
    expect(screen.getByTestId('brief-list')).toBeTruthy();
  });
});

describe('Saved', () => {
  it('saves and unsaves from a card, in storage, and keeps a story the cache has dropped', async () => {
    const { host } = await open();
    await fireEvent.press(within(card('NPR News lead')).getByText('Save'));
    expect(screen.getByText('Saved for later')).toBeTruthy();
    expect(JSON.parse(host.storage.getString(SAVED_KEY)!)).toHaveLength(1);

    // Every feed now has more newer stories than the cache keeps.
    for (const source of sources) {
      feeds.set(
        source.url,
        xmlResponse(
          rss(
            Array.from({ length: STORY_LIMIT }, (_, i) => ({
              title: `${source.name} newer ${i}`,
              age: -100 - i,
            })),
          ),
        ),
      );
    }
    await refresh();
    expect(screen.queryByLabelText('NPR News lead')).toBeNull();

    await fireEvent.press(screen.getByTestId('brief-tabs-saved'));
    const saved = within(screen.getByTestId('brief-saved-list'));
    expect(saved.getByText('NPR News lead')).toBeTruthy();
    await fireEvent.press(saved.getByText('Saved'));
    expect(screen.getByTestId('brief-saved-empty')).toBeTruthy();
    expect(JSON.parse(host.storage.getString(SAVED_KEY)!)).toEqual([]);
  });
});

describe('Sources', () => {
  it('lists the presets on, and a source switched off is not fetched and leaves Feed', async () => {
    const { host } = await open();
    await fireEvent.press(within(card('BBC Sport lead')).getByText('Save'));
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    await fireEvent.press(screen.getByTestId('brief-settings-sources'));
    for (const source of sources) {
      expect(screen.getByTestId(`brief-source-${source.id}`).props.accessibilityState.checked).toBe(
        true,
      );
    }
    await fireEvent.press(screen.getByTestId('brief-source-bbc-sport'));
    expect(JSON.parse(host.storage.getString(SOURCES_OFF_KEY)!)).toEqual(['bbc-sport']);
    await fireEvent.press(screen.getByTestId('brief-sources-header-back'));
    await fireEvent.press(screen.getByTestId('brief-tabs-feed'));
    expect(screen.queryByText('BBC Sport lead')).toBeNull();

    attempted = [];
    await refresh();
    console.log('attempted after switching BBC Sport off:\n' + attempted.join('\n'));
    const sport = sources.find((source) => source.id === 'bbc-sport')!;
    expect(attempted).not.toContain(sport.url);
    expect(attempted).toContain(sources[0]!.url);

    await fireEvent.press(screen.getByTestId('brief-tabs-saved'));
    expect(screen.getByText('BBC Sport lead')).toBeTruthy();
  });

  it('fetches a source again once it is switched back on', async () => {
    const host = makeHost();
    host.storage.set(SOURCES_OFF_KEY, JSON.stringify(['nasa']));
    await open(host);
    const nasa = sources.find((source) => source.id === 'nasa')!;
    expect(attempted).not.toContain(nasa.url);
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    await fireEvent.press(screen.getByTestId('brief-settings-sources'));
    await fireEvent.press(screen.getByTestId('brief-source-nasa'));
    await settle();
    expect(attempted).toContain(nasa.url);
    expect(JSON.parse(host.storage.getString(SOURCES_OFF_KEY)!)).toEqual([]);
  });
});

describe('Settings', () => {
  it('shows About with name, version and licences only', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    const about = within(screen.getByTestId('brief-about'));
    expect(about.getByText('Brief')).toBeTruthy();
    expect(about.getByText('1.0.0')).toBeTruthy();
    expect(about.getByText('Apache-2.0')).toBeTruthy();
    expect(about.queryByText(/@|https?:|www\./)).toBeNull();
  });
});

describe('reset', () => {
  it('returns to Feed in the chosen layout, empties Search and the topic, and drops images', async () => {
    const { host } = await open();
    await fireEvent.press(screen.getByTestId('brief-topics-sport'));
    await fireEvent.changeText(screen.getByTestId('brief-search'), 'lead');
    await fireEvent.press(screen.getByTestId('brief-tabs-settings'));
    const imageRequests = () => attempted.filter((url) => url.endsWith('/lead.jpg')).length;
    const before = imageRequests();

    await act(async () => host.reset());
    await settle();
    expect(screen.getByTestId('brief-feed')).toBeTruthy();
    expect(screen.getByTestId('brief-search').props.value).toBe('');
    expect(screen.getByTestId('brief-list')).toBeTruthy();
    expect(screen.getByText('BBC World lead')).toBeTruthy();
    // The images were dropped, so the cards on screen load theirs again.
    console.log(`image requests before reset ${before}, after ${imageRequests()}`);
    expect(imageRequests()).toBeGreaterThan(before);
  });

  it('drops a refresh still in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const host = makeHost();
    const permitted = host.fetch;
    host.fetch = async (url, init) => {
      await gate;
      return permitted(url, init);
    };
    await open(host);
    await act(async () => host.reset());
    release();
    await settle();
    expect(screen.queryByText('BBC World lead')).toBeNull();
    expect(host.storage.getString('stories.v1')).toBeUndefined();
  });
});

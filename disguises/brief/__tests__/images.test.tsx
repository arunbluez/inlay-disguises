// Brief's image store on its own: one store over the MockHost fetch stub, read by every card and
// page through `useStoryImage`, and the per-host renditions it asks for. Images stay in memory.
import { createMockHost } from '@inlay/testkit';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { allowedHosts } from '../src/feeds/defaults';
import { IMAGE_WIDTH } from '../src/feeds/parse';
import { createImages, rendition, useStoryImage, type Images } from '../src/images';

/** A JPEG's first bytes; enough for a `data:` URI. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const JPEG_URI = `data:image/jpeg;base64,${btoa(String.fromCharCode(...JPEG))}`;

const BBC = 'https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/5c6a/live/a.jpg';
const NPR =
  'https://npr.brightspotcdn.com/dims3/default/strip/false/crop/2666x1777+0+0/resize/2666x1777!/quality/85/format/webp/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F02%2Fa.jpg';
const ARS = 'https://cdn.arstechnica.net/wp-content/uploads/2026/10/a-1024x648.jpg';

/** A store over the MockHost fetch; every permitted image URL answers with the JPEG. */
function makeStore(limit?: number) {
  const host = createMockHost({
    allowedHosts,
    respond: () => new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } }),
  });
  return { images: createImages(host.fetch, allowedHosts, limit), calls: host.fetchCalls };
}

/** Shows what `useStoryImage` returns for `url`, as a List card or a Shorts page would. */
function Probe({
  images,
  url,
  active,
  testID,
}: {
  images: Images;
  url: string;
  active: boolean;
  testID: string;
}) {
  const entry = useStoryImage(images, url, active);
  return <Text testID={testID}>{entry === undefined ? 'loading' : (entry ?? 'none')}</Text>;
}

/** Lets fetches and image loads finish. */
async function settle() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe('useStoryImage over one store', () => {
  it('shows an image on every card and page that has it, whichever of them loaded it', async () => {
    const { images, calls } = makeStore();
    // The List card is off its window (inactive); the Shorts page beside it is the one loading.
    await render(
      <>
        <Probe images={images} url={BBC} active={false} testID="list-card" />
        <Probe images={images} url={BBC} active testID="shorts-page" />
      </>,
    );
    await settle();
    console.log('requests:', calls.map((call) => call.url).join(', '));
    expect(calls).toHaveLength(1);
    expect(screen.getByTestId('shorts-page')).toHaveTextContent(JPEG_URI);
    expect(screen.getByTestId('list-card')).toHaveTextContent(JPEG_URI);
  });

  it('updates a card that turned inactive while its image was loading', async () => {
    const { images } = makeStore();
    const view = await render(<Probe images={images} url={ARS} active testID="card" />);
    await view.rerender(<Probe images={images} url={ARS} active={false} testID="card" />);
    await settle();
    expect(screen.getByTestId('card')).toHaveTextContent(JPEG_URI);
  });

  it('goes back to loading on clear, and loads again while active', async () => {
    const { images, calls } = makeStore();
    await render(<Probe images={images} url={ARS} active testID="card" />);
    await settle();
    await act(async () => images.clear());
    await settle();
    expect(screen.getByTestId('card')).toHaveTextContent(JPEG_URI);
    expect(calls).toHaveLength(2);
  });

  it('keeps at most `limit` images, dropping the one loaded first', async () => {
    const { images } = makeStore(2);
    const urls = [1, 2, 3].map((n) => `https://cdn.arstechnica.net/${n}.jpg`);
    for (const url of urls) await images.load(url);
    console.log(
      'held:',
      urls.map((url) => `${url} ${images.get(url) === undefined ? 'dropped' : 'kept'}`),
    );
    expect(urls.map((url) => images.get(url) !== undefined)).toEqual([false, true, true]);
  });
});

describe('rendition', () => {
  it(`asks BBC's ichef for ${IMAGE_WIDTH} px instead of the feed's 240`, () => {
    expect(rendition(BBC)).toBe(
      `https://ichef.bbci.co.uk/ace/standard/${IMAGE_WIDTH}/cpsprodpb/5c6a/live/a.jpg`,
    );
  });

  it(`asks NPR's brightspot for ${IMAGE_WIDTH} px instead of the original`, () => {
    const sized = rendition(NPR);
    console.log('NPR:', sized);
    expect(sized).toContain(`/resize/${IMAGE_WIDTH}/quality/85/`);
    expect(sized).toContain('/crop/2666x1777+0+0/');
    expect(sized.endsWith('?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2F02%2Fa.jpg')).toBe(
      true,
    );
  });

  it('leaves every other image as the feed gives it', () => {
    for (const url of [
      ARS,
      'https://www.sciencenews.org/wp-content/uploads/a.jpg?w=800',
      'https://ichef.bbci.co.uk/news/240/a.jpg',
      'https://images.example.com/ace/standard/240/a.jpg',
    ]) {
      expect(rendition(url)).toBe(url);
    }
  });

  it('requests the rendition but keys the image by the feed URL', async () => {
    const { images, calls } = makeStore();
    await images.load(BBC);
    expect(calls.map((call) => call.url)).toEqual([rendition(BBC)]);
    expect(images.get(BBC)).toBe(JPEG_URI);
  });
});

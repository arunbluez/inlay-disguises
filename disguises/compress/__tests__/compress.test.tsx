// Compress under the testkit's MockHost. Only the third-party native modules are replaced (the
// system photo picker and the image encoder); the SDK, storage and every screen are real.
import { createMockHost, MockHost, renderDisguise } from '@inlay/testkit';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ImagePickerResult } from 'expo-image-picker';
import { launchImageLibraryAsync } from 'expo-image-picker';

import packageJson from '../package.json';
import compress from '../src';
import { HISTORY_KEY, loadHistory, type History } from '../src/state/history';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

// Jest only lets a mock factory read variables named `mock…`.
/** Every save the encoder was asked for. */
const mockSaves: { uri: string; compress?: number; format?: string }[] = [];
/** Bytes an encode at `quality` (1–100) produces. */
const mockEncodedBytes = (quality: number) => quality * 1000;
/** When set, every encode waits for it. */
let mockGate: Promise<void> | null = null;

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: (uri: string) => ({
      renderAsync: async () => ({
        saveAsync: async (options: { compress?: number; format?: string }) => {
          mockSaves.push({ uri, ...options });
          if (mockGate) await mockGate;
          const quality = Math.round((options.compress ?? 1) * 100);
          // base64 of `n` zero bytes is 4·n/3 'A' characters (n a multiple of 3).
          const bytes = Math.round(mockEncodedBytes(quality) / 3) * 3;
          return {
            uri: `file:///cache/ImageManipulator/${mockSaves.length}.${options.format}`,
            width: 100,
            height: 100,
            base64: 'A'.repeat((bytes / 3) * 4),
          };
        },
        release: () => undefined,
      }),
      release: () => undefined,
    }),
  },
}));

const pick = launchImageLibraryAsync as jest.MockedFunction<typeof launchImageLibraryAsync>;

function picked(...names: string[]): ImagePickerResult {
  return {
    canceled: false,
    assets: names.map((name, i) => ({
      uri: `file:///cache/ImagePicker/${name}`,
      fileName: name,
      fileSize: 300_000 * (i + 1),
      width: 4000,
      height: 3000,
      type: 'image',
    })),
  };
}

const seeded: History = {
  savedBytes: 5 * 1024 * 1024,
  count: 7,
  runs: [
    {
      name: 'IMG_4021.JPG',
      ext: 'JPG',
      photos: 1,
      at: Date.now(),
      before: 4_400_000,
      after: 1_150_000,
    },
    {
      name: '12 photos',
      ext: 'JPG',
      photos: 12,
      at: Date.now() - 3 * 86_400_000,
      before: 64_000_000,
      after: 17_800_000,
    },
  ],
};

beforeEach(() => {
  mockSaves.length = 0;
  mockGate = null;
  pick.mockReset();
});

/** Opens the picker from Home and waits for Setup with the picked photos. */
async function addFromHome(...names: string[]) {
  pick.mockResolvedValueOnce(picked(...names));
  await act(async () => {
    await fireEvent.press(screen.getByTestId('compress-add-files'));
  });
}

describe('Compress manifest', () => {
  it('is the free Compress disguise with its version, icons and trigger sentence', () => {
    expect(compress).toMatchObject({
      id: 'compress',
      name: 'Compress',
      version: packageJson.version,
      triggerDescription: 'Type your code as the target size, then hold Compress',
      allowedHosts: [],
      tier: 'free',
    });
    expect(Object.keys(compress.icon.ios)).toEqual(['light', 'dark', 'tinted']);
    expect(Object.keys(compress.icon.android)).toEqual(['foreground', 'background', 'monochrome']);
  });
});

describe('Home', () => {
  it('shows zero saved on a fresh install, and no Recent list', async () => {
    await renderDisguise(compress);
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();
    expect(within(screen.getByTestId('compress-saved')).getByText('0 KB')).toBeOnTheScreen();
    expect(screen.getByText('across 0 compressions')).toBeOnTheScreen();
    expect(screen.getByText('Photos from your library')).toBeOnTheScreen();
    expect(screen.queryByTestId('compress-recent')).not.toBeOnTheScreen();
  });

  it('renders the saved total and recent runs from seeded storage', async () => {
    const host = createMockHost();
    host.storage.set(HISTORY_KEY, JSON.stringify(seeded));
    await render(<MockHost manifest={compress} host={host} />);

    expect(within(screen.getByTestId('compress-saved')).getByText('5.0 MB')).toBeOnTheScreen();
    expect(screen.getByText('across 7 compressions')).toBeOnTheScreen();
    const recent = screen.getByTestId('compress-recent');
    expect(within(recent).getByText('IMG_4021.JPG')).toBeOnTheScreen();
    expect(within(recent).getByText('Today · 1 photo')).toBeOnTheScreen();
    expect(within(recent).getByText('−74%')).toBeOnTheScreen();
    expect(within(recent).getByText('12 photos')).toBeOnTheScreen();
  });
});

describe('Setup', () => {
  it('asks the picker for photos only, several at once, and shows a row per photo', async () => {
    await renderDisguise(compress);
    await addFromHome('IMG_0001.JPG', 'Screenshot.png');

    expect(pick).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsMultipleSelection: true }),
    );
    expect(screen.getByTestId('compress-setup')).toBeOnTheScreen();
    expect(screen.getByText('Files · 2')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('compress-file-0')).getByText('IMG_0001.JPG'),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId('compress-file-0')).getByText('JPG')).toBeOnTheScreen();
    expect(within(screen.getByTestId('compress-file-1')).getByText('PNG')).toBeOnTheScreen();
    expect(screen.getByText('Compress 2 files')).toBeOnTheScreen();
  });

  it('stays on Home when the picker is dismissed', async () => {
    await renderDisguise(compress);
    pick.mockResolvedValueOnce({ canceled: true, assets: null });
    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-add-files'));
    });
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();
  });

  it('removes one photo, and Clear empties the list', async () => {
    await renderDisguise(compress);
    await addFromHome('a.jpg', 'b.jpg', 'c.jpg');

    await fireEvent.press(screen.getByTestId('compress-file-1-remove'));
    expect(screen.getByText('Files · 2')).toBeOnTheScreen();
    expect(screen.queryByText('b.jpg')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('compress-setup-header-action'));
    expect(screen.getByText('Files · 0')).toBeOnTheScreen();
    expect(screen.getByText('No files selected')).toBeOnTheScreen();
    expect(screen.getByText('Add photos to begin.')).toBeOnTheScreen();
    expect(screen.queryByTestId('compress-setup-header-action')).not.toBeOnTheScreen();
    expect(screen.getByText('Compress')).toBeOnTheScreen();
  });

  it('offers Original and JPEG only, and keeps the Target size to 8 digits', async () => {
    await renderDisguise(compress);
    await addFromHome('a.jpg');

    expect(screen.getByTestId('compress-format-original')).toBeOnTheScreen();
    expect(screen.getByTestId('compress-format-jpeg')).toBeOnTheScreen();
    expect(screen.queryByText('HEIC')).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('compress-target-size'), '12a3456789');
    expect(screen.getByTestId('compress-target-size')).toHaveDisplayValue('12345678');
  });
});

describe('Compressing', () => {
  it('compresses two photos, shows the result and records the run in storage', async () => {
    const { host } = await renderDisguise(compress);
    await addFromHome('IMG_0001.JPG', 'IMG_0002.HEIC');

    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-run'));
    });

    console.log('encoder saves', mockSaves);
    expect(mockSaves.map((save) => save.compress)).toEqual([0.7, 0.7]);
    expect(mockSaves.map((save) => save.format)).toEqual(['jpeg', 'jpeg']);
    // 300 000 + 600 000 bytes in, 2 × 69 999 out (the stand-in rounds to whole base64 groups).
    expect(screen.getByTestId('compress-result')).toBeOnTheScreen();
    expect(screen.getByText('−84%')).toBeOnTheScreen();
    expect(screen.getByText('2 files are 137 KB now, down from 879 KB.')).toBeOnTheScreen();

    const stored = loadHistory(host.storage);
    console.log('stored history', stored);
    expect(stored.count).toBe(1);
    expect(stored.savedBytes).toBe(900_000 - 2 * 69_999);
    expect(stored.runs[0]).toMatchObject({ name: '2 photos', ext: 'JPG', photos: 2 });

    await fireEvent.press(screen.getByTestId('compress-done'));
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();
    expect(screen.getByText('across 1 compression')).toBeOnTheScreen();
  });

  it('lowers quality to fit the Target size', async () => {
    await renderDisguise(compress);
    await addFromHome('IMG_0001.JPG');
    await fireEvent.changeText(screen.getByTestId('compress-target-size'), '40');

    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-run'));
    });

    const qualities = mockSaves.map((save) => Math.round((save.compress ?? 0) * 100));
    console.log('target 40 KB → qualities tried', qualities);
    expect(qualities[0]).toBe(70);
    expect(qualities.at(-1)).toBeLessThan(70);
    expect(screen.getByTestId('compress-result')).toBeOnTheScreen();
    expect(screen.getByText(/^1 file is \d+ KB now/)).toBeOnTheScreen();
  });

  it('says to add files when there are none, and compresses nothing', async () => {
    await renderDisguise(compress);
    await addFromHome('a.jpg');
    await fireEvent.press(screen.getByTestId('compress-setup-header-action'));

    await fireEvent.press(screen.getByTestId('compress-run'));
    expect(screen.getByTestId('compress-toast')).toHaveTextContent('Add files to compress');
    expect(mockSaves).toEqual([]);
  });

  it('Cancel stops the run: back to Setup, no result, nothing recorded', async () => {
    const { host } = await renderDisguise(compress);
    await addFromHome('a.jpg', 'b.jpg');
    let release: () => void = () => undefined;
    mockGate = new Promise<void>((resolve) => (release = resolve));

    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-run'));
    });
    expect(screen.getByTestId('compress-progress')).toBeOnTheScreen();
    expect(screen.getByText('File 1 of 2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('compress-cancel'));
    await act(async () => release());

    console.log('saves after cancel', mockSaves);
    expect(screen.getByTestId('compress-setup')).toBeOnTheScreen();
    expect(screen.queryByTestId('compress-result')).not.toBeOnTheScreen();
    expect(mockSaves).toHaveLength(1);
    expect(host.storage.getString(HISTORY_KEY)).toBeUndefined();
  });
});

describe('History', () => {
  it('persists across launches through the host storage', async () => {
    const { host, unmount } = await renderDisguise(compress);
    await addFromHome('IMG_0007.JPG');
    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-run'));
    });
    await unmount();

    // A second launch with the same storage.
    await render(<MockHost manifest={compress} host={host} />);
    await fireEvent.press(screen.getByTestId('compress-tabs-history'));
    const row = screen.getByTestId('compress-run-0');
    expect(within(row).getByText('IMG_0007.JPG')).toBeOnTheScreen();
    expect(within(row).getByText('Today · 1 photo')).toBeOnTheScreen();
  });

  it('shows an empty state before the first compression', async () => {
    await renderDisguise(compress);
    await fireEvent.press(screen.getByTestId('compress-tabs-history'));
    expect(screen.getByText('No compressions yet')).toBeOnTheScreen();
  });
});

describe('Settings', () => {
  it('shows the defaults, and About shows only the name and version: no link or email', async () => {
    await renderDisguise(compress);
    await fireEvent.press(screen.getByTestId('compress-tabs-settings'));

    expect(
      within(screen.getByTestId('compress-default-quality')).getByText('70%'),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('compress-default-format')).getByText('Original'),
    ).toBeOnTheScreen();

    const about = screen.getByTestId('compress-about');
    const texts = within(about)
      .queryAllByText(/.*/)
      .map((node) => node.props.children as string);
    console.log('About texts', texts);
    expect(texts).toEqual(['Name', 'Compress', 'Version', packageJson.version]);

    const everything = screen
      .queryAllByText(/.*/)
      .map((node) => String(node.props.children))
      .join('\n');
    expect(everything).not.toMatch(/https?:|www\.|[\w.+-]+@[\w-]+\.\w|\.(com|org|net|app)\b/i);
    expect(everything).not.toMatch(/Help|Privacy|Licen[cs]e|location|camera data/i);
  });
});

describe('Reset', () => {
  it('host reset returns to Home with nothing picked and an empty Target size', async () => {
    const { host } = await renderDisguise(compress);
    await addFromHome('a.jpg');
    await fireEvent.changeText(screen.getByTestId('compress-target-size'), '246810');

    await act(async () => host.reset());
    expect(screen.getByTestId('compress-home')).toBeOnTheScreen();

    pick.mockResolvedValueOnce(picked('b.jpg'));
    await act(async () => {
      await fireEvent.press(screen.getByTestId('compress-add-files'));
    });
    expect(screen.getByText('Files · 1')).toBeOnTheScreen();
    expect(screen.getByTestId('compress-target-size')).toHaveDisplayValue('');
  });
});

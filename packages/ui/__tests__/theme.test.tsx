import { render, screen } from '@testing-library/react-native';
import { Text, useColorScheme } from 'react-native';

import {
  accents,
  DARK,
  defineTheme,
  elevation,
  LIGHT,
  ThemeProvider,
  useTheme,
  type BuiltInThemeId,
  type Theme,
} from '../src';

// Renders the provider and hands back what `useTheme()` returned inside it.
async function resolve(element: (probe: React.ReactNode) => React.ReactElement): Promise<Theme> {
  let seen: Theme | undefined;
  function Probe() {
    seen = useTheme();
    return <Text>{seen.id}</Text>;
  }
  await render(element(<Probe />));
  expect(seen).toBeDefined();
  return seen as Theme;
}

const ids: BuiltInThemeId[] = ['compress', 'sudoku', 'brief'];

// The React Native Jest preset replaces `useColorScheme` with a `jest.fn` returning 'light';
// each test sets the system scheme it needs through it.
const systemScheme = jest.mocked(useColorScheme);

afterEach(() => {
  systemScheme.mockReset();
});

describe('ThemeProvider + useTheme()', () => {
  it.each(ids)('%s resolves the DARK ground and dark accent when the system scheme is dark', async (id) => {
    systemScheme.mockReturnValue('dark');
    const theme = await resolve((probe) => <ThemeProvider theme={id}>{probe}</ThemeProvider>);

    expect(theme.id).toBe(id);
    expect(theme.scheme).toBe('dark');
    expect(theme.colors).toEqual({ ...DARK, ...accents[id].dark });
    expect(theme.elevation).toBeNull();
  });

  it.each(ids)('%s resolves the LIGHT ground and light accent when the system scheme is light', async (id) => {
    systemScheme.mockReturnValue('light');
    const theme = await resolve((probe) => <ThemeProvider theme={id}>{probe}</ThemeProvider>);

    expect(theme.scheme).toBe('light');
    expect(theme.colors).toEqual({ ...LIGHT, ...accents[id].light });
    expect(theme.elevation).toEqual(elevation);
  });

  it('lets the `scheme` prop override the system scheme', async () => {
    systemScheme.mockReturnValue('light');
    const theme = await resolve((probe) => (
      <ThemeProvider theme="sudoku" scheme="dark">
        {probe}
      </ThemeProvider>
    ));

    expect(theme.scheme).toBe('dark');
    expect(theme.colors.bg).toBe(DARK.bg);
  });

  it('resolves a host-supplied theme through the `themes` extension point', async () => {
    const extra = defineTheme({
      light: { accent: '#000001', deep: '#000002' },
      dark: { accent: '#000003', deep: '#000004' },
    });
    systemScheme.mockReturnValue('dark');
    const theme = await resolve((probe) => (
      <ThemeProvider theme="extra" themes={{ extra }}>
        {probe}
      </ThemeProvider>
    ));

    expect(screen.getByText('extra')).toBeOnTheScreen();
    expect(theme.colors).toEqual({ ...DARK, accent: '#000003', deep: '#000004' });
  });

  it('throws when useTheme() has no provider', async () => {
    function Orphan() {
      useTheme();
      return null;
    }
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Orphan />)).rejects.toThrow('useTheme() must be used inside a ThemeProvider');
  });
});

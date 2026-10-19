import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  elevation,
  themes as builtInThemes,
  type BuiltInThemeId,
  type ColorScheme,
  type Palette,
  type ThemeDefinition,
} from './tokens';

/** The active theme, resolved for one colour scheme. */
export interface Theme {
  id: string;
  scheme: ColorScheme;
  colors: Palette;
  /** `boxShadow` strings in light; `null` in dark, where surfaces step up in colour instead. */
  elevation: typeof elevation | null;
  /** Whether Archivo is loaded; pass to `textStyle`/`fontStyle`, which fall back to the system font. */
  archivo: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps<HostThemeId extends string> {
  /** A built-in theme, or one of the ids supplied in `themes`. */
  theme: BuiltInThemeId | NoInfer<HostThemeId>;
  /** Extra themes supplied by the host, keyed by id. */
  themes?: Record<HostThemeId, ThemeDefinition>;
  /** Forces a colour scheme; defaults to the system scheme (light when unknown). */
  scheme?: ColorScheme;
  /**
   * False when the host couldn't load the Archivo files, so text falls back to the system font.
   * Defaults to the enclosing provider's value, or true.
   */
  fontsLoaded?: boolean;
  children: ReactNode;
}

export function ThemeProvider<HostThemeId extends string = never>({
  theme: id,
  themes,
  scheme,
  fontsLoaded,
  children,
}: ThemeProviderProps<HostThemeId>) {
  const systemScheme = useColorScheme();
  const parent = useContext(ThemeContext);
  const archivo = fontsLoaded ?? parent?.archivo ?? true;
  const activeScheme: ColorScheme = scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const definition: ThemeDefinition | undefined =
    (themes as Record<string, ThemeDefinition> | undefined)?.[id] ??
    (builtInThemes as Record<string, ThemeDefinition>)[id];
  if (!definition) throw new Error(`Unknown theme "${id}"`);

  const value = useMemo<Theme>(
    () => ({
      id,
      scheme: activeScheme,
      colors: definition[activeScheme],
      elevation: activeScheme === 'light' ? elevation : null,
      archivo,
    }),
    [id, activeScheme, definition, archivo],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The theme of the nearest `ThemeProvider`. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme() must be used inside a ThemeProvider');
  return theme;
}

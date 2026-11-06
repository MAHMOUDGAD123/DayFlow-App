import React, { createContext, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextStyle, useColorScheme, ViewStyle } from 'react-native';
import { buildPalette, ColorPalette } from './colors';
import { fonts } from './fonts';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  accentColor: string;
  colors: ColorPalette;
  isRTL: boolean;
  dirRow: ViewStyle['flexDirection'];
  textAlign: TextStyle['textAlign'];
  writingDirection: TextStyle['writingDirection'];
  alignStart: ViewStyle['alignSelf'];
  alignEnd: ViewStyle['alignSelf'];
  fonts: typeof fonts;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
}

const defaultAccent = '#3B82F6';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  initialAccent?: string;
}

export function ThemeProvider({
  children,
  initialMode = 'system',
  initialAccent = defaultAccent,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const { i18n } = useTranslation();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);
  const [accentColor, setAccentColor] = useState<string>(initialAccent);

  const isRTL = i18n.language === 'ar';
  const dirRow = (isRTL ? 'row-reverse' : 'row') as ViewStyle['flexDirection'];
  const textAlign = (isRTL ? 'right' : 'left') as TextStyle['textAlign'];
  const writingDirection = (isRTL ? 'rtl' : 'ltr') as TextStyle['writingDirection'];
  const alignStart = (isRTL ? 'flex-end' : 'flex-start') as ViewStyle['alignSelf'];
  const alignEnd = (isRTL ? 'flex-start' : 'flex-end') as ViewStyle['alignSelf'];

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return buildPalette(isDark ? 'dark' : 'light', accentColor);
  }, [isDark, accentColor]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      accentColor,
      colors,
      isRTL,
      dirRow,
      textAlign,
      writingDirection,
      alignStart,
      alignEnd,
      fonts,
      setThemeMode,
      setAccentColor,
    }),
    [
      themeMode,
      isDark,
      accentColor,
      colors,
      isRTL,
      dirRow,
      textAlign,
      writingDirection,
      alignStart,
      alignEnd,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useStyles<T>(
  creator: (colors: ColorPalette, isDark: boolean, isRTL: boolean, fontsObj: typeof fonts) => T,
): T {
  const { colors, isDark, isRTL } = useTheme();
  return useMemo(() => creator(colors, isDark, isRTL, fonts), [colors, isDark, isRTL, creator]);
}

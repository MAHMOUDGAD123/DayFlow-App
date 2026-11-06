import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';

extend([namesPlugin]);

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceBorder: string;
  card: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentText: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  freeSlot: string;
  freeSlotBorder: string;
  timelineNow: string;
  divider: string;
}

export function generateAccentShades(accentColor: string, isDark: boolean) {
  const base = colord(accentColor).isValid() ? colord(accentColor) : colord('#3B82F6');
  
  const accent = base.toHex();
  const accentLight = isDark ? base.darken(0.35).toHex() : base.lighten(0.35).toHex();
  const accentDark = isDark ? base.lighten(0.15).toHex() : base.darken(0.15).toHex();
  
  // Choose white or black text depending on accent contrast
  const accentText = base.isDark() ? '#FFFFFF' : '#111827';

  return {
    accent,
    accentLight,
    accentDark,
    accentText,
  };
}

export const darkPalette: Omit<ColorPalette, 'accent' | 'accentLight' | 'accentDark' | 'accentText'> = {
  background: '#0F1115',
  surface: '#171A21',
  surfaceVariant: '#1F242E',
  surfaceBorder: '#2B313E',
  card: '#1A1E26',
  text: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  danger: '#EF4444',
  dangerLight: '#3B181C',
  dangerBorder: '#7F1D1D',
  success: '#10B981',
  successLight: '#0D3325',
  warning: '#F59E0B',
  warningLight: '#3D2808',
  info: '#3B82F6',
  infoLight: '#122544',
  freeSlot: '#141820',
  freeSlotBorder: '#232836',
  timelineNow: '#EC4899',
  divider: '#262B37',
};

export const lightPalette: Omit<ColorPalette, 'accent' | 'accentLight' | 'accentDark' | 'accentText'> = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceBorder: '#E2E8F0',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  info: '#2563EB',
  infoLight: '#EFF6FF',
  freeSlot: '#F1F5F9',
  freeSlotBorder: '#CBD5E1',
  timelineNow: '#DB2777',
  divider: '#E2E8F0',
};

export function buildPalette(themeMode: 'dark' | 'light', customAccent: string): ColorPalette {
  const isDark = themeMode === 'dark';
  const base = isDark ? darkPalette : lightPalette;
  const shades = generateAccentShades(customAccent, isDark);
  return {
    ...base,
    ...shades,
  };
}

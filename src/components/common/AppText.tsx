import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';

export interface AppTextProps extends RNTextProps {
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

function mapFontWeight(
  fw: string | number | undefined,
): 'regular' | 'medium' | 'semiBold' | 'bold' {
  if (!fw) return 'regular';
  if (fw === 'bold' || fw === '700' || fw === '800' || fw === '900') return 'bold';
  if (fw === '600') return 'semiBold';
  if (fw === '500') return 'medium';
  return 'regular';
}

export function AppText({ style, weight, align, children, ...props }: AppTextProps) {
  const { colors, isRTL } = useTheme();

  const flattened = (StyleSheet.flatten(style) || {}) as TextStyle;
  const fw = weight || (flattened.fontWeight ? mapFontWeight(flattened.fontWeight) : 'regular');

  let fontFamily = fonts.regular;
  if (fw === 'bold') fontFamily = fonts.bold;
  else if (fw === 'semiBold') fontFamily = fonts.semiBold;
  else if (fw === 'medium') fontFamily = fonts.medium;

  const defaultAlign = isRTL ? 'right' : 'left';
  const resolvedAlign = align || flattened.textAlign || defaultAlign;

  return (
    <RNText
      {...props}
      style={[
        styles.defaultStyle,
        {
          color: colors.text,
          textAlign: resolvedAlign,
          writingDirection: isRTL ? 'rtl' : 'ltr',
          fontFamily,
        },
        style,
        {
          fontFamily,
          fontWeight: undefined,
        },
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  defaultStyle: {
    fontSize: 14,
  },
});

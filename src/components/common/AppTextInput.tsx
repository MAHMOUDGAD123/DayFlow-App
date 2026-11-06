import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';

export const AppTextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput(
  { style, placeholderTextColor, multiline, scrollEnabled, ...props },
  ref,
) {
  const { colors, isRTL } = useTheme();

  return (
    <RNTextInput
      ref={ref as any}
      placeholderTextColor={placeholderTextColor || colors.textMuted}
      multiline={multiline}
      scrollEnabled={scrollEnabled !== undefined ? scrollEnabled : !multiline}
      {...props}
      style={[
        styles.base,
        {
          color: colors.text,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.surfaceVariant,
          fontFamily: fonts.regular,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
});

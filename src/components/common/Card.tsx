import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'surface' | 'card' | 'outlined';
}

export function Card({ children, style, onPress, variant = 'card' }: CardProps) {
  const { colors } = useTheme();

  const backgroundColor = variant === 'surface' ? colors.surface : colors.card;
  const borderColor = colors.surfaceBorder;

  const cardStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
});

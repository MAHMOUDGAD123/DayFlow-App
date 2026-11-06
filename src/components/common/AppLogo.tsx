import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface AppLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function AppLogo({ size = 48, style }: AppLogoProps) {
  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      <Image
        source={require('../../../assets/logo.svg')}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

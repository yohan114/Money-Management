import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1 or percentage 0 to 100+
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  height = 8,
  style,
}) => {
  // Normalize to 0-100
  const normalized = progress > 1 ? progress : progress * 100;
  const clamped = Math.min(Math.max(normalized, 0), 100);

  // Auto pick status color if not provided
  const barColor =
    color ||
    (normalized >= 100
      ? COLORS.expense
      : normalized >= 80
      ? COLORS.warning
      : COLORS.income);

  return (
    <View style={[styles.container, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});

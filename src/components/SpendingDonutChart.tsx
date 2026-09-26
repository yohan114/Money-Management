import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Category } from '../types';

interface DonutSlice {
  category: Category;
  total: number;
  percentage: number;
}

interface SpendingDonutChartProps {
  data: DonutSlice[];
  totalExpense: number;
  currencySymbol: string;
  size?: number;
}

export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({
  data,
  totalExpense,
  currencySymbol,
  size = 200,
}) => {
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const slicesWithAngles = React.useMemo(() => {
    return data.slice(0, 6).reduce<
      (DonutSlice & { angleOffset: number; strokeDashoffset: number })[]
    >((accArray, slice) => {
      const lastSlice = accArray[accArray.length - 1];
      const prevAngle = lastSlice
        ? lastSlice.angleOffset + (lastSlice.percentage / 100) * 360
        : 0;
      const strokeDashoffset = circumference - (circumference * slice.percentage) / 100;
      return [
        ...accArray,
        {
          ...slice,
          angleOffset: prevAngle,
          strokeDashoffset,
        },
      ];
    }, []);
  }, [data, circumference]);

  if (totalExpense === 0 || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <View style={[styles.centerTextContainer, { width: size, height: size }]}>
          <Text style={styles.emptyText}>No expenses</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {/* Base background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <G rotation="-90" origin={`${center}, ${center}`}>
            {slicesWithAngles.map((slice, index) => {
              return (
                <Circle
                  key={slice.category.id || index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.category.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(${slice.angleOffset} ${center} ${center})`}
                />
              );
            })}
          </G>
        </Svg>

        <View style={[styles.centerTextContainer, { width: size, height: size }]}>
          <Text style={styles.centerLabel}>Spent</Text>
          <Text style={styles.centerAmount} numberOfLines={1} adjustsFontSizeToFit>
            {currencySymbol}
            {totalExpense.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </Text>
        </View>
      </View>

      {/* Categories Legend */}
      <View style={styles.legendContainer}>
        {data.slice(0, 5).map((item) => (
          <View key={item.category.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.category.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.category.name}
            </Text>
            <Text style={styles.legendPercent}>{item.percentage.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerAmount: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: '65%',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 90,
  },
  legendPercent: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

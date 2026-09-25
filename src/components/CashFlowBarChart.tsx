import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface MonthlyData {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
}

interface CashFlowBarChartProps {
  data: MonthlyData[];
  currencySymbol: string;
  height?: number;
}

export const CashFlowBarChart: React.FC<CashFlowBarChartProps> = ({
  data,
  currencySymbol,
  height = 180,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - SPACING.md * 4;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    500
  );

  const barGroupWidth = chartWidth / data.length;
  const barWidth = Math.min(barGroupWidth * 0.32, 16);
  const chartPlotHeight = height - 40;

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendBadge}>
          <View style={[styles.legendIndicator, { backgroundColor: COLORS.income }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendBadge}>
          <View style={[styles.legendIndicator, { backgroundColor: COLORS.expense }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>

      <Svg width={chartWidth} height={height}>
        {/* Background grid lines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = chartPlotHeight * (1 - pct) + 10;
          return (
            <Line
              key={idx}
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeDasharray="4, 4"
            />
          );
        })}

        {/* Bars */}
        {data.map((d, index) => {
          const groupCenterX = index * barGroupWidth + barGroupWidth / 2;
          const incomeHeight = (d.income / maxVal) * chartPlotHeight;
          const expenseHeight = (d.expense / maxVal) * chartPlotHeight;

          const incomeY = chartPlotHeight - incomeHeight + 10;
          const expenseY = chartPlotHeight - expenseHeight + 10;

          return (
            <React.Fragment key={d.monthKey}>
              {/* Income Bar */}
              <Rect
                x={groupCenterX - barWidth - 2}
                y={incomeY}
                width={barWidth}
                height={Math.max(incomeHeight, 2)}
                fill={COLORS.income}
                rx={RADIUS.xs}
              />
              {/* Expense Bar */}
              <Rect
                x={groupCenterX + 2}
                y={expenseY}
                width={barWidth}
                height={Math.max(expenseHeight, 2)}
                fill={COLORS.expense}
                rx={RADIUS.xs}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Month Labels */}
      <View style={[styles.labelsRow, { width: chartWidth }]}>
        {data.map((d) => (
          <Text key={d.monthKey} style={styles.monthLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  monthLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

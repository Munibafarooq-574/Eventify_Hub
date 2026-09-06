// components/admin/RevenueChart.tsx
//
// Lightweight SVG line chart — no heavy charting library required.
// Requires: react-native-svg (commonly already a dependency of Expo apps).

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Polyline, Circle, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { AdminColors } from "../../constants/AdminColors";
import { RevenueAnalytics, RevenuePoint } from "../../types/admin.types";

type RangeKey = RevenueAnalytics["range"];

interface RevenueChartProps {
  data: RevenueAnalytics;
  onRangeChange?: (range: RangeKey) => void;
  loading?: boolean;
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "12m", label: "12 Months" },
];

const CHART_HEIGHT = 140;
const CHART_WIDTH = 300;
const PADDING = 16;

function buildPolylinePoints(points: RevenuePoint[]): string {
  if (points.length === 0) return "";
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = (CHART_WIDTH - PADDING * 2) / Math.max(points.length - 1, 1);

  return points
    .map((p, i) => {
      const x = PADDING + i * step;
      const y = PADDING + (1 - (p.value - min) / range) * (CHART_HEIGHT - PADDING * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function RevenueChart({ data, onRangeChange, loading }: RevenueChartProps) {
  const [activeRange, setActiveRange] = useState<RangeKey>(data.range);

  const polylinePoints = useMemo(() => buildPolylinePoints(data.points), [data.points]);
  const lastPoint = data.points[data.points.length - 1];

  const handleRangePress = (range: RangeKey) => {
    setActiveRange(range);
    onRangeChange?.(range);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Revenue Overview</Text>
      </View>

      <View style={styles.tabRow}>
        {RANGES.map((r) => {
          const active = activeRange === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => handleRangePress(r.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.totalValue}>{data.totalLabel}</Text>

      {loading ? (
        <View style={[styles.chartArea, styles.chartLoading]}>
          <Text style={styles.mutedText}>Loading…</Text>
        </View>
      ) : data.points.length === 0 ? (
        <View style={[styles.chartArea, styles.chartLoading]}>
          <Text style={styles.mutedText}>No revenue data yet</Text>
        </View>
      ) : (
        <View style={styles.chartArea}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <SvgLine
              x1={PADDING}
              y1={CHART_HEIGHT - PADDING}
              x2={CHART_WIDTH - PADDING}
              y2={CHART_HEIGHT - PADDING}
              stroke={AdminColors.border}
              strokeWidth={1}
            />
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={AdminColors.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {lastPoint && (
              <Circle
                cx={CHART_WIDTH - PADDING}
                cy={
                  PADDING +
                  (1 -
                    (lastPoint.value - Math.min(...data.points.map((p) => p.value))) /
                      (Math.max(...data.points.map((p) => p.value)) -
                        Math.min(...data.points.map((p) => p.value)) || 1)) *
                    (CHART_HEIGHT - PADDING * 2)
                }
                r={4}
                fill={AdminColors.primary}
              />
            )}
          </Svg>

          <View style={styles.axisLabels}>
            {data.points.map((p, i) => (
              <Text key={`${p.label}-${i}`} style={styles.axisLabel} numberOfLines={1}>
                {p.label}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: AdminColors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: AdminColors.card,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: "500",
  },
  tabTextActive: {
    color: AdminColors.primary,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: AdminColors.text,
    marginBottom: 8,
  },
  chartArea: {
    alignItems: "center",
  },
  chartLoading: {
    height: CHART_HEIGHT,
    justifyContent: "center",
  },
  mutedText: {
    color: AdminColors.textMuted,
    fontSize: 13,
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: CHART_WIDTH - PADDING * 2,
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 10,
    color: AdminColors.textMuted,
  },
});
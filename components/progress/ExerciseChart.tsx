// =============================================================================
// ExerciseChart — per-exercise top-set weight over time.
// Hand-rolled SVG line chart. Handles <2 data points with an empty state.
// =============================================================================

import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { format } from "date-fns";

import type { LoggedSet, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { spacing, typography } from "@/constants/layout";
import { displayWeight } from "@/utils/formatters";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  sets: LoggedSet[];
  unit: WeightUnit;
}

const VW = 300;
const VH = 180;
const PAD = 24;

export function ExerciseChart({ sets, unit }: Props) {
  // Keep only completed working sets.
  const working = sets.filter((s) => s.completed && s.setType === "normal");

  // Group by workoutId -> pick max weight per session.
  const byWorkout = new Map<string, { weight: number; timestamp: string }>();
  for (const s of working) {
    const existing = byWorkout.get(s.workoutId);
    if (!existing || s.weight > existing.weight) {
      byWorkout.set(s.workoutId, { weight: s.weight, timestamp: s.timestamp });
    }
  }

  const points = Array.from(byWorkout.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (points.length < 2) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <EmptyState
          title="Not enough data yet"
          subtitle="Log at least two sessions of this exercise to see a trend."
        />
      </View>
    );
  }

  const values = points.map((p) => displayWeight(p.weight, unit));
  const maxV = Math.max(...values) * 1.1;
  const minV = 0;

  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  const xFor = (i: number) =>
    PAD + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const yFor = (v: number) => PAD + innerH - ((v - minV) / (maxV - minV)) * innerH;

  // Build smooth polyline path.
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`)
    .join(" ");

  // Y-axis grid ticks (4 intervals = 5 lines).
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + (maxV - minV) * t);

  // X labels — at most ~4 labels across.
  const labelEvery = Math.max(1, Math.ceil(points.length / 4));

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm }}>
      <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {/* Grid */}
        <G>
          {gridTicks.map((t, i) => (
            <Line
              key={`grid-${i}`}
              x1={PAD}
              x2={VW - PAD}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          ))}
        </G>

        {/* Y labels */}
        <G>
          {gridTicks.map((t, i) => (
            <SvgText
              key={`yl-${i}`}
              x={PAD - 4}
              y={yFor(t) + 3}
              fontSize={10}
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {Math.round(t)}
            </SvgText>
          ))}
        </G>

        {/* Line */}
        <Path d={d} stroke={colors.primary} strokeWidth={2} fill="none" />

        {/* Points */}
        {values.map((v, i) => (
          <Circle
            key={`pt-${i}`}
            cx={xFor(i)}
            cy={yFor(v)}
            r={4}
            fill={colors.primary}
          />
        ))}

        {/* X labels */}
        <G>
          {points.map((p, i) => {
            if (i % labelEvery !== 0 && i !== points.length - 1) return null;
            return (
              <SvgText
                key={`xl-${i}`}
                x={xFor(i)}
                y={VH - PAD + 14}
                fontSize={10}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                {format(new Date(p.timestamp), "MMM d")}
              </SvgText>
            );
          })}
        </G>
      </Svg>

      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: spacing["2xs"],
        }}
      >
        Top set weight ({unit})
      </Text>
    </View>
  );
}

export default ExerciseChart;

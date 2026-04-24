// =============================================================================
// OneRMChart — estimated 1RM trend using Epley formula: w * (1 + reps/30).
// Same visual language as ExerciseChart; secondary-colored line.
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

function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export function OneRMChart({ sets, unit }: Props) {
  const working = sets.filter(
    (s) => s.completed && s.setType === "normal" && s.weight > 0 && s.completedReps > 0,
  );

  // Group by workoutId -> keep max e1RM per session.
  const byWorkout = new Map<string, { e1rm: number; timestamp: string }>();
  for (const s of working) {
    const v = epley(s.weight, s.completedReps);
    const existing = byWorkout.get(s.workoutId);
    if (!existing || v > existing.e1rm) {
      byWorkout.set(s.workoutId, { e1rm: v, timestamp: s.timestamp });
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
          subtitle="At least two sessions of logged normal sets are needed for the e1RM trend."
        />
      </View>
    );
  }

  const values = points.map((p) => displayWeight(p.e1rm, unit));
  const maxV = Math.max(...values) * 1.1;
  const minV = 0;

  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  const xFor = (i: number) =>
    PAD + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const yFor = (v: number) => PAD + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`)
    .join(" ");

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + (maxV - minV) * t);
  const labelEvery = Math.max(1, Math.ceil(points.length / 4));

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm }}>
      <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
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

        <Path d={d} stroke={colors.secondary} strokeWidth={2} fill="none" />

        {values.map((v, i) => (
          <Circle
            key={`pt-${i}`}
            cx={xFor(i)}
            cy={yFor(v)}
            r={4}
            fill={colors.secondary}
          />
        ))}

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
        Estimated 1RM ({unit}) — Epley
      </Text>
    </View>
  );
}

export default OneRMChart;

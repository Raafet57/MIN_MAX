// =============================================================================
// VolumeChart — weekly sets stacked by muscle group.
// 12 bars (weeks 1-12), each stacked by muscle color.
// =============================================================================

import React from "react";
import { View, Text } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import type { LoggedSet, MuscleGroup } from "@/types";
import { colors } from "@/constants/colors";
import { spacing, typography } from "@/constants/layout";
import { MUSCLE_GROUPS } from "@/data/muscleGroups";
import { PROGRAM } from "@/data/program";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  workoutsPerWeek: Record<number, LoggedSet[]>;
}

const VW = 350;
const VH = 220;
const PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;
const TOTAL_WEEKS = 12;

// Build exercise -> targetMuscles lookup from PROGRAM once.
function buildExerciseMuscleMap(): Record<string, MuscleGroup[]> {
  const map: Record<string, MuscleGroup[]> = {};
  for (const day of PROGRAM.days) {
    for (const ex of day.exercises) {
      map[ex.id] = ex.targetMuscles;
    }
  }
  return map;
}

const MUSCLE_ORDER: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "forearms",
  "abs",
];

export function VolumeChart({ workoutsPerWeek }: Props) {
  const exerciseMap = buildExerciseMuscleMap();

  // weekCounts[week][muscle] = set count.
  const weekCounts: Record<number, Record<string, number>> = {};
  let totalAll = 0;

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    weekCounts[w] = {};
    const sets = workoutsPerWeek[w] ?? [];
    for (const s of sets) {
      if (!s.completed || s.setType === "warmup") continue;
      const muscles = exerciseMap[s.exerciseId] ?? [];
      for (const m of muscles) {
        weekCounts[w][m] = (weekCounts[w][m] ?? 0) + 1;
        totalAll += 1;
      }
    }
  }

  if (totalAll === 0) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <EmptyState
          title="No volume data yet"
          subtitle="Complete some workouts to see weekly set counts broken down by muscle."
        />
      </View>
    );
  }

  const weekTotals = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const wk = i + 1;
    return Object.values(weekCounts[wk]).reduce((a, b) => a + b, 0);
  });
  const maxTotal = Math.max(...weekTotals, 1) * 1.1;

  const innerW = VW - PAD_X * 2;
  const innerH = VH - PAD_TOP - PAD_BOTTOM;
  const barWidth = (innerW / TOTAL_WEEKS) * 0.7;
  const gap = innerW / TOTAL_WEEKS;

  const yFor = (v: number) => PAD_TOP + innerH - (v / maxTotal) * innerH;

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxTotal * t);

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm }}>
      <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {/* Grid */}
        <G>
          {gridTicks.map((t, i) => (
            <Line
              key={`g-${i}`}
              x1={PAD_X}
              x2={VW - PAD_X}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          ))}
          {gridTicks.map((t, i) => (
            <SvgText
              key={`yl-${i}`}
              x={PAD_X - 4}
              y={yFor(t) + 3}
              fontSize={10}
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {Math.round(t)}
            </SvgText>
          ))}
        </G>

        {/* Stacked bars */}
        <G>
          {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((wk, idx) => {
            const xCenter = PAD_X + gap * (idx + 0.5);
            const x = xCenter - barWidth / 2;
            let stackTop = PAD_TOP + innerH;
            const counts = weekCounts[wk];

            return (
              <G key={`w-${wk}`}>
                {MUSCLE_ORDER.map((mg) => {
                  const c = counts[mg] ?? 0;
                  if (c === 0) return null;
                  const h = (c / maxTotal) * innerH;
                  const y = stackTop - h;
                  stackTop = y;
                  return (
                    <Rect
                      key={`b-${wk}-${mg}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      fill={MUSCLE_GROUPS[mg].color}
                      rx={1}
                    />
                  );
                })}
                {/* Week label */}
                <SvgText
                  x={xCenter}
                  y={VH - PAD_BOTTOM + 12}
                  fontSize={10}
                  fill={colors.textTertiary}
                  textAnchor="middle"
                >
                  {wk}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.xs,
          justifyContent: "center",
          marginTop: spacing.xs,
        }}
      >
        {MUSCLE_ORDER.map((mg) => (
          <View
            key={`lg-${mg}`}
            style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: MUSCLE_GROUPS[mg].color,
                marginRight: 4,
              }}
            />
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>
              {MUSCLE_GROUPS[mg].shortName}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default VolumeChart;

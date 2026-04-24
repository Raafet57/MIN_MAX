// =============================================================================
// BodyChart — body weight over time with 7-day moving average + goal line.
// =============================================================================

import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { format } from "date-fns";

import type { BodyMetric, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { spacing, typography } from "@/constants/layout";
import { displayWeight } from "@/utils/formatters";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  metrics: BodyMetric[];
  goalWeightKg?: number;
  unit: WeightUnit;
}

const VW = 320;
const VH = 200;
const PAD = 24;

function movingAverage(vals: number[], window = 7): number[] {
  return vals.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = vals.slice(start, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / slice.length;
  });
}

export function BodyChart({ metrics, goalWeightKg, unit }: Props) {
  const pts = metrics
    .filter((m) => m.weight != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (pts.length < 2) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <EmptyState
          title="Not enough data yet"
          subtitle="Log at least two body weight entries to see a trend."
        />
      </View>
    );
  }

  const values = pts.map((p) => displayWeight(p.weight as number, unit));
  const ma = movingAverage(values, 7);
  const goal = goalWeightKg != null ? displayWeight(goalWeightKg, unit) : undefined;

  const seriesMin = Math.min(...values, ...(goal != null ? [goal] : []));
  const seriesMax = Math.max(...values, ...(goal != null ? [goal] : []));
  const pad = Math.max(1, (seriesMax - seriesMin) * 0.15);
  const minV = Math.max(0, seriesMin - pad);
  const maxV = seriesMax + pad;

  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  const xFor = (i: number) =>
    PAD + (pts.length === 1 ? innerW / 2 : (i * innerW) / (pts.length - 1));
  const yFor = (v: number) => PAD + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`)
    .join(" ");

  const maPath = ma
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`)
    .join(" ");

  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + (maxV - minV) * t);
  const labelEvery = Math.max(1, Math.ceil(pts.length / 4));

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm }}>
      <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {/* Grid */}
        <G>
          {gridTicks.map((t, i) => (
            <Line
              key={`g-${i}`}
              x1={PAD}
              x2={VW - PAD}
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
              x={PAD - 4}
              y={yFor(t) + 3}
              fontSize={10}
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {(Math.round(t * 10) / 10).toFixed(0)}
            </SvgText>
          ))}
        </G>

        {/* Goal weight dashed line */}
        {goal != null && goal >= minV && goal <= maxV ? (
          <G>
            <Line
              x1={PAD}
              x2={VW - PAD}
              y1={yFor(goal)}
              y2={yFor(goal)}
              stroke={colors.warning}
              strokeWidth={1.5}
              strokeDasharray="5,4"
            />
            <SvgText
              x={VW - PAD - 2}
              y={yFor(goal) - 4}
              fontSize={10}
              fill={colors.warning}
              textAnchor="end"
            >
              {`Goal ${goal} ${unit}`}
            </SvgText>
          </G>
        ) : null}

        {/* 7-day moving average — dashed secondary */}
        <Path
          d={maPath}
          stroke={colors.secondary}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          fill="none"
        />

        {/* Raw weight line — success */}
        <Path d={linePath} stroke={colors.success} strokeWidth={2} fill="none" />

        {/* Points */}
        {values.map((v, i) => (
          <Circle key={`p-${i}`} cx={xFor(i)} cy={yFor(v)} r={3} fill={colors.success} />
        ))}

        {/* X labels */}
        <G>
          {pts.map((p, i) => {
            if (i % labelEvery !== 0 && i !== pts.length - 1) return null;
            return (
              <SvgText
                key={`xl-${i}`}
                x={xFor(i)}
                y={VH - PAD + 14}
                fontSize={10}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                {format(new Date(p.date), "MMM d")}
              </SvgText>
            );
          })}
        </G>
      </Svg>

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing["2xs"], gap: spacing.sm }}>
        <Legend color={colors.success} label="Weight" />
        <Legend color={colors.secondary} label="7-day avg" />
        {goal != null ? <Legend color={colors.warning} label="Goal" /> : null}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          width: 10,
          height: 2,
          backgroundColor: color,
          marginRight: 4,
        }}
      />
      <Text style={{ ...typography.caption, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}

export default BodyChart;

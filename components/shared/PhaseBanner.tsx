import React from "react";
import { View, Text } from "react-native";

import type { PhaseId } from "@/types";
import { colors, phaseColors } from "@/constants/colors";
import { getPhaseById } from "@/data/phases";
import { typography, spacing, radius } from "@/constants/layout";

interface Props {
  week: number;
  phaseId: PhaseId;
  description?: string;
}

const TOTAL_WEEKS = 12;

/**
 * Dashboard / workout-header banner. Shows week + phase name large + description +
 * progress-bar showing week/12.
 */
export function PhaseBanner({ week, phaseId, description }: Props) {
  const phase = getPhaseById(phaseId);
  const color = phaseColors[phaseId];
  const desc = description ?? phase.description;
  const pct = Math.min(1, Math.max(0, week / TOTAL_WEEKS));

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            ...typography.display,
            color: colors.textPrimary,
          }}
        >
          {`Week ${week}`}
        </Text>
        <Text
          style={{
            ...typography.h2,
            color,
          }}
        >
          {phase.name}
        </Text>
      </View>

      <Text
        style={{
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginTop: spacing["2xs"],
        }}
        numberOfLines={2}
      >
        {desc}
      </Text>

      {/* Progress bar */}
      <View
        style={{
          marginTop: spacing.sm,
          height: 6,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.pill,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: radius.pill,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
          {`${week} / ${TOTAL_WEEKS}`}
        </Text>
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
          {`${TOTAL_WEEKS - week} weeks left`}
        </Text>
      </View>
    </View>
  );
}

export default PhaseBanner;

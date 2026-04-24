import React from "react";
import { View, Text } from "react-native";

import type { PhaseId } from "@/types";
import { phaseColors } from "@/constants/colors";
import { getPhaseById } from "@/data/phases";
import { typography, spacing, radius } from "@/constants/layout";

interface Props {
  week: number;
  phaseId: PhaseId;
}

/**
 * Compact pill: "Week 3 • Base" in phase-tinted color.
 */
export function WeekBadge({ week, phaseId }: Props) {
  const color = phaseColors[phaseId];
  const phase = getPhaseById(phaseId);
  // 15% opacity background: append "26" to hex (38/255 ~ 15%).
  const bg = `${color}26`;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: color,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          ...typography.caption,
          color,
        }}
      >
        {`Week ${week} • ${phase.name}`}
      </Text>
    </View>
  );
}

export default WeekBadge;

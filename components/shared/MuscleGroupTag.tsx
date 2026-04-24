import React from "react";
import { View, Text } from "react-native";

import type { MuscleGroup } from "@/types";
import { MUSCLE_GROUPS } from "@/data/muscleGroups";
import { typography, spacing, radius } from "@/constants/layout";

interface Props {
  group: MuscleGroup;
}

/**
 * Small colored pill for muscle group labelling. Uses the group's theme color at
 * low-opacity background + full-color text.
 */
export function MuscleGroupTag({ group }: Props) {
  const info = MUSCLE_GROUPS[group];
  // 12% opacity background: append "1F" to hex (31/255 ~ 12%).
  const bg = `${info.color}1F`;

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          ...typography.caption,
          color: info.color,
        }}
      >
        {info.shortName}
      </Text>
    </View>
  );
}

export default MuscleGroupTag;

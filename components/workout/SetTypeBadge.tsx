import React from "react";
import { View, Text } from "react-native";

import type { SetType } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";

interface Props {
  type: SetType;
  label?: string;
}

interface ToneSpec {
  color: string;
  text: string;
}

function specFor(type: SetType, label?: string): ToneSpec | null {
  switch (type) {
    case "partial":
      return { color: colors.tertiary, text: label ?? "Partial" };
    case "dropset":
      return { color: colors.warning, text: label ?? "Dropset" };
    case "myorep":
      return { color: colors.secondary, text: label ?? "Myorep" };
    case "warmup":
      return { color: colors.textTertiary, text: label ?? "Warmup" };
    case "normal":
    default:
      return null;
  }
}

/**
 * Pill label for a non-normal set type. Returns null for normal sets.
 */
export function SetTypeBadge({ type, label }: Props) {
  const spec = specFor(type, label);
  if (!spec) return null;

  // 12% opacity background (append "1F").
  const bg = `${spec.color}1F`;

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
          color: spec.color,
        }}
      >
        {spec.text}
      </Text>
    </View>
  );
}

export default SetTypeBadge;

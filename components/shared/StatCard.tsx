import React from "react";
import { View, Text } from "react-native";

import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";

type Tone = "default" | "success" | "error" | "warning" | "primary";

interface Props {
  label: string;
  value: string;
  trend?: string;
  tone?: Tone;
}

function toneColor(tone: Tone): string {
  switch (tone) {
    case "success":
      return colors.success;
    case "error":
      return colors.error;
    case "warning":
      return colors.warning;
    case "primary":
      return colors.primary;
    default:
      return colors.textPrimary;
  }
}

/**
 * Reusable metric card: caption label + big data value + optional trend.
 */
export function StatCard({ label, value, trend, tone = "default" }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        flex: 1,
      }}
    >
      <Text
        style={{
          ...typography.overline,
          color: colors.textSecondary,
          marginBottom: spacing["2xs"],
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          ...typography.dataLarge,
          color: toneColor(tone),
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {trend ? (
        <Text
          style={{
            ...typography.bodySmall,
            color: tone === "default" ? colors.textSecondary : toneColor(tone),
            marginTop: spacing["2xs"],
          }}
        >
          {trend}
        </Text>
      ) : null}
    </View>
  );
}

export default StatCard;

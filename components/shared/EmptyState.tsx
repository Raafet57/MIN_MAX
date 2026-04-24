import React from "react";
import { View, Text, Pressable } from "react-native";

import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";

interface Action {
  label: string;
  onPress(): void;
}

interface Props {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: Action;
}

/**
 * Centered placeholder for any no-data screen.
 */
export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
      }}
    >
      {icon ? <View style={{ marginBottom: spacing.md }}>{icon}</View> : null}
      <Text
        style={{
          ...typography.h2,
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: spacing.xs,
            maxWidth: 320,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text
            style={{
              ...typography.h3,
              color: colors.textPrimary,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default EmptyState;

import React from "react";
import { Modal, Pressable, View, Text } from "react-native";

import type { RPE } from "@/types";
import { colors, rpeColors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { RPE_DESCRIPTIONS } from "@/utils/rpe";

interface Props {
  visible: boolean;
  currentRpe?: number | null;
  onSelect(rpe: RPE | null): void;
  onClose(): void;
}

const OPTIONS: RPE[] = [7, 8, 9, 10];

/**
 * Bottom-sheet RPE picker. Four large rows (7-10) plus a "use target" option.
 */
export function RPESelector({ visible, currentRpe, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
      />

      {/* Sheet */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.md,
          paddingBottom: spacing.xl,
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Grab handle */}
        <View
          style={{
            alignSelf: "center",
            width: 40,
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.ghost,
            marginBottom: spacing.md,
          }}
        />

        <Text
          style={{
            ...typography.h2,
            color: colors.textPrimary,
            marginBottom: spacing.sm,
          }}
        >
          Rate of Perceived Exertion
        </Text>

        {OPTIONS.map((rpe) => {
          const color = rpeColors[rpe];
          const desc = RPE_DESCRIPTIONS[rpe];
          const isSelected = currentRpe === rpe;
          return (
            <Pressable
              key={rpe}
              onPress={() => onSelect(rpe)}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.xs,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: pressed
                  ? `${color}33`
                  : isSelected
                  ? `${color}33`
                  : `${color}26`,
                borderWidth: isSelected ? 2 : 0,
                borderColor: color,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    ...typography.dataLarge,
                    fontSize: 22,
                    color,
                    width: 48,
                  }}
                >
                  {`@${rpe}`}
                </Text>
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text
                    style={{
                      ...typography.h3,
                      color,
                    }}
                  >
                    {desc.short}
                  </Text>
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {desc.long}
                  </Text>
                </View>
              </View>
              <Text style={{ ...typography.caption, color }}>
                {`${desc.repsInReserve} RIR`}
              </Text>
            </Pressable>
          );
        })}

        {/* Skip / use target */}
        <Pressable
          onPress={() => onSelect(null)}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceElevated,
            marginTop: spacing.xs,
          })}
        >
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
            }}
          >
            Skip RPE (use target)
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default RPESelector;

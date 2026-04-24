import React from "react";
import { Pressable, View, Text } from "react-native";
import { Check, StickyNote } from "lucide-react-native";

import type { LoggedSet, SetDefinition, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { displayWeight, formatRepRange } from "@/utils/formatters";
import { rpeColor } from "@/utils/rpe";
import { WeightInput } from "@/components/workout/WeightInput";
import { RepInput } from "@/components/workout/RepInput";
import { SetTypeBadge } from "@/components/workout/SetTypeBadge";

interface Props {
  set: LoggedSet;
  programSet: SetDefinition;
  previous?: LoggedSet;
  onUpdate(patch: Partial<LoggedSet>): void;
  onToggleComplete(): void;
  onOpenRpeSelector(): void;
  unit: WeightUnit;
  isActive?: boolean;
}

function previousText(previous: LoggedSet | undefined, programSet: SetDefinition, unit: WeightUnit): string {
  if (previous && previous.completed) {
    const w = displayWeight(previous.weight, unit);
    const rpe = previous.actualRpe ?? previous.targetRpe;
    return `${w} × ${previous.completedReps} @${rpe}`;
  }
  return `${formatRepRange(programSet.reps[0], programSet.reps[1])} @${programSet.rpe}`;
}

/**
 * One row of the working-set table inside an ExerciseCard.
 *
 * Layout (flex widths): SET (10) | PREVIOUS (25) | KG (22) | REPS (15) | RPE (15) | CHECK (13)
 */
export function SetRow({
  set,
  programSet,
  previous,
  onUpdate,
  onToggleComplete,
  onOpenRpeSelector,
  unit,
  isActive = false,
}: Props) {
  const rowBg = set.completed
    ? colors.successMuted
    : set.skipped
    ? colors.errorMuted
    : "transparent";
  const rpe = set.actualRpe ?? programSet.rpe;
  const rpeHex = rpeColor(rpe);

  const showTypeBadge =
    set.setType !== "normal" && set.setType !== "warmup";

  return (
    <View
      style={{
        minHeight: 52,
        backgroundColor: rowBg,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing["2xs"],
        borderLeftWidth: isActive && !set.completed && !set.skipped ? 2 : 0,
        borderLeftColor: colors.primary,
        marginBottom: spacing["2xs"],
      }}
    >
      {showTypeBadge ? (
        <View style={{ flexDirection: "row", marginBottom: 2 }}>
          <SetTypeBadge type={set.setType} label={programSet.label} />
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* SET # */}
        <View style={{ flex: 10, alignItems: "center" }}>
          <Text
            style={{
              ...typography.dataSmall,
              color: colors.textSecondary,
              textDecorationLine: set.skipped ? "line-through" : "none",
            }}
          >
            {set.setIndex + 1}
          </Text>
        </View>

        {/* PREVIOUS */}
        <View style={{ flex: 25, paddingRight: spacing["2xs"] }}>
          <Text
            style={{
              ...typography.dataSmall,
              color: colors.ghost,
              fontStyle: "italic",
              textDecorationLine: set.skipped ? "line-through" : "none",
            }}
            numberOfLines={1}
          >
            {previousText(previous, programSet, unit)}
          </Text>
        </View>

        {/* KG */}
        <View style={{ flex: 22, paddingHorizontal: 2 }}>
          <WeightInput
            value={set.weight}
            unit={unit}
            increment={1}
            onChange={(w) => onUpdate({ weight: w })}
            placeholder="—"
          />
        </View>

        {/* REPS */}
        <View style={{ flex: 15, paddingHorizontal: 2 }}>
          <RepInput
            value={set.completedReps}
            onChange={(r) => onUpdate({ completedReps: r })}
            placeholder="—"
          />
        </View>

        {/* RPE */}
        <View style={{ flex: 15, paddingHorizontal: 2 }}>
          <Pressable
            onPress={onOpenRpeSelector}
            style={({ pressed }) => ({
              height: 40,
              minWidth: 40,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: pressed ? `${rpeHex}33` : `${rpeHex}1F`,
              borderWidth: 1,
              borderColor: rpeHex,
            })}
          >
            <Text
              style={{
                ...typography.bodySmall,
                color: rpeHex,
                fontWeight: "600",
              }}
            >
              {`@${rpe}`}
            </Text>
          </Pressable>
        </View>

        {/* CHECK + NOTE */}
        <View
          style={{
            flex: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
          }}
        >
          <View style={{ width: 16, alignItems: "center" }}>
            {set.notes ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.secondary,
                }}
              />
            ) : (
              <StickyNote size={12} color={colors.textTertiary} />
            )}
          </View>

          <Pressable
            onPress={onToggleComplete}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: set.completed ? 0 : 2,
              borderColor: colors.borderActive,
              backgroundColor: set.completed
                ? pressed
                  ? "#3EBC68"
                  : colors.success
                : pressed
                ? colors.surfaceOverlay
                : "transparent",
            })}
          >
            {set.completed ? (
              <Check size={20} color={colors.textInverse} strokeWidth={3} />
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default SetRow;

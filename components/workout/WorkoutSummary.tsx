import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Text,
} from "react-native";
import { ArrowDown, ArrowUp, Trophy, X } from "lucide-react-native";

import type {
  LoggedSet,
  PRNotification,
  ProgressionChange,
  SessionFeeling,
  WeightUnit,
  Workout,
} from "@/types";
import { colors, feelingColors, feelingEmoji } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { formatDuration, formatVolume, formatWeight } from "@/utils/formatters";
import { StatCard } from "@/components/shared/StatCard";
import { WeekBadge } from "@/components/shared/WeekBadge";

interface Props {
  visible: boolean;
  workout: Workout;
  loggedSets: LoggedSet[];
  changes: ProgressionChange[];
  prs: PRNotification[];
  unit: WeightUnit;
  feeling?: SessionFeeling;
  onFeelingChange(f: SessionFeeling): void;
  notes: string;
  onNotesChange(n: string): void;
  onClose(): void;
  onSave(): void;
}

const FEELINGS: SessionFeeling[] = [1, 2, 3, 4, 5];

export function WorkoutSummary({
  visible,
  workout,
  loggedSets,
  changes,
  prs,
  unit,
  feeling,
  onFeelingChange,
  notes,
  onNotesChange,
  onClose,
  onSave,
}: Props) {
  const completed = loggedSets.filter((s) => s.completed).length;
  const total = loggedSets.length;
  const volume = loggedSets.reduce(
    (acc, s) => (s.completed ? acc + s.weight * s.completedReps : acc),
    0,
  );
  const durationSec =
    workout.durationSeconds ??
    (workout.completedAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(workout.completedAt).getTime() -
              new Date(workout.startedAt).getTime()) /
              1000,
          ),
        )
      : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View
          style={{
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.sm,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.overline, color: colors.textSecondary }}>
              WORKOUT COMPLETE
            </Text>
            <Text
              style={{
                ...typography.display,
                color: colors.textPrimary,
                marginTop: spacing["2xs"],
              }}
            >
              {workout.dayName}
            </Text>
            <View style={{ marginTop: spacing.xs }}>
              <WeekBadge week={workout.weekNumber} phaseId={workout.phase} />
            </View>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              padding: spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <X size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing["2xl"],
          }}
        >
          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              gap: spacing.xs,
            }}
          >
            <StatCard label="Duration" value={formatDuration(durationSec)} />
            <StatCard
              label="Sets"
              value={`${completed}/${total}`}
              tone={completed === total ? "success" : "default"}
            />
            <StatCard
              label="Volume"
              value={formatVolume(volume, unit)}
              tone="primary"
            />
          </View>

          {/* Feeling */}
          <View style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                ...typography.overline,
                color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}
            >
              HOW DID IT FEEL?
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {FEELINGS.map((f) => {
                const selected = feeling === f;
                const color = feelingColors[f];
                return (
                  <Pressable
                    key={f}
                    onPress={() => onFeelingChange(f)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 56,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected
                        ? `${color}26`
                        : pressed
                        ? colors.surfaceOverlay
                        : colors.surface,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? color : colors.border,
                    })}
                  >
                    <Text style={{ fontSize: 24 }}>{feelingEmoji[f]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                ...typography.overline,
                color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}
            >
              SESSION NOTES
            </Text>
            <TextInput
              value={notes}
              onChangeText={onNotesChange}
              multiline
              placeholder="How was the session? Energy? Pains? Wins?"
              placeholderTextColor={colors.textTertiary}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.sm,
                minHeight: 88,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* PRs */}
          {prs.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text
                style={{
                  ...typography.overline,
                  color: colors.prGold,
                  marginBottom: spacing.xs,
                }}
              >
                NEW PERSONAL RECORDS
              </Text>
              {prs.map((pr, i) => (
                <View
                  key={`${pr.exerciseId}-${pr.prType}-${i}`}
                  style={{
                    backgroundColor: `${colors.prGold}1F`,
                    borderWidth: 1,
                    borderColor: colors.prGold,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.xs,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Trophy size={22} color={colors.prGold} />
                  <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.prGold,
                      }}
                    >
                      {`NEW PR — ${pr.exerciseName}`}
                    </Text>
                    <Text
                      style={{
                        ...typography.h3,
                        color: colors.textPrimary,
                        marginTop: 2,
                      }}
                    >
                      {prValueString(pr, unit)}
                    </Text>
                    {pr.previousValue !== undefined ? (
                      <Text
                        style={{
                          ...typography.caption,
                          color: colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {`Previous: ${prPreviousString(pr, unit)}`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Progression changes */}
          {changes.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text
                style={{
                  ...typography.overline,
                  color: colors.textSecondary,
                  marginBottom: spacing.xs,
                }}
              >
                PROGRESSION
              </Text>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                }}
              >
                {changes.map((c) => (
                  <ChangeRow key={c.exerciseId} change={c} unit={unit} />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Save */}
        <View
          style={{
            padding: spacing.md,
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <Pressable
            onPress={onSave}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              alignItems: "center",
              minHeight: 48,
              justifyContent: "center",
            })}
          >
            <Text
              style={{
                ...typography.h3,
                color: colors.textPrimary,
                fontWeight: "700",
              }}
            >
              Save & Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function prValueString(pr: PRNotification, unit: WeightUnit): string {
  if (pr.prType === "weight") {
    if (pr.weight !== undefined && pr.reps !== undefined) {
      return `${formatWeight(pr.weight, unit)} × ${pr.reps}`;
    }
    return formatWeight(pr.value, unit);
  }
  if (pr.prType === "reps" && pr.weight !== undefined) {
    return `${pr.value} reps @ ${formatWeight(pr.weight, unit)}`;
  }
  if (pr.prType === "volume") {
    return formatVolume(pr.value, unit);
  }
  if (pr.prType === "estimated1rm") {
    return `e1RM ${formatWeight(pr.value, unit)}`;
  }
  return String(pr.value);
}

function prPreviousString(pr: PRNotification, unit: WeightUnit): string {
  const v = pr.previousValue ?? 0;
  if (pr.prType === "reps") return `${v} reps`;
  if (pr.prType === "volume") return formatVolume(v, unit);
  return formatWeight(v, unit);
}

function ChangeRow({
  change,
  unit,
}: {
  change: ProgressionChange;
  unit: WeightUnit;
}) {
  const icon = (() => {
    switch (change.type) {
      case "increase":
        return <ArrowUp size={16} color={colors.success} />;
      case "revert":
        return <ArrowDown size={16} color={colors.warning} />;
      case "stay":
        return (
          <Text style={{ color: colors.textSecondary, width: 16, textAlign: "center" }}>
            —
          </Text>
        );
      case "firstTime":
        return <Text style={{ fontSize: 14 }}>🆕</Text>;
      case "deload":
        return <Text style={{ fontSize: 14 }}>🧊</Text>;
      default:
        return null;
    }
  })();

  const changeText = (() => {
    if (change.type === "firstTime") {
      return `Baseline set at ${formatWeight(change.newWeight, unit)}`;
    }
    if (change.type === "deload") {
      return `Deload — ${formatWeight(change.newWeight, unit)} held`;
    }
    if (change.type === "stay") {
      return `Hold ${formatWeight(change.newWeight, unit)}`;
    }
    const prev = formatWeight(change.previousWeight, unit);
    const next = formatWeight(change.newWeight, unit);
    let tail = `${prev} → ${next}`;
    if (
      change.type === "revert" &&
      change.newRepsLow !== undefined &&
      change.newRepsHigh !== undefined
    ) {
      tail += `  • reps ${change.newRepsLow}-${change.newRepsHigh}`;
    }
    return tail;
  })();

  const color = (() => {
    switch (change.type) {
      case "increase":
        return colors.success;
      case "revert":
        return colors.warning;
      default:
        return colors.textPrimary;
    }
  })();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing["2xs"],
      }}
    >
      <View style={{ width: 20, alignItems: "center" }}>{icon}</View>
      <Text
        style={{
          ...typography.bodySmall,
          color: colors.textPrimary,
          flex: 1,
          marginLeft: spacing.xs,
        }}
        numberOfLines={1}
      >
        {change.exerciseName}
      </Text>
      <Text style={{ ...typography.bodySmall, color }}>{changeText}</Text>
    </View>
  );
}

export default WorkoutSummary;

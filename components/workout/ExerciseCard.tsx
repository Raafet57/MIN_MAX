import React, { useState } from "react";
import { Alert, Linking, Pressable, View, Text, TextInput } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";

import type {
  LoggedSet,
  ProgramExercise,
  SetDefinition,
  WarmupSet,
  WeightUnit,
} from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { displayWeight } from "@/utils/formatters";
import { MuscleGroupTag } from "@/components/shared/MuscleGroupTag";
import { SetRow } from "@/components/workout/SetRow";
import { WeightInput } from "@/components/workout/WeightInput";
import { RepInput } from "@/components/workout/RepInput";

interface Props {
  exercise: ProgramExercise;
  programSets: SetDefinition[];
  loggedSets: LoggedSet[];
  warmupSets: WarmupSet[];
  previousSets: LoggedSet[];
  currentWeight: number;
  unit: WeightUnit;
  onLogSet(input: Omit<LoggedSet, "id" | "workoutId">): void;
  onUpdateSet(id: string, patch: Partial<LoggedSet>): void;
  onAddWarmup(input: Omit<WarmupSet, "id" | "workoutId">): void;
  onRemoveWarmup(id: string): void;
  onCompleteSet(setId: string): void;
  onStartTimer(restSec: number): void;
  onOpenRpeSelector(setId: string): void;
}

function nowIso() {
  return new Date().toISOString();
}

export function ExerciseCard({
  exercise,
  programSets,
  loggedSets,
  warmupSets,
  previousSets,
  currentWeight,
  unit,
  onLogSet,
  onUpdateSet,
  onAddWarmup,
  onRemoveWarmup,
  onCompleteSet,
  onStartTimer,
  onOpenRpeSelector,
}: Props) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapText, setSwapText] = useState<string>(
    loggedSets[0]?.exerciseSubstitution ?? "",
  );

  // Draft warmup state.
  const [warmupWeight, setWarmupWeight] = useState<number>(0);
  const [warmupReps, setWarmupReps] = useState<number>(0);

  // Sort logged sets by setIndex to be safe.
  const sorted = [...loggedSets].sort((a, b) => a.setIndex - b.setIndex);

  const activeIndex = sorted.findIndex((s) => !s.completed && !s.skipped);

  function handleToggleComplete(set: LoggedSet) {
    onCompleteSet(set.id);
    // Parent normally handles starting the rest timer; we double-tap safely
    // in case the parent relies on the child: start timer whenever a working
    // set is marked complete (not skipped).
    if (!set.completed && !set.skipped) {
      const rest = programSets[set.setIndex]?.restOverrideSeconds ?? exercise.restSeconds;
      onStartTimer(rest);
    }
  }

  function openVideo() {
    if (!exercise.videoUrl) return;
    Linking.openURL(exercise.videoUrl).catch(() => {
      Alert.alert("Can't open video", exercise.videoUrl);
    });
  }

  function addExtraSet() {
    const lastProg = programSets[programSets.length - 1];
    if (!lastProg) return;
    const nextIndex = sorted.length;
    const seed = sorted[sorted.length - 1];
    onLogSet({
      exerciseId: exercise.id,
      setIndex: nextIndex,
      targetRepsLow: lastProg.reps[0],
      targetRepsHigh: lastProg.reps[1],
      targetRpe: lastProg.rpe,
      setType: lastProg.type,
      weight: seed?.weight ?? currentWeight,
      completedReps: 0,
      completed: false,
      skipped: false,
      timestamp: nowIso(),
    });
  }

  function addWarmup() {
    if (warmupWeight <= 0 && warmupReps <= 0) return;
    onAddWarmup({
      exerciseId: exercise.id,
      setIndex: warmupSets.length,
      weight: warmupWeight,
      reps: warmupReps,
      timestamp: nowIso(),
    });
    setWarmupWeight(0);
    setWarmupReps(0);
  }

  function applySwap() {
    const trimmed = swapText.trim();
    // Apply to all logged sets for this exercise.
    sorted.forEach((s) => {
      onUpdateSet(s.id, {
        exerciseSubstitution: trimmed.length > 0 ? trimmed : undefined,
      });
    });
    setSwapOpen(false);
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.xs }}>
          <Text
            style={{ ...typography.h2, color: colors.textPrimary }}
            numberOfLines={2}
          >
            {exercise.name}
          </Text>
          {loggedSets[0]?.exerciseSubstitution ? (
            <Text
              style={{
                ...typography.caption,
                color: colors.warning,
                marginTop: 2,
              }}
            >
              {`Logged as: ${loggedSets[0].exerciseSubstitution}`}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            maxWidth: "45%",
          }}
        >
          {exercise.targetMuscles.slice(0, 3).map((m) => (
            <MuscleGroupTag key={m} group={m} />
          ))}
          {exercise.videoUrl ? (
            <Pressable
              onPress={openVideo}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <PlayCircle size={22} color={colors.secondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Expandable note */}
      <Pressable
        onPress={() => setNotesExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing.xs,
        }}
      >
        <Text
          style={{
            ...typography.caption,
            color: colors.textSecondary,
          }}
        >
          {notesExpanded ? "Hide notes" : "Show notes & subs"}
        </Text>
        {notesExpanded ? (
          <ChevronUp size={14} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={14} color={colors.textSecondary} />
        )}
      </Pressable>
      {notesExpanded ? (
        <View
          style={{
            marginTop: spacing.xs,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.sm,
            padding: spacing.sm,
          }}
        >
          {exercise.note ? (
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.textPrimary,
              }}
            >
              {exercise.note}
            </Text>
          ) : null}
          {exercise.substitutes.length > 0 ? (
            <Text
              style={{
                ...typography.caption,
                color: colors.textSecondary,
                marginTop: spacing.xs,
              }}
            >
              {`Substitutes: ${exercise.substitutes.join(", ")}`}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Warmup section */}
      <Pressable
        onPress={() => setWarmupOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing.sm,
        }}
      >
        <Text
          style={{
            ...typography.caption,
            color: colors.textSecondary,
          }}
        >
          {warmupOpen
            ? `Hide warmup (${warmupSets.length})`
            : `+ Warmup${warmupSets.length > 0 ? ` (${warmupSets.length})` : ""}`}
        </Text>
      </Pressable>
      {warmupOpen ? (
        <View
          style={{
            marginTop: spacing.xs,
            padding: spacing.sm,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.sm,
          }}
        >
          {warmupSets.map((w) => (
            <View
              key={w.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing["2xs"],
              }}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textTertiary,
                }}
              >
                {`${displayWeight(w.weight, unit)} ${unit} × ${w.reps}`}
              </Text>
              <Pressable onPress={() => onRemoveWarmup(w.id)} hitSlop={6}>
                <Trash2 size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginTop: spacing["2xs"],
            }}
          >
            <View style={{ flex: 2 }}>
              <WeightInput
                value={warmupWeight}
                unit={unit}
                increment={2.5}
                onChange={setWarmupWeight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <RepInput value={warmupReps} onChange={setWarmupReps} />
            </View>
            <Pressable
              onPress={addWarmup}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textPrimary,
                  fontWeight: "600",
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Working sets */}
      <View style={{ marginTop: spacing.sm }}>
        {/* Column headers */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: spacing.xs,
            paddingBottom: 4,
          }}
        >
          <Text
            style={{
              flex: 10,
              ...typography.overline,
              color: colors.textTertiary,
              textAlign: "center",
            }}
          >
            SET
          </Text>
          <Text
            style={{
              flex: 25,
              ...typography.overline,
              color: colors.textTertiary,
            }}
          >
            PREV
          </Text>
          <Text
            style={{
              flex: 22,
              ...typography.overline,
              color: colors.textTertiary,
              textAlign: "center",
            }}
          >
            {unit.toUpperCase()}
          </Text>
          <Text
            style={{
              flex: 15,
              ...typography.overline,
              color: colors.textTertiary,
              textAlign: "center",
            }}
          >
            REPS
          </Text>
          <Text
            style={{
              flex: 15,
              ...typography.overline,
              color: colors.textTertiary,
              textAlign: "center",
            }}
          >
            RPE
          </Text>
          <View style={{ flex: 13 }} />
        </View>

        {sorted.map((set, idx) => {
          const progSet = programSets[set.setIndex] ?? programSets[programSets.length - 1];
          const prev = previousSets[set.setIndex];
          return (
            <SetRow
              key={set.id}
              set={set}
              programSet={progSet}
              previous={prev}
              unit={unit}
              isActive={idx === activeIndex}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onToggleComplete={() => handleToggleComplete(set)}
              onOpenRpeSelector={() => onOpenRpeSelector(set.id)}
            />
          );
        })}
      </View>

      {/* Action row */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.xs,
          marginTop: spacing.xs,
        }}
      >
        <Pressable
          onPress={addExtraSet}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceElevated,
          })}
        >
          <Plus size={14} color={colors.textSecondary} />
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginLeft: 4,
            }}
          >
            Extra Set
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSwapOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceElevated,
          })}
        >
          <RefreshCw size={14} color={colors.textSecondary} />
          <Text
            style={{
              ...typography.bodySmall,
              color: colors.textSecondary,
              marginLeft: 4,
            }}
          >
            Swap
          </Text>
        </Pressable>
      </View>

      {swapOpen ? (
        <View
          style={{
            marginTop: spacing.xs,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.sm,
            padding: spacing.sm,
          }}
        >
          <Text
            style={{
              ...typography.caption,
              color: colors.textSecondary,
              marginBottom: spacing["2xs"],
            }}
          >
            Log substitution (what you actually did):
          </Text>
          <TextInput
            value={swapText}
            onChangeText={setSwapText}
            placeholder={exercise.substitutes[0] ?? "e.g. Seated Leg Curl"}
            placeholderTextColor={colors.textTertiary}
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              minHeight: 40,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            <Pressable
              onPress={() => setSwapOpen(false)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textSecondary,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={applySwap}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radius.sm,
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              })}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textPrimary,
                  fontWeight: "600",
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default ExerciseCard;

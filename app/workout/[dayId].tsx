import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import type {
  DayId,
  LoggedSet,
  PRNotification,
  ProgramExercise,
  ProgressionChange,
  RPE,
  SessionFeeling,
  Workout,
} from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { getProgramDay, getExerciseSetsForWeek } from "@/data/program";
import { phaseForWeek, currentWeek } from "@/utils/weekPhase";
import { runProgression } from "@/utils/progression";
import { formatDuration } from "@/utils/formatters";
import {
  getExerciseState,
  getPreviousSessionSets,
  updateWorkout,
} from "@/db/queries";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { WeekBadge } from "@/components/shared/WeekBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { RestTimer } from "@/components/workout/RestTimer";
import { RPESelector } from "@/components/workout/RPESelector";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";

interface SummaryState {
  visible: boolean;
  changes: ProgressionChange[];
  prs: PRNotification[];
  feeling?: SessionFeeling;
  notes: string;
  workout?: Workout;
  loggedSets: LoggedSet[];
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { dayId: rawDayId } = useLocalSearchParams<{ dayId: string }>();
  const dayId = (Array.isArray(rawDayId) ? rawDayId[0] : rawDayId) as DayId;

  const settings = useSettingsStore((s) => s.settings);
  const week = currentWeek(settings.programStartDate);
  const phase = phaseForWeek(week);
  const day = getProgramDay(dayId);

  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const loggedSets = useWorkoutStore((s) => s.loggedSets);
  const warmupSets = useWorkoutStore((s) => s.warmupSets);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const logSet = useWorkoutStore((s) => s.logSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const addWarmup = useWorkoutStore((s) => s.addWarmup);
  const removeWarmup = useWorkoutStore((s) => s.removeWarmup);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);

  const [elapsed, setElapsed] = useState(0);
  const [rpeTarget, setRpeTarget] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryState>({
    visible: false,
    changes: [],
    prs: [],
    notes: "",
    loggedSets: [],
  });
  const [prevSessionCache, setPrevSessionCache] = useState<
    Record<string, LoggedSet[]>
  >({});
  const [exerciseWeightCache, setExerciseWeightCache] = useState<
    Record<string, number>
  >({});

  // ---------------------------------------------------------------------
  // Start or attach to workout
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!day) return;
    if (activeWorkout && activeWorkout.dayId === dayId) return;

    // Start a fresh workout if none is active OR if active is a different day.
    if (!activeWorkout) {
      const w = startWorkout(dayId, week, phase.id, day.name);
      if (!w) return;
      seedSetsForWorkout(w.id);
    }
    // If a different active workout exists, we leave it alone — the store
    // owns resolution. The resume banner on the dashboard sends users to the
    // correct dayId, so we generally shouldn't land here mid-other-workout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, day]);

  // Seed sets helper: create a blank LoggedSet per programmed set.
  function seedSetsForWorkout(workoutId: string) {
    if (!day) return;
    const nowIso = new Date().toISOString();

    for (const exercise of day.exercises) {
      const programmed = getExerciseSetsForWeek(exercise, week);
      const state = getExerciseState(exercise.id);
      const initialWeight = state?.currentWeight ?? 0;

      programmed.forEach((setDef, idx) => {
        logSet({
          exerciseId: exercise.id,
          setIndex: idx,
          targetRepsLow: setDef.reps[0],
          targetRepsHigh: setDef.reps[1],
          targetRpe: setDef.rpe,
          setType: setDef.type,
          weight: initialWeight,
          completedReps: 0,
          completed: false,
          skipped: false,
          timestamp: nowIso,
        });
      });
    }
  }

  // ---------------------------------------------------------------------
  // Load previous-session ghost data and current weights per exercise.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!day || !activeWorkout) return;
    const prev: Record<string, LoggedSet[]> = {};
    const weights: Record<string, number> = {};
    for (const e of day.exercises) {
      prev[e.id] = getPreviousSessionSets(e.id, activeWorkout.id);
      weights[e.id] = getExerciseState(e.id)?.currentWeight ?? 0;
    }
    setPrevSessionCache(prev);
    setExerciseWeightCache(weights);
  }, [day, activeWorkout?.id]);

  // ---------------------------------------------------------------------
  // Elapsed timer
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!activeWorkout?.startedAt) return;
    const startedMs = new Date(activeWorkout.startedAt).getTime();
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  // ---------------------------------------------------------------------
  // Back / Leave handling
  // ---------------------------------------------------------------------
  const completedCount = useMemo(
    () => loggedSets.filter((s) => s.completed).length,
    [loggedSets],
  );

  const handleBack = useCallback(() => {
    if (completedCount > 0) {
      Alert.alert(
        "Leave workout?",
        "Unsaved sets will be kept — you can resume from the dashboard.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }, [completedCount, router]);

  // ---------------------------------------------------------------------
  // Finish workout
  // ---------------------------------------------------------------------
  const handleFinish = useCallback(() => {
    const incomplete = loggedSets.filter(
      (s) => !s.completed && !s.skipped && s.setType !== "warmup",
    );

    const finalize = () => {
      const beforeWorkout = activeWorkout;
      const beforeSets = loggedSets.slice();
      const result = finishWorkout();
      if (!result || !beforeWorkout) {
        router.back();
        return;
      }
      const completedSets = beforeSets.filter(
        (s) => s.completed && s.setType !== "warmup",
      );
      const { changes, prs } = runProgression(
        result.workoutId,
        week,
        completedSets,
      );
      setSummary({
        visible: true,
        changes,
        prs,
        notes: "",
        loggedSets: beforeSets,
        workout: {
          ...beforeWorkout,
          id: result.workoutId,
          completedAt: new Date().toISOString(),
          durationSeconds: elapsed,
          totalSets: beforeSets.filter((s) => s.setType !== "warmup").length,
          completedSets: completedSets.length,
          totalVolume: completedSets.reduce(
            (sum, s) => sum + (s.weight * s.completedReps || 0),
            0,
          ),
        },
      });
    };

    if (incomplete.length > 0) {
      Alert.alert(
        "Finish workout?",
        `${incomplete.length} set${incomplete.length === 1 ? "" : "s"} still incomplete. Finish anyway?`,
        [
          { text: "Keep going", style: "cancel" },
          { text: "Finish", style: "destructive", onPress: finalize },
        ],
      );
    } else {
      finalize();
    }
  }, [loggedSets, finishWorkout, week, router, activeWorkout, elapsed]);

  const handleSummarySave = useCallback(() => {
    if (summary.workout) {
      updateWorkout(summary.workout.id, {
        feeling: summary.feeling,
        notes: summary.notes || undefined,
      });
    }
    setSummary((s) => ({ ...s, visible: false }));
    router.replace("/(tabs)");
  }, [summary, router]);

  // ---------------------------------------------------------------------
  // Per-set interactions
  // ---------------------------------------------------------------------
  const handleCompleteSet = useCallback(
    (setId: string) => {
      const set = loggedSets.find((s) => s.id === setId);
      if (!set) return;
      updateSet(setId, {
        completed: !set.completed,
        skipped: false,
        timestamp: new Date().toISOString(),
      });
    },
    [loggedSets, updateSet],
  );

  const handleStartTimer = useCallback(
    (exerciseId: string, restSec: number) => {
      startRestTimer(exerciseId, restSec);
    },
    [startRestTimer],
  );

  const handleRpeSelect = useCallback(
    (rpe: RPE | null) => {
      if (rpeTarget) {
        updateSet(rpeTarget, {
          actualRpe: rpe === null ? undefined : rpe,
        });
      }
      setRpeTarget(null);
    },
    [rpeTarget, updateSet],
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  if (!day) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
          <EmptyState
            title="Unknown workout"
            subtitle={`No program day found for "${dayId}".`}
            action={{ label: "Go back", onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: 6,
            marginLeft: -6,
          })}
        >
          <ChevronLeft color={colors.textPrimary} size={26} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.h2, color: colors.textPrimary }}>
            {day.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginTop: 4,
            }}
          >
            <WeekBadge week={week} phaseId={phase.id} />
            <Text
              style={{
                ...typography.dataSmall,
                color: colors.textSecondary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatDuration(elapsed)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? colors.primaryPressed
              : colors.primary,
            paddingVertical: 10,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
          })}
        >
          <Text style={{ ...typography.caption, color: colors.textInverse }}>
            FINISH
          </Text>
        </Pressable>
      </View>

      {/* Exercise list */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: 180,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {day.exercises.map((exercise: ProgramExercise) => {
          const setsForExercise = loggedSets
            .filter((s) => s.exerciseId === exercise.id)
            .sort((a, b) => a.setIndex - b.setIndex);
          const warmupsForExercise = warmupSets.filter(
            (w) => w.exerciseId === exercise.id,
          );
          const programSets = getExerciseSetsForWeek(exercise, week);
          return (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              programSets={programSets}
              loggedSets={setsForExercise}
              warmupSets={warmupsForExercise}
              previousSets={prevSessionCache[exercise.id] ?? []}
              currentWeight={exerciseWeightCache[exercise.id] ?? 0}
              unit={settings.weightUnit}
              onLogSet={logSet}
              onUpdateSet={updateSet}
              onAddWarmup={addWarmup}
              onRemoveWarmup={removeWarmup}
              onCompleteSet={handleCompleteSet}
              onStartTimer={(restSec) => handleStartTimer(exercise.id, restSec)}
              onOpenRpeSelector={(setId) => setRpeTarget(setId)}
            />
          );
        })}
      </ScrollView>

      {/* Floating rest timer */}
      <RestTimer />

      {/* RPE Selector */}
      <RPESelector
        visible={rpeTarget !== null}
        currentRpe={
          rpeTarget
            ? (loggedSets.find((s) => s.id === rpeTarget)?.actualRpe as
                | 7
                | 8
                | 9
                | 10
                | undefined)
            : undefined
        }
        onClose={() => setRpeTarget(null)}
        onSelect={handleRpeSelect}
      />

      {/* Summary modal */}
      {summary.workout ? (
        <WorkoutSummary
          visible={summary.visible}
          workout={summary.workout}
          loggedSets={summary.loggedSets}
          changes={summary.changes}
          prs={summary.prs}
          unit={settings.weightUnit}
          feeling={summary.feeling}
          onFeelingChange={(f: SessionFeeling) =>
            setSummary((s) => ({ ...s, feeling: f }))
          }
          notes={summary.notes}
          onNotesChange={(t: string) =>
            setSummary((s) => ({ ...s, notes: t }))
          }
          onSave={handleSummarySave}
          onClose={() => {
            setSummary((s) => ({ ...s, visible: false }));
            router.replace("/(tabs)");
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { ChevronDown } from "lucide-react-native";

import type { LoggedSet, MuscleGroup, PersonalRecord, Workout } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import {
  getAllWorkouts,
  getLoggedSetsForExercise,
  getAllCurrentPRs,
  getLoggedSetsForWorkout,
} from "@/db/queries";
import { PROGRAM } from "@/data/program";
import { MUSCLE_GROUPS } from "@/data/muscleGroups";
import { weeklySetCountByMuscle } from "@/utils/volumeCalc";
import { currentWeek } from "@/utils/weekPhase";
import { useSettingsStore } from "@/stores/settingsStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExerciseChart } from "@/components/progress/ExerciseChart";
import { OneRMChart } from "@/components/progress/OneRMChart";
import { VolumeChart } from "@/components/progress/VolumeChart";
import { PRBoard } from "@/components/progress/PRBoard";

interface ExerciseOption {
  id: string;
  name: string;
}

const MUSCLE_ORDER: MuscleGroup[] = [
  "shoulders", "chest", "back", "biceps", "triceps", "forearms",
  "quadriceps", "hamstrings", "glutes", "calves", "abs",
];

function collectExercises(): ExerciseOption[] {
  const seen = new Map<string, string>();
  for (const day of PROGRAM.days) {
    for (const ex of day.exercises) {
      if (!seen.has(ex.id)) seen.set(ex.id, ex.name);
    }
  }
  return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function defaultExerciseId(): string {
  const first =
    PROGRAM.days.find((d) => d.id === "full-body") ?? PROGRAM.days[0];
  return first?.exercises[0]?.id ?? "";
}

export default function ProgressScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const unit = settings.weightUnit;

  const allExercises = useMemo(collectExercises, []);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    defaultExerciseId(),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [exerciseSets, setExerciseSets] = useState<LoggedSet[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<
    Record<number, LoggedSet[]>
  >({});
  const [currentWeekSets, setCurrentWeekSets] = useState<LoggedSet[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);

  const refresh = useCallback(() => {
    const allWorkouts = getAllWorkouts().filter((w) => !!w.completedAt);
    setWorkouts(allWorkouts);

    const perWeek: Record<number, LoggedSet[]> = {};
    const thisWeek = currentWeek(settings.programStartDate);
    const thisWeekSets: LoggedSet[] = [];

    for (const w of allWorkouts) {
      const sets = getLoggedSetsForWorkout(w.id);
      if (!perWeek[w.weekNumber]) perWeek[w.weekNumber] = [];
      perWeek[w.weekNumber].push(...sets);
      if (w.weekNumber === thisWeek) thisWeekSets.push(...sets);
    }
    setWorkoutsPerWeek(perWeek);
    setCurrentWeekSets(thisWeekSets);
    setPRs(getAllCurrentPRs());
  }, [settings.programStartDate]);

  const refreshExerciseSets = useCallback(() => {
    if (!selectedExerciseId) return setExerciseSets([]);
    setExerciseSets(getLoggedSetsForExercise(selectedExerciseId));
  }, [selectedExerciseId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshExerciseSets();
    }, [refresh, refreshExerciseSets]),
  );

  useEffect(() => {
    refreshExerciseSets();
  }, [refreshExerciseSets]);

  const selectedExerciseName =
    allExercises.find((e) => e.id === selectedExerciseId)?.name ??
    "Select exercise";
  const hasAnyWorkouts = workouts.length > 0;
  const thisWeekNumber = currentWeek(settings.programStartDate);
  const muscleCounts = useMemo(
    () => weeklySetCountByMuscle(currentWeekSets),
    [currentWeekSets],
  );
  const anyMuscleSets = MUSCLE_ORDER.some((m) => muscleCounts[m] > 0);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: spacing.xs,
          paddingBottom: 80,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...typography.h1, color: colors.textPrimary }}>
          Progress
        </Text>

        {!hasAnyWorkouts ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <EmptyState
              title="No workouts yet"
              subtitle="Log your first session to see progress charts and PRs"
            />
          </View>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>
                Exercise Progress
              </Text>

              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: pressed ? colors.surfaceOverlay : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: 48,
                })}
              >
                <Text style={{ ...typography.body, color: colors.textPrimary }} numberOfLines={1}>
                  {selectedExerciseName}
                </Text>
                <ChevronDown color={colors.textSecondary} size={18} />
              </Pressable>

              <ExerciseChart sets={exerciseSets} unit={unit} />
              <OneRMChart sets={exerciseSets} unit={unit} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>
                Weekly Volume
              </Text>
              <VolumeChart workoutsPerWeek={workoutsPerWeek} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>This Week</Text>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                Week {thisWeekNumber} — sets per muscle group
              </Text>
              {!anyMuscleSets ? (
                <View style={{ paddingVertical: spacing.lg }}>
                  <EmptyState
                    title="No sets logged yet this week"
                    subtitle="Finish a session to populate this week's breakdown."
                  />
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.md,
                    gap: spacing.sm,
                  }}
                >
                  {MUSCLE_ORDER.map((m) => (
                    <MuscleRow key={m} muscle={m} count={muscleCounts[m] ?? 0} />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>
                Personal Records
              </Text>
              <PRBoard prs={prs} unit={unit} />
            </View>
          </>
        )}
      </ScrollView>

      <ExercisePickerModal
        open={pickerOpen}
        exercises={allExercises}
        selectedId={selectedExerciseId}
        onSelect={(id) => {
          setSelectedExerciseId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function ExercisePickerModal({
  open, exercises, selectedId, onSelect, onClose,
}: {
  open: boolean;
  exercises: ExerciseOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: "70%",
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          <Text
            style={{
              ...typography.h2,
              color: colors.textPrimary,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            Select exercise
          </Text>
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.divider }} />
            )}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <Pressable
                  onPress={() => onSelect(item.id)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
                    minHeight: 48,
                    justifyContent: "center",
                  })}
                >
                  <Text
                    style={{
                      ...typography.body,
                      color: active ? colors.primary : colors.textPrimary,
                      fontWeight: active ? "600" : "400",
                    }}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MuscleRow({ muscle, count }: { muscle: MuscleGroup; count: number }) {
  const info = MUSCLE_GROUPS[muscle];
  const [low, high] = info.recommendedWeeklySets;
  const scaleMax = Math.max(high, count);
  const pct = scaleMax > 0 ? Math.min(100, (count / scaleMax) * 100) : 0;

  let label = "none";
  let tone: string = colors.textTertiary;
  if (count > 0 && count < low) { label = "⚠ low end"; tone = colors.warning; }
  else if (count > high) { label = "⚠ high end"; tone = colors.warning; }
  else if (count >= low && count <= high) { label = "✓ in range"; tone = colors.success; }

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...typography.body, color: colors.textPrimary }}>{info.displayName}</Text>
        <Text style={{ ...typography.dataSmall, color: colors.textPrimary }}>
          {count} {count === 1 ? "set" : "sets"}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: info.color, borderRadius: radius.pill }} />
      </View>
      <Text style={{ ...typography.caption, color: tone }}>
        {label} · target {low}-{high}
      </Text>
    </View>
  );
}

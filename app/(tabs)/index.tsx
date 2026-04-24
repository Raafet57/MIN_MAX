import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Play, ArrowRight, Dumbbell } from "lucide-react-native";
import { startOfDay, addDays, formatISO } from "date-fns";

import type { DayId, Workout } from "@/types";
import { colors } from "@/constants/colors";
import { feelingEmoji } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import {
  getActiveWorkout,
  getRecentWorkouts,
  getWorkoutsInWeek,
} from "@/db/queries";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  currentWeek,
  isProgramComplete,
  nextDayId,
  phaseForWeek,
} from "@/utils/weekPhase";
import { getProgramDay } from "@/data/program";
import {
  formatDate,
  formatDuration,
  formatVolume,
} from "@/utils/formatters";
import { PhaseBanner } from "@/components/shared/PhaseBanner";
import { StatCard } from "@/components/shared/StatCard";
import { WeekBadge } from "@/components/shared/WeekBadge";
import { EmptyState } from "@/components/shared/EmptyState";

interface DashState {
  active: Workout | null;
  recent: Workout[];
  weekWorkouts: Workout[];
  lastCompletedDay?: DayId;
}

const EMPTY_STATE: DashState = {
  active: null,
  recent: [],
  weekWorkouts: [],
};

export default function DashboardScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.update);

  const [data, setData] = useState<DashState>(EMPTY_STATE);

  const refresh = useCallback(() => {
    const active = getActiveWorkout();
    const recent = getRecentWorkouts(10);

    // Current calendar week based on program start anchor — use Monday-to-Monday
    // rolling off program start date.
    const today = startOfDay(new Date());
    const startOfWeek = today; // for simplicity show last 7 days
    const weekFrom = formatISO(addDays(startOfWeek, -6));
    const weekTo = formatISO(addDays(startOfWeek, 1));
    const weekWorkouts = getWorkoutsInWeek(weekFrom, weekTo);

    const lastCompleted = recent.find((w) => w.completedAt);
    setData({
      active,
      recent: recent.filter((w) => w.completedAt).slice(0, 3),
      weekWorkouts: weekWorkouts.filter((w) => w.completedAt),
      lastCompletedDay: lastCompleted?.dayId,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const week = currentWeek(settings.programStartDate);
  const phase = phaseForWeek(week);
  const complete = isProgramComplete(settings.programStartDate);

  const upcomingDayId: DayId = nextDayId(data.lastCompletedDay);
  const upcomingDay = getProgramDay(upcomingDayId);

  const sessionsThisWeek = data.weekWorkouts.length;
  const volumeThisWeek = data.weekWorkouts.reduce(
    (acc, w) => acc + (w.totalVolume ?? 0),
    0,
  );
  const setsThisWeek = data.weekWorkouts.reduce(
    (acc, w) => acc + (w.completedSets ?? 0),
    0,
  );

  function handleResetProgram() {
    Alert.alert(
      "Reset Program?",
      "This restarts the 12-week block from today. Your logged history is preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            const today = new Date().toISOString().slice(0, 10);
            updateSetting("programStartDate", today);
            refresh();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: 120,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PhaseBanner week={week} phaseId={phase.id} />

        {complete ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
            }}
          >
            <EmptyState
              title="Program Complete"
              subtitle="You finished the 12-week block. Reset to start a fresh cycle or keep logging freestyle."
              action={{ label: "Reset Program", onPress: handleResetProgram }}
            />
          </View>
        ) : null}

        {data.active ? (
          <ResumeBanner
            workout={data.active}
            onResume={() =>
              router.push({
                pathname: "/workout/[dayId]",
                params: { dayId: data.active!.dayId },
              })
            }
          />
        ) : null}

        {upcomingDay ? (
          <NextWorkoutCard
            dayName={upcomingDay.name}
            estimatedMinutes={upcomingDay.estimatedMinutes}
            exerciseNames={upcomingDay.exercises
              .slice(0, 4)
              .map((e) => e.name)}
            exerciseCount={upcomingDay.exercises.length}
            onStart={() =>
              router.push({
                pathname: "/workout/[dayId]",
                params: { dayId: upcomingDayId },
              })
            }
            disabled={complete}
          />
        ) : null}

        <Text style={sectionTitle}>This Week</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard
            label="Sessions"
            value={`${sessionsThisWeek}/4`}
            tone={sessionsThisWeek >= 4 ? "success" : "default"}
          />
          <StatCard
            label="Volume"
            value={formatVolume(volumeThisWeek, settings.weightUnit)}
          />
          <StatCard label="Sets" value={String(setsThisWeek)} />
        </View>

        <Text style={sectionTitle}>Recent</Text>
        {data.recent.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
            }}
          >
            <EmptyState
              title="No workouts yet"
              subtitle="Your completed sessions will appear here."
            />
          </View>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {data.recent.map((w) => (
              <RecentWorkoutCard
                key={w.id}
                workout={w}
                unit={settings.weightUnit}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const sectionTitle = {
  ...typography.overline,
  color: colors.textSecondary,
  marginTop: spacing.sm,
} as const;

function ResumeBanner({
  workout,
  onResume,
}: {
  workout: Workout;
  onResume: () => void;
}) {
  return (
    <Pressable
      onPress={onResume}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.primaryPressed : colors.primaryMuted,
        borderColor: colors.primary,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Play color={colors.textInverse} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.caption, color: colors.primary }}>
          IN PROGRESS
        </Text>
        <Text style={{ ...typography.h3, color: colors.textPrimary }}>
          {workout.dayName}
        </Text>
      </View>
      <ArrowRight color={colors.primary} size={20} />
    </Pressable>
  );
}

function NextWorkoutCard({
  dayName,
  estimatedMinutes,
  exerciseNames,
  exerciseCount,
  onStart,
  disabled,
}: {
  dayName: string;
  estimatedMinutes: number;
  exerciseNames: string[];
  exerciseCount: number;
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ ...typography.overline, color: colors.textSecondary }}>
            NEXT UP
          </Text>
          <Text
            style={{
              ...typography.h1,
              color: colors.textPrimary,
              marginTop: 2,
            }}
          >
            {dayName}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
            {`~${estimatedMinutes} min`}
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: colors.textTertiary,
              marginTop: 2,
            }}
          >
            {`${exerciseCount} exercises`}
          </Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        {exerciseNames.map((n) => (
          <View
            key={n}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Dumbbell size={12} color={colors.textTertiary} />
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
              {n}
            </Text>
          </View>
        ))}
        {exerciseCount > exerciseNames.length ? (
          <Text style={{ ...typography.caption, color: colors.textTertiary }}>
            {`+ ${exerciseCount - exerciseNames.length} more`}
          </Text>
        ) : null}
      </View>

      <Pressable
        disabled={disabled}
        onPress={onStart}
        style={({ pressed }) => ({
          backgroundColor: disabled
            ? colors.surfaceElevated
            : pressed
              ? colors.primaryPressed
              : colors.primary,
          borderRadius: radius.md,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          marginTop: spacing["2xs"],
        })}
      >
        <Play
          color={disabled ? colors.textTertiary : colors.textInverse}
          size={18}
        />
        <Text
          style={{
            ...typography.h3,
            color: disabled ? colors.textTertiary : colors.textInverse,
          }}
        >
          START WORKOUT
        </Text>
      </Pressable>
    </View>
  );
}

function RecentWorkoutCard({
  workout,
  unit,
}: {
  workout: Workout;
  unit: "kg" | "lb";
}) {
  const emoji = workout.feeling ? feelingEmoji[workout.feeling] : "";
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ ...typography.h3, color: colors.textPrimary }}>
          {workout.dayName}
        </Text>
        <WeekBadge week={workout.weekNumber} phaseId={workout.phase} />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
          {formatDate(workout.startedAt)}
        </Text>
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
          {`${workout.completedSets} sets • ${formatVolume(workout.totalVolume, unit)}`}
          {workout.durationSeconds
            ? ` • ${formatDuration(workout.durationSeconds)}`
            : ""}
          {emoji ? `  ${emoji}` : ""}
        </Text>
      </View>
    </View>
  );
}

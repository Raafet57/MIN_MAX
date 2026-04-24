import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List as ListIcon, X } from "lucide-react-native";

import type { DayId, Workout } from "@/types";
import { colors, feelingEmoji } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { getAllWorkouts, deleteWorkout } from "@/db/queries";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  formatDate,
  formatDuration,
  formatVolume,
} from "@/utils/formatters";
import { WeekBadge } from "@/components/shared/WeekBadge";
import { EmptyState } from "@/components/shared/EmptyState";

type Filter = "all" | DayId;
type HistoryView = "list" | "calendar";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "full-body", label: "Full Body" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
  { id: "arms-delts", label: "Arms/Delts" },
];

const DAY_COLORS: Record<DayId, string> = {
  "full-body": colors.primary,
  upper: colors.secondary,
  lower: colors.tertiary,
  "arms-delts": colors.warning,
};

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function HistoryScreen() {
  const router = useRouter();
  const unit = useSettingsStore((s) => s.settings.weightUnit);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<HistoryView>("list");
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [dayModal, setDayModal] = useState<{
    date: Date;
    workouts: Workout[];
  } | null>(null);

  const refresh = useCallback(() => {
    setWorkouts(getAllWorkouts().filter((w) => !!w.completedAt));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const list =
      filter === "all" ? workouts : workouts.filter((w) => w.dayId === filter);
    return list;
  }, [workouts, filter]);

  function confirmDelete(w: Workout) {
    Alert.alert(
      "Delete workout?",
      `${w.dayName} — ${formatDate(w.startedAt)}. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteWorkout(w.id);
            refresh();
          },
        },
      ],
    );
  }

  function openWorkout(w: Workout) {
    router.push({
      pathname: "/workout-detail/[workoutId]",
      params: { workoutId: w.id },
    } as never);
  }

  function onDayTap(date: Date, dayWorkouts: Workout[]) {
    if (dayWorkouts.length === 0) return;
    if (dayWorkouts.length === 1) {
      openWorkout(dayWorkouts[0]);
      return;
    }
    setDayModal({ date, workouts: dayWorkouts });
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ ...typography.h1, color: colors.textPrimary }}>
            History
          </Text>
          <ViewToggle view={view} onChange={setView} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: active
                    ? colors.primary
                    : pressed
                      ? colors.surfaceOverlay
                      : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                })}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: active ? colors.textInverse : colors.textSecondary,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {view === "list" ? (
        filtered.length === 0 ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.xl,
            }}
          >
            <EmptyState
              title="No workouts yet"
              subtitle="Finish your first session to see it here."
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(w) => w.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              paddingBottom: 120,
              gap: spacing.xs,
            }}
            renderItem={({ item }) => (
              <HistoryCard
                workout={item}
                unit={unit}
                onPress={() => openWorkout(item)}
                onLongPress={() => confirmDelete(item)}
              />
            )}
          />
        )
      ) : (
        <CalendarView
          cursor={monthCursor}
          onCursorChange={setMonthCursor}
          workouts={filtered}
          onDayTap={onDayTap}
        />
      )}

      <DayWorkoutsModal
        payload={dayModal}
        unit={unit}
        onClose={() => setDayModal(null)}
        onPick={(w) => {
          setDayModal(null);
          openWorkout(w);
        }}
      />
    </SafeAreaView>
  );
}

// --------------------------------------------------------------------------

function ViewToggle({
  view,
  onChange,
}: {
  view: HistoryView;
  onChange: (v: HistoryView) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 2,
      }}
    >
      {(
        [
          { id: "list" as HistoryView, Icon: ListIcon },
          { id: "calendar" as HistoryView, Icon: CalendarIcon },
        ]
      ).map(({ id, Icon }) => {
        const active = view === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: active
                ? colors.primary
                : pressed
                  ? colors.surfaceOverlay
                  : "transparent",
            })}
          >
            <Icon
              size={16}
              color={active ? colors.textInverse : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// --------------------------------------------------------------------------

function HistoryCard({
  workout,
  unit,
  onPress,
  onLongPress,
}: {
  workout: Workout;
  unit: "kg" | "lb";
  onPress: () => void;
  onLongPress: () => void;
}) {
  const emoji = workout.feeling ? feelingEmoji[workout.feeling] : "";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.surfaceOverlay : colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 8,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ ...typography.h2, color: colors.textPrimary }}>
          {workout.dayName}
        </Text>
        <WeekBadge week={workout.weekNumber} phaseId={workout.phase} />
      </View>
      <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
        {formatDate(workout.startedAt)}
        {workout.durationSeconds
          ? ` • ${formatDuration(workout.durationSeconds)}`
          : ""}
      </Text>
      <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
        {`${workout.completedSets} sets • ${formatVolume(workout.totalVolume, unit)}`}
        {emoji ? `   ${emoji}` : ""}
      </Text>
    </Pressable>
  );
}

// --------------------------------------------------------------------------

function CalendarView({
  cursor,
  onCursorChange,
  workouts,
  onDayTap,
}: {
  cursor: Date;
  onCursorChange: (d: Date) => void;
  workouts: Workout[];
  onDayTap: (date: Date, dayWorkouts: Workout[]) => void;
}) {
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    });
  }, [cursor]);

  // Monday-first leading blanks. date-fns getDay returns Sunday=0..Saturday=6.
  const leadingBlanks = useMemo(() => {
    const first = days[0];
    const dow = getDay(first); // Sun=0..Sat=6
    // Monday=0..Sunday=6
    return (dow + 6) % 7;
  }, [days]);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const key = format(new Date(w.startedAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    }
    return map;
  }, [workouts]);

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...days,
  ];
  const totalCells = Math.ceil(cells.length / 7) * 7;
  while (cells.length < totalCells) cells.push(null);

  const today = new Date();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingBottom: 120,
        gap: spacing.sm,
      }}
    >
      {/* Month nav */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => onCursorChange(subMonths(cursor, 1))}
          hitSlop={10}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h2, color: colors.textPrimary }}>
          {format(cursor, "MMMM yyyy")}
        </Text>
        <Pressable
          onPress={() => onCursorChange(addMonths(cursor, 1))}
          hitSlop={10}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ChevronRight size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Day-of-week row */}
      <View style={{ flexDirection: "row" }}>
        {DOW_LABELS.map((d) => (
          <View
            key={d}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
          >
            <Text
              style={{ ...typography.caption, color: colors.textSecondary }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: 4,
        }}
      >
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <View
                key={`blank-${idx}`}
                style={{ width: `${100 / 7}%`, height: 48 }}
              />
            );
          }
          const key = format(cell, "yyyy-MM-dd");
          const dayWorkouts = workoutsByDay.get(key) ?? [];
          const isToday = isSameDay(cell, today);

          return (
            <View
              key={key}
              style={{
                width: `${100 / 7}%`,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={() => onDayTap(cell, dayWorkouts)}
                disabled={dayWorkouts.length === 0}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    pressed && dayWorkouts.length > 0
                      ? colors.surfaceOverlay
                      : "transparent",
                  borderWidth: isToday ? 1 : 0,
                  borderColor: isToday ? colors.borderActive : "transparent",
                })}
              >
                <Text
                  style={{
                    ...typography.bodySmall,
                    color:
                      dayWorkouts.length > 0
                        ? colors.textPrimary
                        : colors.textTertiary,
                    fontWeight: dayWorkouts.length > 0 ? "600" : "400",
                  }}
                >
                  {format(cell, "d")}
                </Text>
                {dayWorkouts.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 2,
                      marginTop: 2,
                      minHeight: 6,
                    }}
                  >
                    {dayWorkouts.slice(0, 3).map((w, i) => (
                      <View
                        key={`${w.id}-${i}`}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: DAY_COLORS[w.dayId],
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: spacing.md,
          paddingHorizontal: spacing.xs,
        }}
      >
        {(Object.keys(DAY_COLORS) as DayId[]).map((id) => (
          <View
            key={id}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: DAY_COLORS[id],
              }}
            />
            <Text
              style={{
                ...typography.caption,
                color: colors.textSecondary,
              }}
            >
              {labelFor(id)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function labelFor(id: DayId): string {
  switch (id) {
    case "full-body":
      return "Full Body";
    case "upper":
      return "Upper";
    case "lower":
      return "Lower";
    case "arms-delts":
      return "Arms/Delts";
  }
}

// --------------------------------------------------------------------------

function DayWorkoutsModal({
  payload,
  unit,
  onClose,
  onPick,
}: {
  payload: { date: Date; workouts: Workout[] } | null;
  unit: "kg" | "lb";
  onClose: () => void;
  onPick: (w: Workout) => void;
}) {
  const visible = payload != null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
            gap: spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>
              {payload ? format(payload.date, "EEE, MMM d") : ""}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          {payload?.workouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => onPick(w)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceOverlay : colors.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.sm,
                gap: 2,
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                  {w.dayName}
                </Text>
                <WeekBadge week={w.weekNumber} phaseId={w.phase} />
              </View>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textSecondary,
                }}
              >
                {`${w.completedSets} sets • ${formatVolume(w.totalVolume, unit)}`}
                {w.durationSeconds
                  ? ` • ${formatDuration(w.durationSeconds)}`
                  : ""}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

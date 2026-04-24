import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { ChevronLeft, Trash2, Save, X } from "lucide-react-native";

import type { LoggedSet, RPE, WarmupSet, Workout } from "@/types";
import { colors, feelingEmoji, rpeColors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { PROGRAM } from "@/data/program";
import { getExerciseName, getExercise } from "@/data/exercises";
import {
  deleteLoggedSet,
  deleteWorkout,
  getLoggedSetsForWorkout,
  getWarmupSetsForWorkout,
  getWorkout,
  updateLoggedSet,
} from "@/db/queries";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatVolume,
  formatWeight,
  displayWeight,
  storageWeight,
} from "@/utils/formatters";
import { WeekBadge } from "@/components/shared/WeekBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { SetTypeBadge } from "@/components/workout/SetTypeBadge";
import { MuscleGroupTag } from "@/components/shared/MuscleGroupTag";

const RPE_CHOICES: RPE[] = [7, 8, 9, 10];

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { workoutId: raw } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Array.isArray(raw) ? raw[0] : raw;

  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [warmups, setWarmups] = useState<WarmupSet[]>([]);
  const [editing, setEditing] = useState<LoggedSet | null>(null);

  const refresh = useCallback(() => {
    if (!workoutId) return;
    const w = getWorkout(workoutId);
    setWorkout(w);
    if (!w) {
      setSets([]);
      setWarmups([]);
      return;
    }
    setSets(getLoggedSetsForWorkout(workoutId));
    setWarmups(getWarmupSetsForWorkout(workoutId));
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const grouped = useMemo(() => {
    if (!workout) return [];
    const day = PROGRAM.days.find((d) => d.id === workout.dayId);
    const orderIds = day?.exercises.map((e) => e.id) ?? [];

    const byId = new Map<string, LoggedSet[]>();
    for (const s of sets) {
      const list = byId.get(s.exerciseId) ?? [];
      list.push(s);
      byId.set(s.exerciseId, list);
    }
    // Sort each bucket by setIndex.
    for (const list of byId.values()) {
      list.sort((a, b) => a.setIndex - b.setIndex);
    }

    const ordered: { exerciseId: string; sets: LoggedSet[] }[] = [];
    const seen = new Set<string>();

    for (const id of orderIds) {
      if (byId.has(id)) {
        ordered.push({ exerciseId: id, sets: byId.get(id)! });
        seen.add(id);
      }
    }
    // Tail: any exercises not in the day definition (e.g. older data).
    for (const [id, list] of byId) {
      if (!seen.has(id)) ordered.push({ exerciseId: id, sets: list });
    }
    return ordered;
  }, [sets, workout]);

  const warmupsByExercise = useMemo(() => {
    const map = new Map<string, WarmupSet[]>();
    for (const w of warmups) {
      const list = map.get(w.exerciseId) ?? [];
      list.push(w);
      map.set(w.exerciseId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.setIndex - b.setIndex);
    return map;
  }, [warmups]);

  function confirmDeleteWorkout() {
    if (!workout) return;
    Alert.alert(
      "Delete permanently?",
      `This will erase ${workout.dayName} from ${formatDate(workout.startedAt)} and every set logged in it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Really?",
              "Last chance. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    deleteWorkout(workout.id);
                    router.back();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  if (!workout) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg }}
        edges={["top", "left", "right"]}
      >
        <Header
          onBack={() => router.back()}
          title="Workout"
          onDelete={null}
        />
        <EmptyState
          title="Workout not found"
          subtitle="This workout may have been deleted."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "left", "right"]}
    >
      <Header
        onBack={() => router.back()}
        title={workout.dayName}
        onDelete={confirmDeleteWorkout}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 48,
          gap: spacing.md,
        }}
      >
        {/* Header meta: week badge + date + feeling */}
        <View style={{ gap: spacing.xs }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: spacing.xs,
            }}
          >
            <WeekBadge week={workout.weekNumber} phaseId={workout.phase} />
            {workout.feeling ? (
              <Text style={{ fontSize: 22 }}>
                {feelingEmoji[workout.feeling]}
              </Text>
            ) : null}
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
            {formatDateTime(workout.startedAt)}
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <StatCard
            label="Duration"
            value={
              workout.durationSeconds
                ? formatDuration(workout.durationSeconds)
                : "—"
            }
          />
          <StatCard
            label="Sets"
            value={`${workout.completedSets}/${workout.totalSets}`}
          />
          <StatCard
            label="Volume"
            value={formatVolume(workout.totalVolume, unit)}
            tone="primary"
          />
        </View>

        {/* Exercises */}
        {grouped.length === 0 ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <EmptyState
              title="No sets logged"
              subtitle="This workout finished without any recorded sets."
            />
          </View>
        ) : (
          grouped.map((group) => (
            <ExerciseGroup
              key={group.exerciseId}
              exerciseId={group.exerciseId}
              sets={group.sets}
              warmups={warmupsByExercise.get(group.exerciseId) ?? []}
              unit={unit}
              onEditSet={setEditing}
            />
          ))
        )}

        {/* Session notes */}
        {workout.notes ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: 4,
            }}
          >
            <Text
              style={{
                ...typography.overline,
                color: colors.textSecondary,
              }}
            >
              Session notes
            </Text>
            <Text style={{ ...typography.body, color: colors.textPrimary }}>
              {workout.notes}
            </Text>
          </View>
        ) : null}

        {/* Footer timestamps */}
        <View style={{ gap: 2, marginTop: spacing.sm }}>
          <Text style={{ ...typography.caption, color: colors.textTertiary }}>
            {`Started ${formatDateTime(workout.startedAt)}`}
          </Text>
          {workout.completedAt ? (
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              {`Completed ${formatDateTime(workout.completedAt)}`}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <EditSetModal
        set={editing}
        unit={unit}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
        onDeleted={() => {
          refresh();
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}

// --------------------------------------------------------------------------

function Header({
  onBack,
  title,
  onDelete,
}: {
  onBack: () => void;
  title: string;
  onDelete: (() => void) | null;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: spacing.xs,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        })}
      >
        <ChevronLeft size={24} color={colors.textPrimary} />
        <Text style={{ ...typography.body, color: colors.textPrimary }}>
          Back
        </Text>
      </Pressable>
      <Text
        style={{ ...typography.h3, color: colors.textPrimary }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Trash2 size={20} color={colors.error} />
        </Pressable>
      ) : (
        <View style={{ width: 20 }} />
      )}
    </View>
  );
}

// --------------------------------------------------------------------------

function ExerciseGroup({
  exerciseId,
  sets,
  warmups,
  unit,
  onEditSet,
}: {
  exerciseId: string;
  sets: LoggedSet[];
  warmups: WarmupSet[];
  unit: "kg" | "lb";
  onEditSet: (s: LoggedSet) => void;
}) {
  const meta = getExercise(exerciseId);
  const name = getExerciseName(exerciseId);
  const substitution = sets.find((s) => s.exerciseSubstitution)
    ?.exerciseSubstitution;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text style={{ ...typography.h3, color: colors.textPrimary }}>
        {name}
      </Text>
      {meta?.targetMuscles?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {meta.targetMuscles.map((m) => (
            <MuscleGroupTag key={m} group={m} />
          ))}
        </View>
      ) : null}
      {substitution ? (
        <Text
          style={{
            ...typography.caption,
            color: colors.warning,
          }}
        >
          {`Logged as: ${substitution}`}
        </Text>
      ) : null}

      {warmups.length > 0 ? (
        <View style={{ opacity: 0.5, marginTop: spacing.xs, gap: 2 }}>
          <Text style={{ ...typography.overline, color: colors.textSecondary }}>
            Warmup
          </Text>
          {warmups.map((w) => (
            <Text
              key={w.id}
              style={{ ...typography.bodySmall, color: colors.textSecondary }}
            >
              {`${formatWeight(w.weight, unit)} × ${w.reps}`}
            </Text>
          ))}
        </View>
      ) : null}

      {sets.length > 0 ? (
        <View style={{ marginTop: spacing.xs, gap: 2 }}>
          {sets.map((s, i) => (
            <SetRow
              key={s.id}
              set={s}
              displayIndex={i + 1}
              unit={unit}
              onPress={() => onEditSet(s)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// --------------------------------------------------------------------------

function SetRow({
  set,
  displayIndex,
  unit,
  onPress,
}: {
  set: LoggedSet;
  displayIndex: number;
  unit: "kg" | "lb";
  onPress: () => void;
}) {
  const rpe = set.actualRpe ?? set.targetRpe;
  const rpeColor = rpeColors[rpe as RPE] ?? colors.textSecondary;

  let statusLabel = "";
  let statusColor: string = colors.textTertiary;
  if (set.skipped) {
    statusLabel = "Skipped";
    statusColor = colors.warning;
  } else if (set.completed) {
    statusLabel = "✓";
    statusColor = colors.success;
  } else {
    statusLabel = "✗";
    statusColor = colors.error;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: radius.sm,
        backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
      })}
    >
      <Text
        style={{
          ...typography.caption,
          color: colors.textTertiary,
          width: 22,
        }}
      >
        {displayIndex}
      </Text>

      {set.setType !== "normal" ? (
        <SetTypeBadge type={set.setType} />
      ) : null}

      <Text
        style={{
          ...typography.body,
          color: colors.textPrimary,
          flex: 1,
        }}
      >
        {set.skipped
          ? "—"
          : `${formatWeight(set.weight, unit)} × ${set.completedReps}`}
      </Text>

      <Text
        style={{
          ...typography.caption,
          color: rpeColor,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {`@${rpe}`}
      </Text>
      <Text
        style={{
          ...typography.caption,
          color: statusColor,
          minWidth: 48,
          textAlign: "right",
        }}
      >
        {statusLabel}
      </Text>
    </Pressable>
  );
}

// --------------------------------------------------------------------------

function EditSetModal({
  set,
  unit,
  onClose,
  onSaved,
  onDeleted,
}: {
  set: LoggedSet | null;
  unit: "kg" | "lb";
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [weightStr, setWeightStr] = useState("");
  const [repsStr, setRepsStr] = useState("");
  const [rpe, setRpe] = useState<RPE>(9);
  const [completed, setCompleted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [notes, setNotes] = useState("");

  const visible = set != null;

  React.useEffect(() => {
    if (!set) return;
    setWeightStr(String(displayWeight(set.weight, unit)));
    setRepsStr(String(set.completedReps));
    const initialRpe = (set.actualRpe ?? set.targetRpe) as RPE;
    setRpe(
      ([7, 8, 9, 10] as RPE[]).includes(initialRpe) ? initialRpe : 9,
    );
    setCompleted(set.completed);
    setSkipped(set.skipped);
    setNotes(set.notes ?? "");
  }, [set, unit]);

  function handleSave() {
    if (!set) return;
    const weightNum = parseFloat(weightStr.replace(",", "."));
    const repsNum = parseInt(repsStr, 10);
    const patch: Partial<LoggedSet> = {
      weight: Number.isNaN(weightNum)
        ? set.weight
        : storageWeight(weightNum, unit),
      completedReps: Number.isNaN(repsNum) ? set.completedReps : repsNum,
      actualRpe: rpe,
      completed,
      skipped,
      notes: notes.trim().length > 0 ? notes.trim() : undefined,
    };
    updateLoggedSet(set.id, patch);
    onSaved();
  }

  function handleDelete() {
    if (!set) return;
    Alert.alert(
      "Delete set?",
      "Remove this set from the workout permanently.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Really?",
              "This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    deleteLoggedSet(set.id);
                    onDeleted();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <X size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={{ ...typography.h3, color: colors.textPrimary }}>
            Edit Set
          </Text>
          <Pressable
            onPress={handleSave}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Save size={18} color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.primary }}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 16,
            gap: spacing.md,
            paddingBottom: 48,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Field label={`Weight (${unit})`}>
            <TextInput
              value={weightStr}
              onChangeText={setWeightStr}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
            />
          </Field>

          <Field label="Reps">
            <TextInput
              value={repsStr}
              onChangeText={setRepsStr}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
            />
          </Field>

          <Field label="RPE">
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {RPE_CHOICES.map((r) => {
                const active = rpe === r;
                const tint = rpeColors[r];
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRpe(r)}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: radius.pill,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: active ? tint : colors.border,
                      backgroundColor: active
                        ? `${tint}26`
                        : pressed
                          ? colors.surfaceOverlay
                          : colors.surface,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: active ? tint : colors.textSecondary,
                        fontWeight: active ? "600" : "400",
                      }}
                    >
                      {`@${r}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <ToggleRow
            label="Completed"
            value={completed}
            onChange={(v) => {
              setCompleted(v);
              if (v) setSkipped(false);
            }}
          />
          <ToggleRow
            label="Skipped"
            value={skipped}
            onChange={(v) => {
              setSkipped(v);
              if (v) setCompleted(false);
            }}
          />

          <Field label="Notes">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Grip gave out, left shoulder tight, etc."
              placeholderTextColor={colors.textTertiary}
              style={{
                ...inputStyle,
                minHeight: 80,
                textAlignVertical: "top",
                paddingTop: 12,
              }}
            />
          </Field>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => ({
              marginTop: spacing.lg,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: pressed
                ? colors.surfaceOverlay
                : colors.errorMuted,
              borderWidth: 1,
              borderColor: colors.error,
            })}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={{ ...typography.body, color: colors.error }}>
              Delete Set
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...typography.overline, color: colors.textSecondary }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <Text style={{ ...typography.body, color: colors.textPrimary }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  color: colors.textPrimary,
  fontSize: 16,
} as const;

import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { TrendingUp, TrendingDown, Trash2 } from "lucide-react-native";
import { format } from "date-fns";

import type { BodyMetric, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { APP_CONFIG } from "@/constants/config";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  upsertBodyMetric,
  getBodyMetrics,
  getBodyMetricByDate,
  deleteBodyMetric,
} from "@/db/queries";
import { formatWeight, displayWeight, storageWeight } from "@/utils/formatters";
import { BodyChart } from "@/components/progress/BodyChart";
import { StatCard } from "@/components/shared/StatCard";

type ChartWindow = 30 | 60 | 90;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WINDOWS: ChartWindow[] = [30, 60, 90];
const DAY_MS = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);

function parsePositive(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function signed(n: number, unit: WeightUnit) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${formatWeight(Math.abs(n), unit)}`;
}
function changeTone(n: number | null | undefined) {
  if (n == null) return "default" as const;
  if (n < 0) return "success" as const;
  if (n > 0) return "warning" as const;
  return "default" as const;
}

export default function BodyScreen() {
  const unit = useSettingsStore((s) => s.settings.weightUnit);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [date, setDate] = useState<string>(todayIso());
  const [weightInput, setWeightInput] = useState("");
  const [smmInput, setSmmInput] = useState("");
  const [waistInput, setWaistInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [chartWindow, setChartWindow] = useState<ChartWindow>(90);

  const refresh = useCallback(() => {
    try { setMetrics(getBodyMetrics()); } catch { setMetrics([]); }
  }, []);

  const prefillForDate = useCallback((iso: string) => {
    if (!ISO_DATE_RE.test(iso)) return;
    try {
      const ex = getBodyMetricByDate(iso);
      setWeightInput(ex?.weight != null ? String(displayWeight(ex.weight, unit)) : "");
      setSmmInput(ex?.skeletalMuscleMass != null ? String(ex.skeletalMuscleMass) : "");
      setWaistInput(ex?.waist != null ? String(ex.waist) : "");
      setNotesInput(ex?.notes ?? "");
    } catch { /* db not ready */ }
  }, [unit]);

  useFocusEffect(useCallback(() => {
    refresh();
    prefillForDate(date);
  }, [refresh, prefillForDate, date]));

  function onDateBlur() {
    if (!ISO_DATE_RE.test(date) || Number.isNaN(new Date(date).getTime())) {
      Alert.alert("Invalid date", "Please use YYYY-MM-DD.");
      const t = todayIso(); setDate(t); prefillForDate(t); return;
    }
    prefillForDate(date);
  }

  function onSave() {
    if (!ISO_DATE_RE.test(date)) { Alert.alert("Invalid date", "Please use YYYY-MM-DD."); return; }
    const wDisplay = parsePositive(weightInput);
    try {
      upsertBodyMetric({
        date,
        weight: wDisplay != null ? storageWeight(wDisplay, unit) : undefined,
        skeletalMuscleMass: parsePositive(smmInput),
        waist: parsePositive(waistInput),
        notes: notesInput.trim() ? notesInput.trim() : undefined,
      });
      Alert.alert("Saved.");
      refresh();
    } catch (err) { Alert.alert("Save failed", String(err)); }
  }

  function onDeleteEntry(m: BodyMetric) {
    Alert.alert("Delete entry",
      `Remove the entry for ${format(new Date(m.date), "MMM d, yyyy")}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          try {
            deleteBodyMetric(m.id);
            refresh();
            if (m.date === date) prefillForDate(date);
          } catch (err) { Alert.alert("Delete failed", String(err)); }
        } },
      ]);
  }

  const weighed = useMemo(() => metrics.filter((m) => m.weight != null), [metrics]);
  const current = weighed[0];
  const oldest = weighed[weighed.length - 1];

  const changeWeek = useMemo<number | null>(() => {
    if (!current || weighed.length < 2) return null;
    const ct = new Date(current.date).getTime();
    const target = ct - 7 * DAY_MS;
    let best: BodyMetric | null = null; let bestD = Infinity;
    for (const m of weighed) {
      const t = new Date(m.date).getTime();
      if (t > ct) continue;
      const d = Math.abs(t - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best || best.id === current.id) return null;
    return (current.weight as number) - (best.weight as number);
  }, [current, weighed]);

  const chartMetrics = useMemo(() => {
    const cutoff = Date.now() - chartWindow * DAY_MS;
    return metrics.filter((m) => new Date(m.date).getTime() >= cutoff);
  }, [metrics, chartWindow]);

  const summary = useMemo(() => {
    const startingKg = oldest?.weight;
    const currentKg = current?.weight;
    const totalChange = startingKg != null && currentKg != null ? currentKg - startingKg : undefined;
    let avgWeekly: number | undefined;
    if (totalChange != null && oldest && current && oldest.id !== current.id) {
      const weeks = (new Date(current.date).getTime() - new Date(oldest.date).getTime()) / (7 * DAY_MS);
      if (weeks > 0) avgWeekly = totalChange / weeks;
    }
    return { starting: startingKg, currentKg, totalChange, avgWeekly, daysTracked: metrics.length };
  }, [oldest, current, metrics.length]);

  const recent = weighed.slice(0, 10);
  const totalChangeTrend =
    summary.totalChange == null ? undefined :
    summary.totalChange < 0 ? "Trending down" :
    summary.totalChange > 0 ? "Trending up" : "No change";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary }}>Body</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input card */}
        <View style={cardStyle}>
          <Text style={{ ...typography.h2, color: colors.textPrimary }}>Log Today's Metrics</Text>
          <FieldRow label="Date">
            <TextInput
              value={date} onChangeText={setDate} onBlur={onDateBlur}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary}
              autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation"
              style={inputStyle}
            />
          </FieldRow>
          <NumericField label="Weight" suffix={unit} value={weightInput} onChange={setWeightInput} />
          <NumericField label="Skeletal Muscle Mass" suffix="kg" value={smmInput} onChange={setSmmInput} />
          <NumericField label="Waist" suffix="cm" value={waistInput} onChange={setWaistInput} />
          <View style={{ gap: 6 }}>
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>NOTES</Text>
            <TextInput
              value={notesInput} onChangeText={setNotesInput}
              placeholder="How did you feel today?" placeholderTextColor={colors.textTertiary}
              multiline numberOfLines={3}
              style={{ ...inputStyle, minHeight: 72, textAlign: "left", textAlignVertical: "top", paddingVertical: spacing.sm }}
            />
          </View>
          <Pressable
            onPress={onSave}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              borderRadius: radius.md, paddingVertical: spacing.sm,
              alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: spacing["2xs"],
            })}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Save</Text>
          </Pressable>
        </View>

        {/* Quick stats */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <StatCard label="Current" value={current?.weight != null ? formatWeight(current.weight, unit) : "—"} />
          <StatCard
            label="Change"
            value={changeWeek != null ? signed(changeWeek, unit) : "—"}
            trend={changeWeek != null ? "vs. 7 days ago" : undefined}
            tone={changeTone(changeWeek)}
          />
          <StatCard label="Goal" value={formatWeight(APP_CONFIG.goalWeightKg, unit)} />
        </View>

        {/* Chart + window toggle */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            {WINDOWS.map((w) => {
              const active = chartWindow === w;
              return (
                <Pressable key={w} onPress={() => setChartWindow(w)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primaryMuted : colors.surface,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...typography.caption, color: active ? colors.primary : colors.textSecondary }}>{`${w}d`}</Text>
                </Pressable>
              );
            })}
          </View>
          <BodyChart metrics={chartMetrics} goalWeightKg={APP_CONFIG.goalWeightKg} unit={unit} />
        </View>

        {/* Recent entries */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.overline, color: colors.textSecondary }}>Recent Entries</Text>
          {recent.length === 0 ? (
            <View style={cardStyle}>
              <Text style={{ ...typography.body, color: colors.textSecondary }}>
                No entries yet. Log your first weigh-in above.
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.card, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border, overflow: "hidden",
            }}>
              {recent.map((m, i) => (
                <EntryRow
                  key={m.id} metric={m} unit={unit}
                  isLast={i === recent.length - 1}
                  onDelete={() => onDeleteEntry(m)}
                />
              ))}
            </View>
          )}
          {recent.length > 0 ? (
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              Long-press or tap the trash icon to delete an entry.
            </Text>
          ) : null}
        </View>

        {/* Summary */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ ...typography.overline, color: colors.textSecondary }}>Summary</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatCard label="Starting" value={summary.starting != null ? formatWeight(summary.starting, unit) : "—"} />
            <StatCard label="Current" value={summary.currentKg != null ? formatWeight(summary.currentKg, unit) : "—"} />
            <StatCard label="Goal" value={formatWeight(APP_CONFIG.goalWeightKg, unit)} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatCard
              label="Total Change"
              value={summary.totalChange != null ? signed(summary.totalChange, unit) : "—"}
              tone={changeTone(summary.totalChange)}
              trend={totalChangeTrend}
            />
            <StatCard
              label="Avg Weekly"
              value={summary.avgWeekly != null ? signed(summary.avgWeekly, unit) : "—"}
              tone={changeTone(summary.avgWeekly)}
            />
            <StatCard label="Days Tracked" value={String(summary.daysTracked)} />
          </View>
          {summary.totalChange != null && summary.totalChange !== 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing["2xs"] }}>
              {summary.totalChange < 0
                ? <TrendingDown size={14} color={colors.success} />
                : <TrendingUp size={14} color={colors.warning} />}
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                {`${formatWeight(Math.abs(summary.totalChange), unit)} ${summary.totalChange < 0 ? "lost" : "gained"} since first entry`}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Primitives -------------------------------------------------------------

const inputStyle = {
  color: colors.textPrimary, backgroundColor: colors.surface,
  borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
  paddingHorizontal: spacing.sm, paddingVertical: 6,
  minWidth: 120, textAlign: "center" as const, ...typography.dataSmall,
};
const cardStyle = {
  backgroundColor: colors.card, borderRadius: radius.md,
  borderWidth: 1, borderColor: colors.border,
  padding: spacing.md, gap: spacing.sm,
};

function FieldRow({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
      <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {children}
        {suffix ? (
          <Text style={{ ...typography.caption, color: colors.textSecondary, minWidth: 24 }}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

function NumericField({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (s: string) => void }) {
  return (
    <FieldRow label={label} suffix={suffix}>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType="decimal-pad" placeholder="0.0"
        placeholderTextColor={colors.textTertiary} style={inputStyle}
      />
    </FieldRow>
  );
}

function EntryRow({ metric, unit, isLast, onDelete }: { metric: BodyMetric; unit: WeightUnit; isLast: boolean; onDelete: () => void }) {
  return (
    <Pressable
      onLongPress={onDelete}
      style={({ pressed }) => ({
        padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.divider,
        backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.body, color: colors.textPrimary }}>
          {format(new Date(metric.date), "EEE, MMM d, yyyy")}
        </Text>
        {metric.notes ? (
          <Text numberOfLines={1} style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>
            {metric.notes}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text style={{ ...typography.dataMedium, color: colors.textPrimary }}>
          {formatWeight(metric.weight as number, unit)}
        </Text>
        <Pressable hitSlop={8} onPress={onDelete} style={{ padding: 4 }}>
          <Trash2 color={colors.textTertiary} size={16} />
        </Pressable>
      </View>
    </Pressable>
  );
}

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, X } from "lucide-react-native";

import type { AppSettings, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { useSettingsStore } from "@/stores/settingsStore";
import { PlateCalc } from "@/components/shared/PlateCalc";
import {
  exportAllAsJson,
  exportWorkoutsAsCsv,
  parseBodyWeightCsv,
} from "@/utils/export";
import { shareText, pickTextFile } from "@/utils/fileIo";
import { upsertBodyMetric } from "@/db/queries";

export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);

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
        }}
      >
        <Text style={{ ...typography.h1, color: colors.textPrimary }}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ProgramSection settings={settings} update={update} />
        <UnitsSection settings={settings} update={update} />
        <RestTimerSection settings={settings} update={update} />
        <PlateSection settings={settings} update={update} />
        <DataSection onReset={reset} />
        <AboutSection />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Section primitives
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text
        style={{
          ...typography.overline,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        }}
      >
        <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>
          {label}
        </Text>
        <View>{children}</View>
      </View>
      {hint ? (
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

function ProgramSection({
  settings,
  update,
}: {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const [date, setDate] = useState(settings.programStartDate);

  function commit() {
    // Basic ISO date validation: YYYY-MM-DD
    const match = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!match) {
      Alert.alert(
        "Invalid date",
        "Please use YYYY-MM-DD (e.g. 2026-04-23).",
      );
      setDate(settings.programStartDate);
      return;
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert("Invalid date", "That's not a real date.");
      setDate(settings.programStartDate);
      return;
    }
    update("programStartDate", date);
  }

  return (
    <Section title="Program">
      <Row
        label="Program Start Date"
        hint="Used to calculate current week and phase."
      >
        <TextInput
          value={date}
          onChangeText={setDate}
          onBlur={commit}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          style={{
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            minWidth: 130,
            textAlign: "center",
            ...typography.dataSmall,
          }}
        />
      </Row>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

function UnitsSection({
  settings,
  update,
}: {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const units: WeightUnit[] = ["kg", "lb"];
  return (
    <Section title="Units">
      <Row label="Weight unit">
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          {units.map((u) => {
            const active = settings.weightUnit === u;
            return (
              <Pressable
                key={u}
                onPress={() => update("weightUnit", u)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: spacing.md,
                  backgroundColor: active ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: active ? colors.textInverse : colors.textSecondary,
                  }}
                >
                  {u.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Row>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Rest timer
// ---------------------------------------------------------------------------

function RestTimerSection({
  settings,
  update,
}: {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  return (
    <Section title="Rest Timer">
      <Row label="Vibrate on done">
        <Switch
          value={settings.restTimerVibrate}
          onValueChange={(v) => update("restTimerVibrate", v)}
          trackColor={{ false: colors.surfaceOverlay, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      </Row>
      <Row label="Sound on done">
        <Switch
          value={settings.restTimerSound}
          onValueChange={(v) => update("restTimerSound", v)}
          trackColor={{ false: colors.surfaceOverlay, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      </Row>
      <NumericRow
        label="Compound rest (s)"
        value={settings.compoundRestSeconds}
        onCommit={(v) => update("compoundRestSeconds", v)}
      />
      <NumericRow
        label="Moderate rest (s)"
        value={settings.moderateRestSeconds}
        onCommit={(v) => update("moderateRestSeconds", v)}
      />
      <NumericRow
        label="Isolation rest (s)"
        value={settings.isolationRestSeconds}
        onCommit={(v) => update("isolationRestSeconds", v)}
      />
    </Section>
  );
}

function NumericRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));

  return (
    <Row label={label}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => {
          const parsed = parseInt(text, 10);
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
          else setText(String(value));
        }}
        keyboardType="number-pad"
        style={{
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          minWidth: 80,
          textAlign: "center",
          ...typography.dataSmall,
        }}
      />
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Plate calculator
// ---------------------------------------------------------------------------

function PlateSection({
  settings,
  update,
}: {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}) {
  const [plates, setPlates] = useState(settings.plateSet.join(","));
  const [bar, setBar] = useState(String(settings.barWeight));
  const [calcOpen, setCalcOpen] = useState(false);

  function commitPlates() {
    const parsed = plates
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseFloat(s))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parsed.length === 0) {
      Alert.alert("Invalid plates", "Enter at least one positive number, comma-separated.");
      setPlates(settings.plateSet.join(","));
      return;
    }
    update("plateSet", parsed.sort((a, b) => a - b));
    setPlates(parsed.sort((a, b) => a - b).join(","));
  }

  function commitBar() {
    const parsed = parseFloat(bar);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBar(String(settings.barWeight));
      return;
    }
    update("barWeight", parsed);
  }

  return (
    <Section title="Plate Calculator">
      <Row label="Available plates (kg)" hint="Comma-separated.">
        <TextInput
          value={plates}
          onChangeText={setPlates}
          onBlur={commitPlates}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          style={{
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            minWidth: 160,
            textAlign: "center",
            ...typography.dataSmall,
          }}
        />
      </Row>
      <Row label="Bar weight (kg)">
        <TextInput
          value={bar}
          onChangeText={setBar}
          onBlur={commitBar}
          keyboardType="decimal-pad"
          style={{
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            minWidth: 80,
            textAlign: "center",
            ...typography.dataSmall,
          }}
        />
      </Row>
      <View style={{ padding: spacing.md }}>
        <Pressable
          onPress={() => setCalcOpen(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.sm + 2,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text
            style={{
              ...typography.h3,
              color: colors.textInverse,
              fontWeight: "700",
            }}
          >
            Open Plate Calculator
          </Text>
        </Pressable>
      </View>
      <Modal
        visible={calcOpen}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setCalcOpen(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.bg }}
          edges={["top", "left", "right"]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ ...typography.h2, color: colors.textPrimary }}>
              Plate Calculator
            </Text>
            <Pressable
              onPress={() => setCalcOpen(false)}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? colors.surfaceOverlay
                  : "transparent",
              })}
            >
              <X color={colors.textPrimary} size={22} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <PlateCalc initialWeightKg={settings.barWeight + 40} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

function DataSection({ onReset }: { onReset: () => void }) {
  const today = new Date().toISOString().slice(0, 10);

  async function exportJson() {
    try {
      const ok = await shareText(
        `minmax-${today}.json`,
        exportAllAsJson(),
        "application/json",
      );
      if (!ok) {
        Alert.alert("Sharing not available on this device");
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : String(err));
    }
  }

  async function exportCsv() {
    try {
      const ok = await shareText(
        `minmax-${today}.csv`,
        exportWorkoutsAsCsv(),
        "text/csv",
      );
      if (!ok) {
        Alert.alert("Sharing not available on this device");
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : String(err));
    }
  }

  async function importBodyCsv() {
    try {
      const text = await pickTextFile();
      if (text === null) return; // user canceled
      const rows = parseBodyWeightCsv(text);
      if (rows.length === 0) {
        Alert.alert("No valid rows found");
        return;
      }
      for (const row of rows) {
        upsertBodyMetric({ date: row.date, weight: row.weight });
      }
      Alert.alert(`Imported ${rows.length} entries.`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : String(err));
    }
  }

  function handleReset() {
    Alert.alert(
      "Reset everything?",
      "This clears ALL settings to defaults. Your workout history is preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I'm sure",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Really sure?",
              "Last chance. Settings will revert to defaults.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: () => onReset(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <Section title="Data">
      <ActionRow label="Export data (JSON)" onPress={exportJson} />
      <ActionRow label="Export workouts (CSV)" onPress={exportCsv} />
      <ActionRow label="Import body weight (CSV)" onPress={importBodyCsv} />
      <ActionRow
        label="Reset program"
        onPress={handleReset}
        destructive
      />
    </Section>
  );
}

function ActionRow({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      <Text
        style={{
          ...typography.body,
          color: destructive ? colors.error : colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <ChevronRight
        color={destructive ? colors.error : colors.textTertiary}
        size={18}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

function AboutSection() {
  return (
    <Section title="About">
      <Row label="Version">
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
          1.0.0-dev
        </Text>
      </Row>
      <Row label="Program">
        <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
          Min-Max 4x
        </Text>
      </Row>
    </Section>
  );
}

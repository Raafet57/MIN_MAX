import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

import { colors } from "@/constants/colors";
import { typography, spacing, radius, touchTarget } from "@/constants/layout";
import { useSettingsStore } from "@/stores/settingsStore";
import { platesFor } from "@/utils/plateCalc";
import {
  displayWeight,
  storageWeight,
  formatWeight,
} from "@/utils/formatters";

interface Props {
  initialWeightKg?: number;
}

const PLATE_PALETTE = [
  colors.secondary,
  colors.primary,
  colors.warning,
  colors.tertiary,
  colors.success,
  colors.error,
];

const STEPS_DISPLAY = [-2.5, -1.25, 1.25, 2.5];

function plateColor(weight: number, uniqueSizes: number[]): string {
  const idx = uniqueSizes.indexOf(weight);
  if (idx < 0) return colors.textTertiary;
  return PLATE_PALETTE[idx % PLATE_PALETTE.length];
}

function plateWidth(weightKg: number): number {
  const raw = weightKg * 10;
  return Math.max(20, Math.min(50, raw));
}

function formatKgNumber(n: number): string {
  const r = Math.round(n * 100) / 100;
  return r.toFixed(r % 1 === 0 ? 0 : r * 10 % 1 === 0 ? 1 : 2);
}

export function PlateCalc({ initialWeightKg }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const { weightUnit, plateSet, barWeight } = settings;

  const prefillKg = initialWeightKg ?? barWeight + 40;
  const [text, setText] = useState(String(displayWeight(prefillKg, weightUnit)));

  const parsedDisplay = parseFloat(text);
  const isValid = Number.isFinite(parsedDisplay) && parsedDisplay > 0;
  const targetKg = isValid ? storageWeight(parsedDisplay, weightUnit) : NaN;
  const belowBar = isValid && targetKg < barWeight - 1e-6;

  const uniqueSizesDesc = useMemo(
    () =>
      Array.from(new Set(plateSet))
        .filter((p) => p > 0)
        .sort((a, b) => b - a),
    [plateSet],
  );

  const breakdown = useMemo(() => {
    if (!isValid || belowBar) {
      return { plates: [] as number[], perSide: [] as number[], remaining: 0 };
    }
    const clamped = Math.min(1000, Math.max(barWeight, targetKg));
    return platesFor(clamped, barWeight, plateSet);
  }, [isValid, belowBar, targetKg, barWeight, plateSet]);

  const totalKg =
    barWeight + 2 * breakdown.plates.reduce((sum, p) => sum + p, 0);

  function bumpDisplay(delta: number) {
    const current = Number.isFinite(parsedDisplay)
      ? parsedDisplay
      : displayWeight(prefillKg, weightUnit);
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setText(String(next));
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {/* --- Top input row --- */}
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            ...typography.overline,
            color: colors.textSecondary,
          }}
        >
          Target weight
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            style={{
              flex: 1,
              color: colors.textPrimary,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              textAlign: "center",
              ...typography.dataLarge,
            }}
          />
          <Text
            style={{
              ...typography.h3,
              color: colors.textSecondary,
              minWidth: 28,
            }}
          >
            {weightUnit}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: spacing.xs,
          }}
        >
          {STEPS_DISPLAY.map((d) => (
            <Pressable
              key={d}
              onPress={() => bumpDisplay(d)}
              style={({ pressed }) => ({
                width: touchTarget.min,
                height: touchTarget.min,
                flex: 1,
                borderRadius: radius.sm,
                backgroundColor: pressed
                  ? colors.surfaceOverlay
                  : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  color: d > 0 ? colors.success : colors.error,
                  fontWeight: "600",
                }}
              >
                {d > 0 ? `+${d}` : d}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* --- Bar visualization --- */}
      {!isValid ? (
        <View
          style={{
            padding: spacing.lg,
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ ...typography.body, color: colors.textTertiary }}>
            Enter a target weight to see the breakdown
          </Text>
        </View>
      ) : belowBar ? (
        <View
          style={{
            padding: spacing.lg,
            alignItems: "center",
            backgroundColor: colors.errorMuted,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.error,
          }}
        >
          <Text style={{ ...typography.body, color: colors.error }}>
            Target must be at least the bar weight (
            {formatWeight(barWeight, weightUnit)})
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {breakdown.remaining > 1e-6 ? (
            <View
              style={{
                alignSelf: "center",
                backgroundColor: colors.warningMuted,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: colors.warning,
              }}
            >
              <Text
                style={{ ...typography.caption, color: colors.warning }}
              >
                Can&apos;t reach exactly — off by{" "}
                {formatKgNumber(breakdown.remaining)} kg
              </Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.sm,
              minHeight: 100,
            }}
          >
            {/* Left plates (mirrored, so reverse order: lightest-first toward center) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {[...breakdown.plates].reverse().map((p, i) => (
                <PlateView
                  key={`L-${i}-${p}`}
                  weightKg={p}
                  uniqueSizes={uniqueSizesDesc}
                />
              ))}
            </View>

            {/* Center bar */}
            <View
              style={{
                width: 120,
                height: 6,
                backgroundColor: colors.textTertiary,
                borderRadius: 3,
              }}
            />

            {/* Right plates (heaviest toward center) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              {breakdown.plates.map((p, i) => (
                <PlateView
                  key={`R-${i}-${p}`}
                  weightKg={p}
                  uniqueSizes={uniqueSizesDesc}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* --- Breakdown text --- */}
      {isValid && !belowBar ? (
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
          <Text style={{ ...typography.body, color: colors.textPrimary }}>
            Bar: {formatWeight(barWeight, weightUnit)}
          </Text>
          <Text style={{ ...typography.body, color: colors.textPrimary }}>
            Per side:{" "}
            {breakdown.plates.length > 0
              ? `${breakdown.plates.map(formatKgNumber).join(" + ")} kg`
              : "— (empty bar)"}
          </Text>
          <Text style={{ ...typography.body, color: colors.textPrimary }}>
            Total: {formatWeight(totalKg, weightUnit)}
          </Text>
          {breakdown.remaining > 1e-6 ? (
            <Text style={{ ...typography.bodySmall, color: colors.warning }}>
              Unmatched: +{formatKgNumber(breakdown.remaining)} kg
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* --- Inventory footer --- */}
      <Text
        style={{
          ...typography.bodySmall,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        Plates available:{" "}
        {uniqueSizesDesc
          .slice()
          .sort((a, b) => a - b)
          .map(formatKgNumber)
          .join(", ")}{" "}
        kg
      </Text>
    </View>
  );
}

function PlateView({
  weightKg,
  uniqueSizes,
}: {
  weightKg: number;
  uniqueSizes: number[];
}) {
  const w = plateWidth(weightKg);
  const bg = plateColor(weightKg, uniqueSizes);
  const rotate = w < 30;
  return (
    <View
      style={{
        width: w,
        height: 60,
        backgroundColor: bg,
        marginHorizontal: 1,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          ...typography.dataSmall,
          color: colors.textInverse,
          fontWeight: "700",
          transform: rotate ? [{ rotate: "90deg" }] : undefined,
        }}
        numberOfLines={1}
      >
        {formatKgNumber(weightKg)}
      </Text>
    </View>
  );
}

export default PlateCalc;

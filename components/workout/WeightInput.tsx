import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

import type { WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";
import { displayWeight, storageWeight } from "@/utils/formatters";

interface Props {
  value: number; // stored in kg
  unit: WeightUnit;
  increment: number; // in DISPLAY units (convert on the way in if needed)
  onChange(next: number): void; // receives kg-stored value
  placeholder?: string;
}

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Numeric weight input with flanking +/- steppers. Operates in display units;
 * commits back to kg on blur/step.
 */
export function WeightInput({
  value,
  unit,
  increment,
  onChange,
  placeholder,
}: Props) {
  const initial = value > 0 ? String(displayWeight(value, unit)) : "";
  const [text, setText] = useState<string>(initial);

  useEffect(() => {
    setText(value > 0 ? String(displayWeight(value, unit)) : "");
  }, [value, unit]);

  function commitDisplay(display: number) {
    const clamped = Math.max(0, display);
    onChange(storageWeight(roundToTenth(clamped), unit));
  }

  function onBlur() {
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed) || parsed < 0) {
      onChange(0);
      setText("");
      return;
    }
    commitDisplay(parsed);
    setText(String(roundToTenth(parsed)));
  }

  function step(delta: number) {
    const current = displayWeight(value, unit);
    const next = Math.max(0, roundToTenth(current + delta));
    commitDisplay(next);
    setText(String(next));
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Pressable
        onPress={() => step(-increment)}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 32,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Minus size={16} color={colors.textSecondary} />
      </Pressable>

      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.sm,
          height: 40,
          flex: 1,
          minWidth: 56,
          justifyContent: "center",
          paddingHorizontal: spacing["2xs"],
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? "0"}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          style={{
            ...typography.dataMedium,
            color: colors.textPrimary,
            textAlign: "center",
            padding: 0,
          }}
        />
      </View>

      <Pressable
        onPress={() => step(increment)}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 32,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Plus size={16} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export default WeightInput;

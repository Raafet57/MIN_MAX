import React, { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";

interface Props {
  value: number;
  onChange(next: number): void;
  placeholder?: string;
}

/**
 * Minimal number-pad rep input. Commits on blur.
 */
export function RepInput({ value, onChange, placeholder }: Props) {
  const [text, setText] = useState<string>(value > 0 ? String(value) : "");

  useEffect(() => {
    setText(value > 0 ? String(value) : "");
  }, [value]);

  function commit() {
    const parsed = parseInt(text, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      onChange(0);
      setText("");
      return;
    }
    onChange(parsed);
    setText(String(parsed));
  }

  return (
    <View
      style={{
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.sm,
        height: 40,
        minWidth: 56,
        justifyContent: "center",
        paddingHorizontal: spacing.xs,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        keyboardType="number-pad"
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
  );
}

export default RepInput;

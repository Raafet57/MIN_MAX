import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Pause, Play, Plus, Minus, SkipForward, ChevronUp } from "lucide-react-native";

import { useWorkoutStore } from "@/stores/workoutStore";
import { colors } from "@/constants/colors";
import { typography, spacing, radius } from "@/constants/layout";

function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Floating overlay rest timer. Reads from useWorkoutStore directly.
 *   - Collapsed: thin bar pinned to bottom.
 *   - Expanded: full modal with circular progress + controls.
 *   - Shows "GO" flash for 3s when the countdown hits zero, then auto-skips.
 */
export function RestTimer() {
  const {
    restTimer,
    pauseRestTimer,
    resumeRestTimer,
    adjustRestTimer,
    skipRestTimer,
  } = useWorkoutStore();

  const [now, setNow] = useState<number>(Date.now());
  const [expanded, setExpanded] = useState<boolean>(false);
  const [flashGo, setFlashGo] = useState<boolean>(false);

  const active = restTimer.active;
  const paused = restTimer.paused;
  const duration = restTimer.durationSec ?? 0;
  const startedAt = restTimer.startedAt ?? 0;

  // Tick every 200ms while running.
  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active, paused]);

  // Remaining ms calc.
  const remainingMs = useMemo(() => {
    if (!active) return 0;
    if (paused) return (restTimer.pausedRemaining ?? 0) * 1000;
    return Math.max(0, startedAt + duration * 1000 - now);
  }, [active, paused, startedAt, duration, now, restTimer.pausedRemaining]);

  // When countdown hits zero: flash GO then skip.
  useEffect(() => {
    if (!active || paused) return;
    if (remainingMs <= 0) {
      if (!flashGo) {
        setFlashGo(true);
        const timeout = setTimeout(() => {
          setFlashGo(false);
          skipRestTimer();
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [remainingMs, active, paused, flashGo, skipRestTimer]);

  // Reset flash when timer ends externally.
  useEffect(() => {
    if (!active) setFlashGo(false);
  }, [active]);

  if (!active) return null;

  const progress = duration > 0 ? Math.min(1, remainingMs / (duration * 1000)) : 0;
  const labelText = flashGo ? "GO" : formatMMSS(remainingMs);

  // Collapsed bar (always rendered when active + not explicitly expanded).
  return (
    <>
      <Pressable
        onPress={() => setExpanded(true)}
        style={{
          position: "absolute",
          left: spacing.md,
          right: spacing.md,
          bottom: spacing.md,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: flashGo ? colors.success : colors.border,
          height: 56,
          paddingHorizontal: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Progress fill */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            backgroundColor: flashGo ? colors.successMuted : colors.secondaryMuted,
          }}
        />

        <Text
          style={{
            ...typography.caption,
            color: flashGo ? colors.success : colors.secondary,
            marginRight: spacing.sm,
          }}
        >
          REST
        </Text>
        <Text
          style={{
            ...typography.dataMedium,
            color: colors.textPrimary,
            fontVariant: ["tabular-nums"],
            flex: 1,
          }}
        >
          {labelText}
        </Text>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            adjustRestTimer(30);
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing["2xs"],
            borderRadius: radius.sm,
            backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
          })}
        >
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
            +30s
          </Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            skipRestTimer();
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            marginLeft: spacing.xs,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing["2xs"],
            borderRadius: radius.sm,
            backgroundColor: pressed ? colors.surfaceOverlay : "transparent",
          })}
        >
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
            Skip
          </Text>
        </Pressable>

        <ChevronUp
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: spacing.xs }}
        />
      </Pressable>

      {/* Expanded modal */}
      <Modal
        visible={expanded}
        animationType="fade"
        transparent
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable
          onPress={() => setExpanded(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => {
              /* prevent backdrop dismiss */
            }}
            style={{
              width: "100%",
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              padding: spacing.xl,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                ...typography.overline,
                color: colors.secondary,
                marginBottom: spacing.sm,
              }}
            >
              REST TIMER
            </Text>

            {/* Circular progress */}
            <ProgressRing progress={progress} flash={flashGo}>
              <Text
                style={{
                  ...typography.display,
                  fontSize: 64,
                  lineHeight: 68,
                  color: flashGo ? colors.success : colors.textPrimary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {labelText}
              </Text>
            </ProgressRing>

            {/* Controls */}
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginTop: spacing.lg,
              }}
            >
              <IconButton
                onPress={() => adjustRestTimer(-30)}
                label="-30s"
                icon={<Minus size={18} color={colors.textPrimary} />}
              />
              {paused ? (
                <IconButton
                  onPress={resumeRestTimer}
                  label="Resume"
                  icon={<Play size={18} color={colors.textPrimary} />}
                  primary
                />
              ) : (
                <IconButton
                  onPress={pauseRestTimer}
                  label="Pause"
                  icon={<Pause size={18} color={colors.textPrimary} />}
                  primary
                />
              )}
              <IconButton
                onPress={() => adjustRestTimer(30)}
                label="+30s"
                icon={<Plus size={18} color={colors.textPrimary} />}
              />
              <IconButton
                onPress={() => {
                  skipRestTimer();
                  setExpanded(false);
                }}
                label="Skip"
                icon={<SkipForward size={18} color={colors.textPrimary} />}
              />
            </View>

            <Pressable
              onPress={() => setExpanded(false)}
              style={({ pressed }) => ({
                marginTop: spacing.lg,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary }}
              >
                Tap to collapse
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onPress(): void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minWidth: 60,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: primary
          ? pressed
            ? colors.primaryPressed
            : colors.primary
          : pressed
          ? colors.surfaceOverlay
          : colors.surface,
      })}
    >
      {icon}
      <Text
        style={{
          ...typography.caption,
          color: colors.textPrimary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProgressRing({
  progress,
  flash,
  children,
}: {
  progress: number;
  flash: boolean;
  children: React.ReactNode;
}) {
  const size = 200;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - progress);
  const strokeColor = flash ? colors.success : colors.secondary;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export default RestTimer;

// =============================================================================
// PRBoard — grouped list of current personal records, collapsible per exercise.
// =============================================================================

import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Trophy, ChevronDown, ChevronRight } from "lucide-react-native";
import { format } from "date-fns";

import type { PersonalRecord, PRType, WeightUnit } from "@/types";
import { colors } from "@/constants/colors";
import { spacing, typography, radius } from "@/constants/layout";
import { getExerciseName } from "@/data/exercises";
import { displayWeight } from "@/utils/formatters";
import { EmptyState } from "@/components/shared/EmptyState";

interface Props {
  prs: PersonalRecord[];
  unit: WeightUnit;
}

const PR_TYPE_ORDER: PRType[] = ["weight", "reps", "volume", "estimated1rm"];

const PR_TYPE_LABEL: Record<PRType, string> = {
  weight: "Heaviest",
  reps: "Most reps",
  volume: "Best volume",
  estimated1rm: "Est. 1RM",
};

function formatPRValue(pr: PersonalRecord, unit: WeightUnit): string {
  switch (pr.prType) {
    case "weight": {
      const w = pr.weight != null ? displayWeight(pr.weight, unit) : displayWeight(pr.value, unit);
      const reps = pr.reps ?? 0;
      return `${w} ${unit} × ${reps}`;
    }
    case "reps": {
      const reps = pr.reps ?? pr.value;
      const w = pr.weight != null ? displayWeight(pr.weight, unit) : 0;
      return `${reps} reps @ ${w} ${unit}`;
    }
    case "volume": {
      const v = displayWeight(pr.value, unit);
      return `${Math.round(v).toLocaleString("en-US")} ${unit}`;
    }
    case "estimated1rm": {
      const v = pr.estimated1rm != null ? displayWeight(pr.estimated1rm, unit) : displayWeight(pr.value, unit);
      return `${v} ${unit} e1RM`;
    }
  }
}

export function PRBoard({ prs, unit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Group by exercise and keep best per prType (max value).
  const grouped = useMemo(() => {
    const byExercise: Record<string, Record<PRType, PersonalRecord>> = {};
    for (const pr of prs) {
      const bucket = byExercise[pr.exerciseId] ?? ({} as Record<PRType, PersonalRecord>);
      const existing = bucket[pr.prType];
      if (!existing || pr.value > existing.value) {
        bucket[pr.prType] = pr;
      }
      byExercise[pr.exerciseId] = bucket;
    }

    // Sort exercises by most-recent PR date desc.
    return Object.entries(byExercise)
      .map(([exerciseId, records]) => {
        const dates = Object.values(records).map((r) => new Date(r.achievedAt).getTime());
        const mostRecent = Math.max(...dates);
        return { exerciseId, records, mostRecent };
      })
      .sort((a, b) => b.mostRecent - a.mostRecent);
  }, [prs]);

  if (prs.length === 0) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <EmptyState
          title="No PRs yet"
          subtitle="Finish a workout and break a rep or weight record to start your PR board."
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {grouped.map(({ exerciseId, records }) => {
        const isOpen = expanded[exerciseId] ?? false;
        const rows = PR_TYPE_ORDER.map((t) => records[t]).filter(
          (r): r is PersonalRecord => r != null,
        );

        return (
          <View
            key={exerciseId}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() =>
                setExpanded((prev) => ({ ...prev, [exerciseId]: !isOpen }))
              }
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                padding: spacing.sm,
                minHeight: 44,
                backgroundColor: pressed ? colors.surfaceElevated : "transparent",
              })}
            >
              <Trophy size={18} color={colors.prGold} style={{ marginRight: spacing.xs }} />
              <Text
                style={{
                  ...typography.h3,
                  color: colors.textPrimary,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {getExerciseName(exerciseId)}
              </Text>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.textTertiary,
                  marginRight: spacing.xs,
                }}
              >
                {rows.length} PR{rows.length === 1 ? "" : "s"}
              </Text>
              {isOpen ? (
                <ChevronDown size={16} color={colors.textTertiary} />
              ) : (
                <ChevronRight size={16} color={colors.textTertiary} />
              )}
            </Pressable>

            {isOpen ? (
              <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}>
                {rows.map((pr) => (
                  <View
                    key={pr.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: spacing.xs,
                      borderTopWidth: 1,
                      borderTopColor: colors.divider,
                      gap: spacing.xs,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: `${colors.prGold}22`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trophy size={14} color={colors.prGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...typography.overline,
                          color: colors.textTertiary,
                        }}
                      >
                        {PR_TYPE_LABEL[pr.prType]}
                      </Text>
                      <Text style={{ ...typography.body, color: colors.prGold }}>
                        {formatPRValue(pr, unit)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                      }}
                    >
                      {format(new Date(pr.achievedAt), "MMM d, yyyy")}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default PRBoard;

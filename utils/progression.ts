// =============================================================================
// Auto-progression engine.
// Runs on workout completion. Mutates exercise_state, detects PRs.
// =============================================================================

import type {
  ExerciseState,
  LoggedSet,
  PersonalRecord,
  ProgressionChange,
  PRNotification,
  PRType,
} from "@/types";
import { getPhaseForWeek } from "@/data/phases";
import { PROGRAM } from "@/data/program";
import { getExerciseName } from "@/data/exercises";
import {
  createPR,
  getExerciseState,
  getPRsForExercise,
  upsertExerciseState,
} from "@/db/queries";
import { epley1RM } from "@/utils/oneRM";

// --- Helpers ---------------------------------------------------------------

/**
 * Group logged sets by exerciseId. Stable by set_index within each group.
 */
export function groupSetsByExercise(
  sets: LoggedSet[],
): Record<string, LoggedSet[]> {
  const out: Record<string, LoggedSet[]> = {};
  for (const s of sets) {
    const list = out[s.exerciseId] ?? (out[s.exerciseId] = []);
    list.push(s);
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => a.setIndex - b.setIndex);
  }
  return out;
}

/**
 * Find a ProgramExercise anywhere in the PROGRAM by id.
 */
function findProgramExercise(exerciseId: string) {
  for (const day of PROGRAM.days) {
    const hit = day.exercises.find((e) => e.id === exerciseId);
    if (hit) return hit;
  }
  return undefined;
}

function maxValueOfType(prs: PersonalRecord[], type: PRType): number {
  let best = 0;
  for (const pr of prs) {
    if (pr.prType !== type) continue;
    if (pr.value > best) best = pr.value;
  }
  return best;
}

/** Best reps previously logged at exactly this weight (reps-PR lookup). */
function bestRepsAtWeight(
  prs: PersonalRecord[],
  weight: number,
): number {
  let best = 0;
  for (const pr of prs) {
    if (pr.prType !== "reps") continue;
    if (pr.weight !== weight) continue;
    if (pr.value > best) best = pr.value;
  }
  return best;
}

/**
 * For an exercise's working sets in this workout: did we complete every set
 * at the minimum reps? At the top of the range?
 */
interface WorkingSetVerdict {
  allSetsHit: boolean;
  topOfRange: boolean;
  hasAnyWorkingSet: boolean;
}

function evaluateWorkingSets(sets: LoggedSet[]): WorkingSetVerdict {
  const working = sets.filter(
    (s) => s.setType === "normal" && !s.skipped,
  );
  if (working.length === 0) {
    return { allSetsHit: false, topOfRange: false, hasAnyWorkingSet: false };
  }

  let allHit = true;
  let top = true;
  for (const s of working) {
    if (!s.completed) {
      allHit = false;
      top = false;
      continue;
    }
    if (s.completedReps < s.targetRepsLow) allHit = false;
    if (s.completedReps < s.targetRepsHigh) top = false;
  }
  return { allSetsHit: allHit, topOfRange: top, hasAnyWorkingSet: true };
}

// --- Core entry point ------------------------------------------------------

export function runProgression(
  workoutId: string,
  week: number,
  loggedSets: LoggedSet[],
): { changes: ProgressionChange[]; prs: PRNotification[] } {
  const phase = getPhaseForWeek(week);
  const isDeload = phase.id === "deload" || week === 7;

  if (isDeload) {
    // Short-circuit: no DB writes, no PRs evaluated.
    const grouped = groupSetsByExercise(loggedSets);
    const changes: ProgressionChange[] = Object.keys(grouped).map((exId) => {
      const state = getExerciseState(exId);
      const weightNow = state?.currentWeight ?? 0;
      return {
        exerciseId: exId,
        exerciseName: getExerciseName(exId),
        type: "deload",
        previousWeight: weightNow,
        newWeight: weightNow,
      };
    });
    return { changes, prs: [] };
  }

  const grouped = groupSetsByExercise(loggedSets);
  const changes: ProgressionChange[] = [];
  const prs: PRNotification[] = [];

  for (const [exerciseId, exerciseSets] of Object.entries(grouped)) {
    const programEx = findProgramExercise(exerciseId);
    const exerciseName = getExerciseName(exerciseId);
    const existingState = getExerciseState(exerciseId);

    const completedWorkingSets = exerciseSets.filter(
      (s) => s.setType === "normal" && s.completed && !s.skipped,
    );

    // For progression math we use the last completed working set as the
    // "weight used this session" — they're generally all the same, but the
    // latest represents the most recent successful load.
    const lastCompletedWorkingWeight =
      completedWorkingSets.length > 0
        ? completedWorkingSets[completedWorkingSets.length - 1].weight
        : 0;

    // --- 1. Progression logic (normal sets only) --------------------------

    const verdict = evaluateWorkingSets(exerciseSets);
    const increment =
      existingState?.increment ?? programEx?.incrementKg ?? 2.5;

    if (verdict.hasAnyWorkingSet) {
      const firstTime =
        !existingState || existingState.currentWeight === 0;

      if (firstTime) {
        // Establish baseline from whatever was completed.
        if (lastCompletedWorkingWeight > 0) {
          const newState: ExerciseState = {
            exerciseId,
            currentWeight: lastCompletedWorkingWeight,
            lastSuccessfulWeight: lastCompletedWorkingWeight,
            currentRepsLow:
              completedWorkingSets[0]?.targetRepsLow ??
              existingState?.currentRepsLow ??
              6,
            currentRepsHigh:
              completedWorkingSets[0]?.targetRepsHigh ??
              existingState?.currentRepsHigh ??
              8,
            increment,
            totalSessions: (existingState?.totalSessions ?? 0) + 1,
            lastPerformedAt: new Date().toISOString(),
          };
          upsertExerciseState(newState);
          changes.push({
            exerciseId,
            exerciseName,
            type: "firstTime",
            previousWeight: 0,
            newWeight: lastCompletedWorkingWeight,
          });
        }
      } else if (verdict.topOfRange) {
        const prevWeight = existingState.currentWeight;
        const newWeight = prevWeight + increment;
        upsertExerciseState({
          ...existingState,
          currentWeight: newWeight,
          lastSuccessfulWeight: prevWeight,
          increment,
          totalSessions: existingState.totalSessions + 1,
          lastPerformedAt: new Date().toISOString(),
        });
        changes.push({
          exerciseId,
          exerciseName,
          type: "increase",
          previousWeight: prevWeight,
          newWeight,
        });
      } else if (verdict.allSetsHit) {
        // Hit the floor but not the ceiling: stay, aim for more reps.
        upsertExerciseState({
          ...existingState,
          increment,
          totalSessions: existingState.totalSessions + 1,
          lastPerformedAt: new Date().toISOString(),
        });
        changes.push({
          exerciseId,
          exerciseName,
          type: "stay",
          previousWeight: existingState.currentWeight,
          newWeight: existingState.currentWeight,
        });
      } else {
        // Missed reps on at least one set.
        if (
          existingState.lastSuccessfulWeight > 0 &&
          existingState.lastSuccessfulWeight < existingState.currentWeight
        ) {
          const prevWeight = existingState.currentWeight;
          const prevLow = existingState.currentRepsLow;
          const prevHigh = existingState.currentRepsHigh;
          const newLow = (prevLow ?? 6) + 2;
          const newHigh = (prevHigh ?? 8) + 2;
          upsertExerciseState({
            ...existingState,
            currentWeight: existingState.lastSuccessfulWeight,
            currentRepsLow: newLow,
            currentRepsHigh: newHigh,
            increment,
            totalSessions: existingState.totalSessions + 1,
            lastPerformedAt: new Date().toISOString(),
          });
          changes.push({
            exerciseId,
            exerciseName,
            type: "revert",
            previousWeight: prevWeight,
            newWeight: existingState.lastSuccessfulWeight,
            previousRepsLow: prevLow,
            previousRepsHigh: prevHigh,
            newRepsLow: newLow,
            newRepsHigh: newHigh,
          });
        } else {
          upsertExerciseState({
            ...existingState,
            increment,
            totalSessions: existingState.totalSessions + 1,
            lastPerformedAt: new Date().toISOString(),
          });
          changes.push({
            exerciseId,
            exerciseName,
            type: "stay",
            previousWeight: existingState.currentWeight,
            newWeight: existingState.currentWeight,
          });
        }
      }
    }

    // --- 2. PR detection (all completed non-warmup sets) ------------------

    const prCandidateSets = exerciseSets.filter(
      (s) =>
        s.completed &&
        !s.skipped &&
        s.setType !== "warmup" &&
        s.weight > 0 &&
        s.completedReps > 0,
    );
    if (prCandidateSets.length === 0) continue;

    const existingPRs = getPRsForExercise(exerciseId);

    // Weight PR: heaviest weight used this session vs. previous best.
    let bestWeight = 0;
    let bestWeightReps = 0;
    for (const s of prCandidateSets) {
      if (s.weight > bestWeight) {
        bestWeight = s.weight;
        bestWeightReps = s.completedReps;
      }
    }
    const prevBestWeight = maxValueOfType(existingPRs, "weight");
    if (bestWeight > prevBestWeight) {
      createPR({
        exerciseId,
        prType: "weight",
        value: bestWeight,
        weight: bestWeight,
        reps: bestWeightReps,
        achievedAt: new Date().toISOString(),
        workoutId,
      });
      prs.push({
        exerciseId,
        exerciseName,
        prType: "weight",
        value: bestWeight,
        previousValue: prevBestWeight || undefined,
        weight: bestWeight,
        reps: bestWeightReps,
      });
    }

    // Reps PR: per-weight: most reps at any given weight vs. previous.
    const repsByWeight = new Map<number, number>();
    for (const s of prCandidateSets) {
      const prev = repsByWeight.get(s.weight) ?? 0;
      if (s.completedReps > prev) repsByWeight.set(s.weight, s.completedReps);
    }
    for (const [weight, reps] of repsByWeight.entries()) {
      const prevBestReps = bestRepsAtWeight(existingPRs, weight);
      if (reps > prevBestReps) {
        createPR({
          exerciseId,
          prType: "reps",
          value: reps,
          weight,
          reps,
          achievedAt: new Date().toISOString(),
          workoutId,
        });
        prs.push({
          exerciseId,
          exerciseName,
          prType: "reps",
          value: reps,
          previousValue: prevBestReps || undefined,
          weight,
          reps,
        });
      }
    }

    // Volume PR: total volume this workout for this exercise.
    let totalVolume = 0;
    for (const s of prCandidateSets) {
      totalVolume += s.weight * s.completedReps;
    }
    const prevBestVolume = maxValueOfType(existingPRs, "volume");
    if (totalVolume > prevBestVolume) {
      createPR({
        exerciseId,
        prType: "volume",
        value: totalVolume,
        achievedAt: new Date().toISOString(),
        workoutId,
      });
      prs.push({
        exerciseId,
        exerciseName,
        prType: "volume",
        value: totalVolume,
        previousValue: prevBestVolume || undefined,
      });
    }

    // e1RM PR: Epley across all completed sets; compare to best e1RM.
    let bestE1RM = 0;
    let bestE1RMWeight = 0;
    let bestE1RMReps = 0;
    for (const s of prCandidateSets) {
      const e = epley1RM(s.weight, s.completedReps);
      if (e > bestE1RM) {
        bestE1RM = e;
        bestE1RMWeight = s.weight;
        bestE1RMReps = s.completedReps;
      }
    }
    const prevBestE1RM = maxValueOfType(existingPRs, "estimated1rm");
    if (bestE1RM > prevBestE1RM) {
      createPR({
        exerciseId,
        prType: "estimated1rm",
        value: bestE1RM,
        weight: bestE1RMWeight,
        reps: bestE1RMReps,
        estimated1rm: bestE1RM,
        achievedAt: new Date().toISOString(),
        workoutId,
      });
      prs.push({
        exerciseId,
        exerciseName,
        prType: "estimated1rm",
        value: bestE1RM,
        previousValue: prevBestE1RM || undefined,
        weight: bestE1RMWeight,
        reps: bestE1RMReps,
      });
    }
  }

  return { changes, prs };
}

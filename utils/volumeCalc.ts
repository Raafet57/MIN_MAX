// =============================================================================
// Volume / set-count aggregations.
// Volume = weight * reps (kg * reps), summed per relevant group.
// =============================================================================

import type { LoggedSet, MuscleGroup, Workout } from "@/types";
import { PROGRAM } from "@/data/program";

/**
 * Volume contributed by a single set. Zero if missing/zero weight or reps.
 */
export function setVolume(weight: number, reps: number): number {
  if (!weight || weight <= 0) return 0;
  if (!reps || reps <= 0) return 0;
  return weight * reps;
}

/**
 * Sum of completed, non-warmup set volumes for a workout.
 */
export function workoutVolume(sets: LoggedSet[]): number {
  let total = 0;
  for (const s of sets) {
    if (!s.completed) continue;
    if (s.setType === "warmup") continue;
    total += setVolume(s.weight, s.completedReps);
  }
  return total;
}

// --- Muscle-group helpers --------------------------------------------------

function emptyMuscleMap<T extends number>(): Record<MuscleGroup, T> {
  return {
    shoulders: 0 as T,
    chest: 0 as T,
    back: 0 as T,
    biceps: 0 as T,
    triceps: 0 as T,
    forearms: 0 as T,
    quadriceps: 0 as T,
    hamstrings: 0 as T,
    glutes: 0 as T,
    calves: 0 as T,
    abs: 0 as T,
  };
}

/**
 * Build a lookup: exerciseId -> targetMuscles[] from the PROGRAM data.
 */
function buildExerciseMuscleIndex(): Record<string, MuscleGroup[]> {
  const out: Record<string, MuscleGroup[]> = {};
  for (const day of PROGRAM.days) {
    for (const ex of day.exercises) {
      out[ex.id] = ex.targetMuscles;
    }
  }
  return out;
}

/**
 * Sum volume per muscle group across the provided workouts/sets.
 * A set contributes its full volume to every muscle it targets
 * (not divided) — matches the hypertrophy-tracking convention used elsewhere.
 *
 * The `workouts` parameter is accepted for API symmetry / future filtering;
 * if any workout ids exist in it, we only count sets whose workoutId is in it.
 */
export function weeklyVolumeByMuscle(
  workouts: Workout[],
  sets: LoggedSet[],
): Record<MuscleGroup, number> {
  const out = emptyMuscleMap<number>();
  const muscleIndex = buildExerciseMuscleIndex();
  const workoutIds =
    workouts.length > 0 ? new Set(workouts.map((w) => w.id)) : null;

  for (const s of sets) {
    if (!s.completed) continue;
    if (s.setType === "warmup") continue;
    if (workoutIds && !workoutIds.has(s.workoutId)) continue;
    const muscles = muscleIndex[s.exerciseId];
    if (!muscles || muscles.length === 0) continue;
    const v = setVolume(s.weight, s.completedReps);
    if (v <= 0) continue;
    for (const m of muscles) {
      out[m] += v;
    }
  }
  return out;
}

/**
 * Count of completed working sets per muscle group.
 * Each set counts once per target muscle (not divided).
 */
export function weeklySetCountByMuscle(
  sets: LoggedSet[],
): Record<MuscleGroup, number> {
  const out = emptyMuscleMap<number>();
  const muscleIndex = buildExerciseMuscleIndex();

  for (const s of sets) {
    if (!s.completed) continue;
    if (s.setType === "warmup") continue;
    const muscles = muscleIndex[s.exerciseId];
    if (!muscles || muscles.length === 0) continue;
    for (const m of muscles) {
      out[m] += 1;
    }
  }
  return out;
}

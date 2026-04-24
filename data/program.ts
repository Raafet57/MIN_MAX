// Min-Max 4x — full 12-week program definition.
// Week 1: Intro, Weeks 2-6: Base (RPE bump), Week 7: Deload (= Week 1 config, progression off),
// Weeks 8-12: Intensification (Base + partials/dropsets/myo-reps).
import type { Program, ProgramExercise, SetDefinition, WeekConfig, RPE } from "@/types";
import { APP_CONFIG } from "@/constants/config";
import { PHASES } from "@/data/phases";
import { EXERCISES } from "@/data/exercises";

// --- Helpers ---------------------------------------------------------------

const n = (repsLow: number, repsHigh: number, rpe: RPE): SetDefinition => ({
  reps: [repsLow, repsHigh],
  rpe,
  type: "normal",
});

const partial = (rpe: RPE = 10): SetDefinition => ({
  reps: [6, 12],
  rpe,
  type: "partial",
  label: "Lengthened Partial",
});

const dropset = (rpe: RPE = 10): SetDefinition => ({
  reps: [6, 12],
  rpe,
  type: "dropset",
  label: "Drop Set",
});

const myorep = (rpe: RPE = 10): SetDefinition => ({
  reps: [3, 5],
  rpe,
  type: "myorep",
  label: "Myo-Rep",
  restOverrideSeconds: 5,
});

// Week-1 / Deload (Intro) configs — per REQUIREMENTS.md Section 5
const INTRO_SETS: Record<string, SetDefinition[]> = {
  // Full Body
  "lying-leg-curl": [n(6, 8, 9), n(6, 8, 10)],
  squat: [n(6, 8, 7), n(6, 8, 8)],
  "incline-bench-press": [n(6, 8, 8), n(6, 8, 9)],
  "lateral-raise-fb": [n(8, 10, 10)],
  "wide-pull-up": [n(6, 8, 8), n(6, 8, 9)],
  "standing-calf-raise-a": [n(6, 8, 10)],
  // Upper
  "lat-pulldown": [n(8, 10, 8), n(8, 10, 9)],
  "t-bar-row": [n(8, 10, 8), n(8, 10, 9)],
  shrug: [n(6, 8, 9)],
  "chest-press-machine": [n(8, 10, 8), n(8, 10, 9)],
  "lateral-raise-cable": [n(8, 10, 9), n(8, 10, 10)],
  "reverse-fly": [n(8, 10, 10)],
  "cable-crunch": [n(6, 8, 9), n(6, 8, 10)],
  // Lower
  "leg-extension": [n(8, 10, 9), n(8, 10, 10)],
  "romanian-deadlift": [n(6, 8, 7), n(6, 8, 8)],
  "hip-thrust": [n(6, 8, 8), n(6, 8, 9)],
  "leg-press": [n(6, 8, 9)],
  "standing-calf-raise-b": [n(8, 10, 9), n(8, 10, 10)],
  // Arms/Delts
  "bicep-curl-cable": [n(6, 8, 9), n(6, 8, 10)],
  "triceps-extension-cable": [n(8, 10, 9), n(8, 10, 10)],
  "hammer-curl-db": [n(8, 10, 10)],
  "cable-kickback": [n(8, 10, 9), n(8, 10, 10)],
  "wrist-curl-db": [n(8, 10, 9), n(8, 10, 10)],
  "reverse-wrist-curl": [n(8, 10, 9), n(8, 10, 10)],
  "bicep-curl-db": [n(6, 8, 10)],
  "lateral-raise-machine": [n(8, 10, 9), n(8, 10, 10)],
  "dead-hang": [
    { reps: [1, 999], rpe: 10, type: "normal", label: "Max time" },
    { reps: [1, 999], rpe: 10, type: "normal", label: "Max time" },
  ],
};

// Base phase (Weeks 2-6): RPE promoted to @9/@10 across the board.
// Rule: @7 → @9, @8 → @10. @9 stays @9. @10 stays @10.
const promoteRpe = (rpe: RPE): RPE => (rpe === 7 ? 9 : rpe === 8 ? 10 : rpe);

function baseSetsFor(id: string): SetDefinition[] {
  return INTRO_SETS[id].map((s) => ({ ...s, rpe: promoteRpe(s.rpe) }));
}

// Intensification additions per exercise (appended after base sets).
const INTENSIFICATION_EXTRAS: Record<string, SetDefinition[]> = {
  "lying-leg-curl": [partial()],
  "wide-pull-up": [partial()],
  "standing-calf-raise-a": [partial()],
  "lat-pulldown": [partial()],
  "t-bar-row": [dropset(), dropset()],
  "leg-extension": [partial()],
  "standing-calf-raise-b": [partial()],
  "cable-kickback": [dropset(), dropset()],
  "bicep-curl-db": [dropset(), dropset()],
  "lateral-raise-machine": [myorep(), myorep(), myorep()],
};

function intensificationSetsFor(id: string): SetDefinition[] {
  const base = baseSetsFor(id);
  const extras = INTENSIFICATION_EXTRAS[id] ?? [];
  return [...base, ...extras];
}

// --- Exercise factory ------------------------------------------------------

function buildExercise(id: string): ProgramExercise {
  const meta = EXERCISES[id];
  if (!meta) throw new Error(`Unknown exercise id: ${id}`);
  const weekConfigs: WeekConfig[] = [
    { weekRange: [1, 1], sets: INTRO_SETS[id] },
    { weekRange: [2, 6], sets: baseSetsFor(id) },
    { weekRange: [7, 7], sets: INTRO_SETS[id] },
    { weekRange: [8, 12], sets: intensificationSetsFor(id) },
  ];
  return { ...meta, weekConfigs };
}

// --- Program definition ----------------------------------------------------

const FULL_BODY_IDS = [
  "lying-leg-curl",
  "squat",
  "incline-bench-press",
  "lateral-raise-fb",
  "wide-pull-up",
  "standing-calf-raise-a",
];

const UPPER_IDS = [
  "lat-pulldown",
  "t-bar-row",
  "shrug",
  "chest-press-machine",
  "lateral-raise-cable",
  "reverse-fly",
  "cable-crunch",
];

const LOWER_IDS = [
  "leg-extension",
  "romanian-deadlift",
  "hip-thrust",
  "leg-press",
  "standing-calf-raise-b",
];

const ARMS_DELTS_IDS = [
  "bicep-curl-cable",
  "triceps-extension-cable",
  "hammer-curl-db",
  "cable-kickback",
  "wrist-curl-db",
  "reverse-wrist-curl",
  "bicep-curl-db",
  "lateral-raise-machine",
  "dead-hang",
];

export const PROGRAM: Program = {
  id: APP_CONFIG.programId,
  name: APP_CONFIG.programName,
  totalWeeks: APP_CONFIG.totalWeeks,
  phases: PHASES,
  days: [
    {
      id: "full-body",
      name: "Full Body",
      estimatedMinutes: 32,
      exercises: FULL_BODY_IDS.map(buildExercise),
    },
    {
      id: "upper",
      name: "Upper",
      estimatedMinutes: 37,
      exercises: UPPER_IDS.map(buildExercise),
    },
    {
      id: "lower",
      name: "Lower",
      estimatedMinutes: 26,
      exercises: LOWER_IDS.map(buildExercise),
    },
    {
      id: "arms-delts",
      name: "Arms / Delts",
      estimatedMinutes: 41,
      exercises: ARMS_DELTS_IDS.map(buildExercise),
    },
  ],
};

export function getProgramDay(dayId: string) {
  return PROGRAM.days.find((d) => d.id === dayId);
}

export function getProgramExercise(dayId: string, exerciseId: string) {
  const day = getProgramDay(dayId);
  return day?.exercises.find((e) => e.id === exerciseId);
}

export function getExerciseSetsForWeek(
  exercise: ProgramExercise,
  week: number,
): SetDefinition[] {
  for (const wc of exercise.weekConfigs) {
    const [lo, hi] = wc.weekRange;
    if (week >= lo && week <= hi) return wc.sets;
  }
  // Past week 12: fallback to intensification sets.
  return exercise.weekConfigs[exercise.weekConfigs.length - 1].sets;
}

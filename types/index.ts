// =============================================================================
// MinMax Tracker — Shared Types
// Every other module imports from here. Do NOT redefine types elsewhere.
// =============================================================================

export type MuscleGroup =
  | "shoulders"
  | "chest"
  | "back"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

export type PhaseId = "intro" | "base" | "deload" | "intensification";

export type DayId = "full-body" | "upper" | "lower" | "arms-delts";

export type SetType =
  | "normal"
  | "partial"
  | "dropset"
  | "myorep"
  | "warmup";

export type RPE = 7 | 8 | 9 | 10;

export type WeightUnit = "kg" | "lb";

export type SessionFeeling = 1 | 2 | 3 | 4 | 5;

// --- Program Definition ----------------------------------------------------

export interface Phase {
  id: PhaseId;
  name: string;
  weekRange: [number, number];
  color: string;
  progressionEnabled: boolean;
  description: string;
}

export interface Program {
  id: string;
  name: string;
  totalWeeks: number;
  phases: Phase[];
  days: ProgramDay[];
}

export interface ProgramDay {
  id: DayId;
  name: string;
  exercises: ProgramExercise[];
  estimatedMinutes: number;
}

export interface ProgramExercise {
  id: string;
  name: string;
  originalName: string;
  substitutes: string[];
  videoUrl: string;
  note: string;
  targetMuscles: MuscleGroup[];
  restSeconds: number;
  incrementKg: number;
  weekConfigs: WeekConfig[];
  trackingPrefix?: string;
  timeBased?: boolean;
}

export interface WeekConfig {
  weekRange: [number, number];
  sets: SetDefinition[];
}

export interface SetDefinition {
  reps: [number, number];
  rpe: RPE;
  type: Exclude<SetType, "warmup">;
  label?: string;
  restOverrideSeconds?: number;
}

// --- Workout Logging -------------------------------------------------------

export interface Workout {
  id: string;
  dayId: DayId;
  dayName: string;
  weekNumber: number;
  phase: PhaseId;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  totalSets: number;
  completedSets: number;
  totalVolume: number;
  notes?: string;
  feeling?: SessionFeeling;
}

export interface LoggedSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  targetRpe: number;
  setType: SetType;
  weight: number;
  completedReps: number;
  actualRpe?: number;
  completed: boolean;
  skipped: boolean;
  timestamp: string;
  notes?: string;
  exerciseSubstitution?: string;
}

export interface WarmupSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  weight: number;
  reps: number;
  timestamp: string;
}

// --- Per-exercise progression state ---------------------------------------

export interface ExerciseState {
  exerciseId: string;
  currentWeight: number;
  lastSuccessfulWeight: number;
  currentRepsLow: number;
  currentRepsHigh: number;
  increment: number;
  totalSessions: number;
  lastPerformedAt?: string;
}

// --- Personal Records ------------------------------------------------------

export type PRType = "weight" | "reps" | "volume" | "estimated1rm";

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  prType: PRType;
  value: number;
  weight?: number;
  reps?: number;
  estimated1rm?: number;
  achievedAt: string;
  workoutId: string;
}

// --- Body Metrics ----------------------------------------------------------

export interface BodyMetric {
  id: string;
  date: string;
  weight?: number;
  skeletalMuscleMass?: number;
  waist?: number;
  notes?: string;
}

// --- Settings --------------------------------------------------------------

export interface AppSettings {
  programStartDate: string;
  weightUnit: WeightUnit;
  restTimerVibrate: boolean;
  restTimerSound: boolean;
  showWarmupSets: boolean;
  showExerciseNotes: boolean;
  plateSet: number[];
  barWeight: number;
  compoundRestSeconds: number;
  moderateRestSeconds: number;
  isolationRestSeconds: number;
}

// --- Runtime / UI ---------------------------------------------------------

export interface ActiveSetInput {
  weight: number;
  reps: number;
  actualRpe?: number;
  notes?: string;
  completed: boolean;
  skipped: boolean;
}

export interface ProgressionChange {
  exerciseId: string;
  exerciseName: string;
  type: "increase" | "stay" | "revert" | "firstTime" | "deload";
  previousWeight: number;
  newWeight: number;
  previousRepsLow?: number;
  previousRepsHigh?: number;
  newRepsLow?: number;
  newRepsHigh?: number;
}

export interface PRNotification {
  exerciseId: string;
  exerciseName: string;
  prType: PRType;
  value: number;
  previousValue?: number;
  weight?: number;
  reps?: number;
}

import type { AppSettings } from "@/types";

export const APP_CONFIG = {
  programId: "min-max-4x",
  programName: "Min-Max 4x",
  totalWeeks: 12,
  kgToLb: 2.20462,
  goalWeightKg: 72,
  dayCycle: ["full-body", "upper", "lower", "arms-delts"] as const,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  programStartDate: new Date().toISOString().slice(0, 10),
  weightUnit: "kg",
  restTimerVibrate: true,
  restTimerSound: true,
  showWarmupSets: true,
  showExerciseNotes: true,
  plateSet: [1.25, 2.5, 5, 10, 15, 20],
  barWeight: 20,
  compoundRestSeconds: 180,
  moderateRestSeconds: 120,
  isolationRestSeconds: 60,
};

export const DB_NAME = "minmax.db";
export const DB_VERSION = 1;

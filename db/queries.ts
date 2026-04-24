// =============================================================================
// MinMax Tracker — SQLite query layer
// ALL database reads/writes live here. No raw SQL anywhere else.
// =============================================================================

import "react-native-get-random-values";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { v4 as uuidv4 } from "uuid";

import { DB_NAME, DEFAULT_SETTINGS } from "@/constants/config";
import type {
  AppSettings,
  BodyMetric,
  DayId,
  ExerciseState,
  LoggedSet,
  PersonalRecord,
  PhaseId,
  PRType,
  SessionFeeling,
  SetType,
  WarmupSet,
  WeightUnit,
  Workout,
} from "@/types";

import { migrate } from "./migrations";
import { ALL_TABLES } from "./schema";

// -----------------------------------------------------------------------------
// Connection
// -----------------------------------------------------------------------------

let _db: SQLiteDatabase | null = null;
let _migrationPromise: Promise<void> | null = null;

/**
 * Lazy-open the database. First call triggers migration synchronously so that
 * callers can start issuing queries immediately afterwards.
 */
export function getDb(): SQLiteDatabase {
  if (_db) return _db;
  const db = openDatabaseSync(DB_NAME);
  db.execSync("PRAGMA foreign_keys = ON;");
  // Run migration synchronously on first open. migrate() is written to be
  // effectively sync (uses *Sync methods internally); the async wrapper is
  // just for future-compat.
  void migrate(db);
  _db = db;
  return _db;
}

/**
 * Async initialization entry point — call once from the root layout.
 * Safe to call multiple times; subsequent calls return the cached promise.
 */
export async function initDatabase(): Promise<void> {
  if (_migrationPromise) return _migrationPromise;
  _migrationPromise = (async () => {
    const db = _db ?? openDatabaseSync(DB_NAME);
    db.execSync("PRAGMA foreign_keys = ON;");
    await migrate(db);
    _db = db;
  })();
  return _migrationPromise;
}

// -----------------------------------------------------------------------------
// Helpers: row → object mapping, null coercion, value encoding
// -----------------------------------------------------------------------------

/** SQLite returns `null` for NULL columns; most optional fields use `undefined` in TS. */
function nullToUndef<T>(v: T | null | undefined): T | undefined {
  return v === null || v === undefined ? undefined : v;
}

function toBool(v: unknown): boolean {
  return v === 1 || v === "1" || v === true;
}

// --- Workout row mapping ---

interface WorkoutRow {
  id: string;
  day_id: string;
  day_name: string;
  week_number: number;
  phase: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_sets: number;
  completed_sets: number;
  total_volume: number;
  notes: string | null;
  feeling: number | null;
}

function rowToWorkout(r: WorkoutRow): Workout {
  return {
    id: r.id,
    dayId: r.day_id as DayId,
    dayName: r.day_name,
    weekNumber: r.week_number,
    phase: r.phase as PhaseId,
    startedAt: r.started_at,
    completedAt: nullToUndef(r.completed_at),
    durationSeconds: nullToUndef(r.duration_seconds),
    totalSets: r.total_sets ?? 0,
    completedSets: r.completed_sets ?? 0,
    totalVolume: r.total_volume ?? 0,
    notes: nullToUndef(r.notes),
    feeling: r.feeling == null ? undefined : (r.feeling as SessionFeeling),
  };
}

// --- LoggedSet row mapping ---

interface LoggedSetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_index: number;
  target_reps_low: number;
  target_reps_high: number;
  target_rpe: number;
  set_type: string;
  weight: number | null;
  completed_reps: number | null;
  actual_rpe: number | null;
  completed: number;
  skipped: number;
  notes: string | null;
  exercise_substitution: string | null;
  timestamp: string | null;
}

function rowToLoggedSet(r: LoggedSetRow): LoggedSet {
  return {
    id: r.id,
    workoutId: r.workout_id,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    targetRepsLow: r.target_reps_low,
    targetRepsHigh: r.target_reps_high,
    targetRpe: r.target_rpe,
    setType: r.set_type as SetType,
    weight: r.weight ?? 0,
    completedReps: r.completed_reps ?? 0,
    actualRpe: nullToUndef(r.actual_rpe),
    completed: toBool(r.completed),
    skipped: toBool(r.skipped),
    timestamp: r.timestamp ?? "",
    notes: nullToUndef(r.notes),
    exerciseSubstitution: nullToUndef(r.exercise_substitution),
  };
}

// --- WarmupSet row mapping ---

interface WarmupSetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  timestamp: string | null;
}

function rowToWarmupSet(r: WarmupSetRow): WarmupSet {
  return {
    id: r.id,
    workoutId: r.workout_id,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    weight: r.weight ?? 0,
    reps: r.reps ?? 0,
    timestamp: r.timestamp ?? "",
  };
}

// --- ExerciseState row mapping ---

interface ExerciseStateRow {
  exercise_id: string;
  current_weight: number;
  last_successful_weight: number;
  current_reps_low: number | null;
  current_reps_high: number | null;
  increment: number;
  total_sessions: number;
  last_performed_at: string | null;
}

function rowToExerciseState(r: ExerciseStateRow): ExerciseState {
  return {
    exerciseId: r.exercise_id,
    currentWeight: r.current_weight ?? 0,
    lastSuccessfulWeight: r.last_successful_weight ?? 0,
    currentRepsLow: r.current_reps_low ?? 0,
    currentRepsHigh: r.current_reps_high ?? 0,
    increment: r.increment ?? 2.5,
    totalSessions: r.total_sessions ?? 0,
    lastPerformedAt: nullToUndef(r.last_performed_at),
  };
}

// --- PersonalRecord row mapping ---

interface PRRow {
  id: string;
  exercise_id: string;
  pr_type: string;
  value: number;
  weight: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
  workout_id: string | null;
}

function rowToPR(r: PRRow): PersonalRecord {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    prType: r.pr_type as PRType,
    value: r.value,
    weight: nullToUndef(r.weight),
    reps: nullToUndef(r.reps),
    estimated1rm: nullToUndef(r.estimated_1rm),
    achievedAt: r.achieved_at,
    workoutId: r.workout_id ?? "",
  };
}

// --- BodyMetric row mapping ---

interface BodyMetricRow {
  id: string;
  date: string;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  waist: number | null;
  notes: string | null;
}

function rowToBodyMetric(r: BodyMetricRow): BodyMetric {
  return {
    id: r.id,
    date: r.date,
    weight: nullToUndef(r.weight),
    skeletalMuscleMass: nullToUndef(r.skeletal_muscle_mass),
    waist: nullToUndef(r.waist),
    notes: nullToUndef(r.notes),
  };
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

function encodeSettingValue<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return (value as number[]).join(",");
  if (typeof value === "number") return String(value);
  return String(value ?? "");
}

function decodeSettingValue<K extends keyof AppSettings>(
  key: K,
  raw: string,
): AppSettings[K] {
  const defaults = DEFAULT_SETTINGS;
  const defaultValue = defaults[key];

  if (typeof defaultValue === "boolean") {
    return (raw === "1" || raw === "true") as AppSettings[K];
  }
  if (Array.isArray(defaultValue)) {
    const arr = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => parseFloat(s))
      .filter((n) => !Number.isNaN(n));
    return arr as unknown as AppSettings[K];
  }
  if (typeof defaultValue === "number") {
    const n = parseFloat(raw);
    return (Number.isNaN(n) ? defaultValue : n) as AppSettings[K];
  }
  // string fields (programStartDate, weightUnit)
  if (key === "weightUnit") {
    const unit: WeightUnit = raw === "lb" ? "lb" : "kg";
    return unit as AppSettings[K];
  }
  return raw as AppSettings[K];
}

export function getAllSettings(): AppSettings {
  const db = getDb();
  const rows = db.getAllSync<{ key: string; value: string }>(
    "SELECT key, value FROM settings",
  );

  // Start from defaults so anything missing from the DB is filled in.
  const result: AppSettings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (!(row.key in result)) continue;
    const key = row.key as keyof AppSettings;
    (result as unknown as Record<string, unknown>)[key] = decodeSettingValue(key, row.value);
  }

  return result;
}

export function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): void {
  const db = getDb();
  const encoded = encodeSettingValue(key, value);
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    String(key),
    encoded,
  );
}

/**
 * Drop every table and re-run migrations. Double-confirmation lives at the
 * UI layer; this function is deliberately unguarded.
 */
export function resetDatabase(): void {
  const db = getDb();
  db.execSync("PRAGMA foreign_keys = OFF;");
  for (const table of ALL_TABLES) {
    db.execSync(`DROP TABLE IF EXISTS ${table};`);
  }
  db.execSync("PRAGMA foreign_keys = ON;");
  // Re-run migrations. migrate() is idempotent and effectively sync.
  void migrate(db);
}

// -----------------------------------------------------------------------------
// Workouts
// -----------------------------------------------------------------------------

export function createWorkout(
  input: Omit<Workout, "id" | "totalSets" | "completedSets" | "totalVolume">,
): Workout {
  const db = getDb();
  const id = uuidv4();

  db.runSync(
    `INSERT INTO workouts (
       id, day_id, day_name, week_number, phase,
       started_at, completed_at, duration_seconds,
       total_sets, completed_sets, total_volume,
       notes, feeling
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    id,
    input.dayId,
    input.dayName,
    input.weekNumber,
    input.phase,
    input.startedAt,
    input.completedAt ?? null,
    input.durationSeconds ?? null,
    input.notes ?? null,
    input.feeling ?? null,
  );

  return {
    id,
    dayId: input.dayId,
    dayName: input.dayName,
    weekNumber: input.weekNumber,
    phase: input.phase,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationSeconds: input.durationSeconds,
    totalSets: 0,
    completedSets: 0,
    totalVolume: 0,
    notes: input.notes,
    feeling: input.feeling,
  };
}

export function updateWorkout(id: string, patch: Partial<Workout>): void {
  const db = getDb();

  // camelCase -> snake_case column map for all updatable fields.
  const colMap: Partial<Record<keyof Workout, string>> = {
    dayId: "day_id",
    dayName: "day_name",
    weekNumber: "week_number",
    phase: "phase",
    startedAt: "started_at",
    completedAt: "completed_at",
    durationSeconds: "duration_seconds",
    totalSets: "total_sets",
    completedSets: "completed_sets",
    totalVolume: "total_volume",
    notes: "notes",
    feeling: "feeling",
  };

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, col] of Object.entries(colMap) as [
    keyof Workout,
    string,
  ][]) {
    if (!(key in patch)) continue;
    const raw = patch[key];
    sets.push(`${col} = ?`);
    values.push(raw === undefined ? null : (raw as string | number));
  }

  if (sets.length === 0) return;

  values.push(id);
  db.runSync(
    `UPDATE workouts SET ${sets.join(", ")} WHERE id = ?`,
    ...values,
  );
}

export function getWorkout(id: string): Workout | null {
  const db = getDb();
  const row = db.getFirstSync<WorkoutRow>(
    "SELECT * FROM workouts WHERE id = ?",
    id,
  );
  return row ? rowToWorkout(row) : null;
}

export function getRecentWorkouts(limit: number): Workout[] {
  const db = getDb();
  const rows = db.getAllSync<WorkoutRow>(
    "SELECT * FROM workouts ORDER BY started_at DESC LIMIT ?",
    limit,
  );
  return rows.map(rowToWorkout);
}

export function getAllWorkouts(): Workout[] {
  const db = getDb();
  const rows = db.getAllSync<WorkoutRow>(
    "SELECT * FROM workouts ORDER BY started_at DESC",
  );
  return rows.map(rowToWorkout);
}

export function getWorkoutsByDay(dayId: string): Workout[] {
  const db = getDb();
  const rows = db.getAllSync<WorkoutRow>(
    "SELECT * FROM workouts WHERE day_id = ? ORDER BY started_at DESC",
    dayId,
  );
  return rows.map(rowToWorkout);
}

export function getWorkoutsInWeek(
  startedAtFrom: string,
  startedAtTo: string,
): Workout[] {
  const db = getDb();
  const rows = db.getAllSync<WorkoutRow>(
    `SELECT * FROM workouts
     WHERE started_at >= ? AND started_at < ?
     ORDER BY started_at DESC`,
    startedAtFrom,
    startedAtTo,
  );
  return rows.map(rowToWorkout);
}

export function deleteWorkout(id: string): void {
  const db = getDb();
  db.execSync("PRAGMA foreign_keys = ON;");
  db.runSync("DELETE FROM workouts WHERE id = ?", id);
}

export function getActiveWorkout(): Workout | null {
  const db = getDb();
  const row = db.getFirstSync<WorkoutRow>(
    `SELECT * FROM workouts
     WHERE completed_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
  );
  return row ? rowToWorkout(row) : null;
}

// -----------------------------------------------------------------------------
// Logged sets
// -----------------------------------------------------------------------------

export function createLoggedSet(input: Omit<LoggedSet, "id">): LoggedSet {
  const db = getDb();
  const id = uuidv4();

  db.runSync(
    `INSERT INTO logged_sets (
       id, workout_id, exercise_id, set_index,
       target_reps_low, target_reps_high, target_rpe, set_type,
       weight, completed_reps, actual_rpe,
       completed, skipped,
       notes, exercise_substitution, timestamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.workoutId,
    input.exerciseId,
    input.setIndex,
    input.targetRepsLow,
    input.targetRepsHigh,
    input.targetRpe,
    input.setType,
    input.weight,
    input.completedReps,
    input.actualRpe ?? null,
    input.completed ? 1 : 0,
    input.skipped ? 1 : 0,
    input.notes ?? null,
    input.exerciseSubstitution ?? null,
    input.timestamp,
  );

  return { id, ...input };
}

export function updateLoggedSet(id: string, patch: Partial<LoggedSet>): void {
  const db = getDb();

  const colMap: Partial<Record<keyof LoggedSet, string>> = {
    workoutId: "workout_id",
    exerciseId: "exercise_id",
    setIndex: "set_index",
    targetRepsLow: "target_reps_low",
    targetRepsHigh: "target_reps_high",
    targetRpe: "target_rpe",
    setType: "set_type",
    weight: "weight",
    completedReps: "completed_reps",
    actualRpe: "actual_rpe",
    completed: "completed",
    skipped: "skipped",
    notes: "notes",
    exerciseSubstitution: "exercise_substitution",
    timestamp: "timestamp",
  };

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, col] of Object.entries(colMap) as [
    keyof LoggedSet,
    string,
  ][]) {
    if (!(key in patch)) continue;
    let raw = patch[key];
    // Coerce booleans.
    if (key === "completed" || key === "skipped") {
      raw = (raw ? 1 : 0) as never;
    }
    sets.push(`${col} = ?`);
    values.push(raw === undefined ? null : (raw as string | number));
  }

  if (sets.length === 0) return;

  values.push(id);
  db.runSync(
    `UPDATE logged_sets SET ${sets.join(", ")} WHERE id = ?`,
    ...values,
  );
}

export function getLoggedSetsForWorkout(workoutId: string): LoggedSet[] {
  const db = getDb();
  const rows = db.getAllSync<LoggedSetRow>(
    `SELECT * FROM logged_sets
     WHERE workout_id = ?
     ORDER BY exercise_id ASC, set_index ASC`,
    workoutId,
  );
  return rows.map(rowToLoggedSet);
}

/**
 * Most-recent-first history for a single exercise. Only completed, non-warmup
 * sets. Useful for charts and ghost values across sessions.
 */
export function getLoggedSetsForExercise(
  exerciseId: string,
  limit?: number,
): LoggedSet[] {
  const db = getDb();
  const sql = `
    SELECT ls.* FROM logged_sets ls
    JOIN workouts w ON ls.workout_id = w.id
    WHERE ls.exercise_id = ?
      AND ls.set_type != 'warmup'
      AND ls.completed = 1
    ORDER BY w.started_at DESC, ls.set_index ASC
    ${typeof limit === "number" ? "LIMIT ?" : ""}
  `;
  const rows =
    typeof limit === "number"
      ? db.getAllSync<LoggedSetRow>(sql, exerciseId, limit)
      : db.getAllSync<LoggedSetRow>(sql, exerciseId);
  return rows.map(rowToLoggedSet);
}

export function deleteLoggedSet(id: string): void {
  const db = getDb();
  db.runSync("DELETE FROM logged_sets WHERE id = ?", id);
}

/**
 * Returns the logged sets from the single most recent *other* workout that
 * contained this exercise — used to populate ghost values on the active
 * workout screen. Excludes warmup sets; includes skipped/incomplete sets so
 * the ghost column always has something meaningful to show.
 */
export function getPreviousSessionSets(
  exerciseId: string,
  excludeWorkoutId?: string,
): LoggedSet[] {
  const db = getDb();

  // First, find the most recent workout_id (other than excludeWorkoutId) that
  // logged this exercise.
  const previousWorkoutRow = excludeWorkoutId
    ? db.getFirstSync<{ workout_id: string }>(
        `SELECT ls.workout_id FROM logged_sets ls
         JOIN workouts w ON ls.workout_id = w.id
         WHERE ls.exercise_id = ?
           AND ls.workout_id != ?
           AND ls.set_type != 'warmup'
         ORDER BY w.started_at DESC
         LIMIT 1`,
        exerciseId,
        excludeWorkoutId,
      )
    : db.getFirstSync<{ workout_id: string }>(
        `SELECT ls.workout_id FROM logged_sets ls
         JOIN workouts w ON ls.workout_id = w.id
         WHERE ls.exercise_id = ?
           AND ls.set_type != 'warmup'
         ORDER BY w.started_at DESC
         LIMIT 1`,
        exerciseId,
      );

  if (!previousWorkoutRow) return [];

  const rows = db.getAllSync<LoggedSetRow>(
    `SELECT * FROM logged_sets
     WHERE workout_id = ?
       AND exercise_id = ?
       AND set_type != 'warmup'
     ORDER BY set_index ASC`,
    previousWorkoutRow.workout_id,
    exerciseId,
  );
  return rows.map(rowToLoggedSet);
}

// -----------------------------------------------------------------------------
// Warmup sets
// -----------------------------------------------------------------------------

export function createWarmupSet(input: Omit<WarmupSet, "id">): WarmupSet {
  const db = getDb();
  const id = uuidv4();
  db.runSync(
    `INSERT INTO warmup_sets (
       id, workout_id, exercise_id, set_index, weight, reps, timestamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.workoutId,
    input.exerciseId,
    input.setIndex,
    input.weight,
    input.reps,
    input.timestamp,
  );
  return { id, ...input };
}

export function getWarmupSetsForWorkout(
  workoutId: string,
  exerciseId?: string,
): WarmupSet[] {
  const db = getDb();
  if (exerciseId && exerciseId.length > 0) {
    const rows = db.getAllSync<WarmupSetRow>(
      `SELECT * FROM warmup_sets
       WHERE workout_id = ? AND exercise_id = ?
       ORDER BY set_index ASC`,
      workoutId,
      exerciseId,
    );
    return rows.map(rowToWarmupSet);
  }
  const rows = db.getAllSync<WarmupSetRow>(
    `SELECT * FROM warmup_sets
     WHERE workout_id = ?
     ORDER BY exercise_id ASC, set_index ASC`,
    workoutId,
  );
  return rows.map(rowToWarmupSet);
}

export function deleteWarmupSet(id: string): void {
  const db = getDb();
  db.runSync("DELETE FROM warmup_sets WHERE id = ?", id);
}

// -----------------------------------------------------------------------------
// Exercise state (progression tracking)
// -----------------------------------------------------------------------------

export function getExerciseState(
  exerciseId: string,
): ExerciseState | null {
  const db = getDb();
  const row = db.getFirstSync<ExerciseStateRow>(
    "SELECT * FROM exercise_state WHERE exercise_id = ?",
    exerciseId,
  );
  return row ? rowToExerciseState(row) : null;
}

export function upsertExerciseState(state: ExerciseState): void {
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO exercise_state (
       exercise_id, current_weight, last_successful_weight,
       current_reps_low, current_reps_high, increment,
       total_sessions, last_performed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    state.exerciseId,
    state.currentWeight,
    state.lastSuccessfulWeight,
    state.currentRepsLow,
    state.currentRepsHigh,
    state.increment,
    state.totalSessions,
    state.lastPerformedAt ?? null,
  );
}

export function getAllExerciseStates(): ExerciseState[] {
  const db = getDb();
  const rows = db.getAllSync<ExerciseStateRow>(
    "SELECT * FROM exercise_state",
  );
  return rows.map(rowToExerciseState);
}

// -----------------------------------------------------------------------------
// Personal records
// -----------------------------------------------------------------------------

export function createPR(
  input: Omit<PersonalRecord, "id">,
): PersonalRecord {
  const db = getDb();
  const id = uuidv4();
  db.runSync(
    `INSERT INTO personal_records (
       id, exercise_id, pr_type, value,
       weight, reps, estimated_1rm,
       achieved_at, workout_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.exerciseId,
    input.prType,
    input.value,
    input.weight ?? null,
    input.reps ?? null,
    input.estimated1rm ?? null,
    input.achievedAt,
    input.workoutId || null,
  );
  return { id, ...input };
}

export function getPRsForExercise(exerciseId: string): PersonalRecord[] {
  const db = getDb();
  const rows = db.getAllSync<PRRow>(
    `SELECT * FROM personal_records
     WHERE exercise_id = ?
     ORDER BY achieved_at DESC`,
    exerciseId,
  );
  return rows.map(rowToPR);
}

/**
 * One row per (exercise_id, pr_type) with MAX(value), joined back to the
 * record that set it so we can show its date/workout.
 */
export function getAllCurrentPRs(): PersonalRecord[] {
  const db = getDb();
  const rows = db.getAllSync<PRRow>(
    `SELECT pr.* FROM personal_records pr
     INNER JOIN (
       SELECT exercise_id, pr_type, MAX(value) AS max_value
       FROM personal_records
       GROUP BY exercise_id, pr_type
     ) best
       ON pr.exercise_id = best.exercise_id
      AND pr.pr_type = best.pr_type
      AND pr.value = best.max_value
     ORDER BY pr.achieved_at DESC`,
  );
  return rows.map(rowToPR);
}

export function getPRsByWorkout(workoutId: string): PersonalRecord[] {
  const db = getDb();
  const rows = db.getAllSync<PRRow>(
    `SELECT * FROM personal_records
     WHERE workout_id = ?
     ORDER BY achieved_at DESC`,
    workoutId,
  );
  return rows.map(rowToPR);
}

// -----------------------------------------------------------------------------
// Body metrics
// -----------------------------------------------------------------------------

/**
 * Insert or replace by date. If a row exists for the given date, its id is
 * preserved; otherwise a fresh uuid is generated.
 */
export function upsertBodyMetric(
  metric: Omit<BodyMetric, "id">,
): BodyMetric {
  const db = getDb();
  const existing = db.getFirstSync<{ id: string }>(
    "SELECT id FROM body_metrics WHERE date = ?",
    metric.date,
  );
  const id = existing?.id ?? uuidv4();

  db.runSync(
    `INSERT INTO body_metrics (
       id, date, weight, skeletal_muscle_mass, waist, notes
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       weight = excluded.weight,
       skeletal_muscle_mass = excluded.skeletal_muscle_mass,
       waist = excluded.waist,
       notes = excluded.notes`,
    id,
    metric.date,
    metric.weight ?? null,
    metric.skeletalMuscleMass ?? null,
    metric.waist ?? null,
    metric.notes ?? null,
  );

  return { id, ...metric };
}

export function getBodyMetrics(limitDays?: number): BodyMetric[] {
  const db = getDb();
  const rows =
    typeof limitDays === "number"
      ? db.getAllSync<BodyMetricRow>(
          "SELECT * FROM body_metrics ORDER BY date DESC LIMIT ?",
          limitDays,
        )
      : db.getAllSync<BodyMetricRow>(
          "SELECT * FROM body_metrics ORDER BY date DESC",
        );
  return rows.map(rowToBodyMetric);
}

export function getBodyMetricByDate(date: string): BodyMetric | null {
  const db = getDb();
  const row = db.getFirstSync<BodyMetricRow>(
    "SELECT * FROM body_metrics WHERE date = ?",
    date,
  );
  return row ? rowToBodyMetric(row) : null;
}

export function deleteBodyMetric(id: string): void {
  const db = getDb();
  db.runSync("DELETE FROM body_metrics WHERE id = ?", id);
}

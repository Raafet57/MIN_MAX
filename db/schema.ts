// =============================================================================
// MinMax Tracker — SQLite schema (v1)
// Only CREATE TABLE / INDEX statements. Consumed by migrations.ts.
// =============================================================================

export const SCHEMA_V1: string = `
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  day_name TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  phase TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER,
  total_sets INTEGER DEFAULT 0,
  completed_sets INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  notes TEXT,
  feeling INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logged_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  target_reps_low INTEGER NOT NULL,
  target_reps_high INTEGER NOT NULL,
  target_rpe REAL NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight REAL,
  completed_reps INTEGER,
  actual_rpe REAL,
  completed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  notes TEXT,
  exercise_substitution TEXT,
  timestamp TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logged_sets_workout ON logged_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_logged_sets_exercise ON logged_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_logged_sets_timestamp ON logged_sets(timestamp);

CREATE TABLE IF NOT EXISTS exercise_state (
  exercise_id TEXT PRIMARY KEY,
  current_weight REAL DEFAULT 0,
  last_successful_weight REAL DEFAULT 0,
  current_reps_low INTEGER,
  current_reps_high INTEGER,
  increment REAL DEFAULT 2.5,
  total_sessions INTEGER DEFAULT 0,
  last_performed_at TEXT
);

CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  pr_type TEXT NOT NULL,
  value REAL NOT NULL,
  weight REAL,
  reps INTEGER,
  estimated_1rm REAL,
  achieved_at TEXT NOT NULL,
  workout_id TEXT REFERENCES workouts(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prs_exercise ON personal_records(exercise_id);

CREATE TABLE IF NOT EXISTS body_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  weight REAL,
  skeletal_muscle_mass REAL,
  waist REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_body_metrics_date ON body_metrics(date);

CREATE TABLE IF NOT EXISTS warmup_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  weight REAL,
  reps INTEGER,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);
`;

/**
 * List of every user-data table. Used by resetDatabase() to drop everything
 * before re-running migrations.
 */
export const ALL_TABLES: readonly string[] = [
  "logged_sets",
  "warmup_sets",
  "personal_records",
  "body_metrics",
  "exercise_state",
  "workouts",
  "settings",
  "schema_version",
];

// =============================================================================
// MinMax Tracker — Schema migrations
// Idempotent. Safe to call on every app launch.
// =============================================================================

import type { SQLiteDatabase } from "expo-sqlite";

import { DB_VERSION, DEFAULT_SETTINGS } from "@/constants/config";
import type { AppSettings } from "@/types";

import { SCHEMA_V1 } from "./schema";

/**
 * Encode a default AppSettings value for storage in the settings table.
 * Booleans → "1" / "0"
 * number[] → comma-joined
 * number   → String(value)
 * string   → as-is
 */
function encodeSettingValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "number") return String(value);
  return String(value ?? "");
}

/**
 * Read the schema_version row, treating "no rows" / "table missing" as 0.
 */
function readCurrentVersion(db: SQLiteDatabase): number {
  try {
    const row = db.getFirstSync<{ version: number }>(
      "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
    );
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Apply SCHEMA_V1 and seed default settings. Idempotent thanks to
 * `IF NOT EXISTS` in every DDL statement and `INSERT OR IGNORE` on settings.
 */
function applyV1(db: SQLiteDatabase): void {
  db.execSync(SCHEMA_V1);

  // Record schema version (idempotent).
  db.runSync(
    "INSERT OR IGNORE INTO schema_version (version) VALUES (?)",
    1,
  );

  // Seed default settings — do NOT overwrite anything the user already set.
  const entries = Object.entries(DEFAULT_SETTINGS) as [
    keyof AppSettings,
    AppSettings[keyof AppSettings],
  ][];
  for (const [key, value] of entries) {
    db.runSync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      String(key),
      encodeSettingValue(value),
    );
  }
}

/**
 * Main entry point. Runs all pending migrations up to DB_VERSION.
 * Foreign keys are enabled here too (they must be re-enabled per connection
 * by the queries layer as well).
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  db.execSync("PRAGMA foreign_keys = ON;");

  const currentVersion = readCurrentVersion(db);

  if (currentVersion < 1) {
    applyV1(db);
  }

  // Future migrations: if (currentVersion < 2) { applyV2(db); } etc.

  // Sanity: ensure we never leave an unknown future version behind.
  const final = readCurrentVersion(db);
  if (final > DB_VERSION) {
    // Database was created by a newer build of the app. We don't attempt
    // automatic downgrade; the caller will have to handle this.
    throw new Error(
      `Database schema version ${final} is newer than app DB_VERSION ${DB_VERSION}`,
    );
  }
}

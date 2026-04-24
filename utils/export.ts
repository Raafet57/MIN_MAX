// =============================================================================
// Export / import helpers.
// JSON  — full database dump (human-readable, backup-friendly).
// CSV   — workout history, one row per logged set.
// Also: parse a body-weight CSV for import.
// =============================================================================

import type { LoggedSet, Workout } from "@/types";
import { APP_CONFIG } from "@/constants/config";
import {
  getAllCurrentPRs,
  getAllExerciseStates,
  getAllSettings,
  getAllWorkouts,
  getLoggedSetsForWorkout,
} from "@/db/queries";
import { lbToKg } from "@/utils/formatters";

// --- JSON dump -------------------------------------------------------------

export function exportAllAsJson(): string {
  const workouts = getAllWorkouts();
  const sets: LoggedSet[] = [];
  for (const w of workouts) {
    sets.push(...getLoggedSetsForWorkout(w.id));
  }

  const payload = {
    app: {
      id: APP_CONFIG.programId,
      name: APP_CONFIG.programName,
      exportedAt: new Date().toISOString(),
    },
    settings: getAllSettings(),
    workouts,
    loggedSets: sets,
    exerciseStates: getAllExerciseStates(),
    personalRecords: getAllCurrentPRs(),
  };

  return JSON.stringify(payload, null, 2);
}

// --- CSV (workout history) -------------------------------------------------

const CSV_HEADER = [
  "date",
  "day",
  "week",
  "phase",
  "exercise",
  "set_index",
  "weight_kg",
  "reps",
  "rpe",
  "type",
  "notes",
];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s === "") return "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportWorkoutsAsCsv(): string {
  const lines: string[] = [CSV_HEADER.join(",")];
  const workouts = getAllWorkouts();
  // Index workouts for O(1) lookup when building rows.
  const byId = new Map<string, Workout>(workouts.map((w) => [w.id, w]));

  for (const w of workouts) {
    const sets = getLoggedSetsForWorkout(w.id);
    for (const s of sets) {
      const row = [
        s.timestamp || w.startedAt,
        w.dayName,
        w.weekNumber,
        w.phase,
        s.exerciseId,
        s.setIndex,
        s.weight ?? "",
        s.completedReps ?? "",
        s.actualRpe ?? s.targetRpe ?? "",
        s.setType,
        s.notes ?? "",
      ];
      // Ensure the referenced workout still resolves (prevents orphans).
      if (!byId.has(s.workoutId)) continue;
      lines.push(row.map(csvEscape).join(","));
    }
  }

  return lines.join("\n");
}

// --- Body-weight CSV import ------------------------------------------------

interface ParsedBodyWeight {
  date: string;
  weight: number;
}

/**
 * Parse a very small CSV with header "date,weight" or "date,weight_kg"
 * (or "weight_lb"). Unknown/malformed lines are skipped silently.
 *
 * Returns weights normalised to kg.
 */
export function parseBodyWeightCsv(csv: string): ParsedBodyWeight[] {
  const out: ParsedBodyWeight[] = [];
  if (!csv) return out;

  const lines = csv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return out;

  const header = lines[0].toLowerCase().split(",").map((c) => c.trim());
  const dateIdx = header.indexOf("date");
  let weightIdx = header.indexOf("weight_kg");
  let isLb = false;
  if (weightIdx === -1) weightIdx = header.indexOf("weight");
  if (weightIdx === -1) {
    weightIdx = header.indexOf("weight_lb");
    if (weightIdx !== -1) isLb = true;
  }

  if (dateIdx === -1 || weightIdx === -1) return out;

  // If the column name explicitly ended in _lb, convert each value.
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length <= Math.max(dateIdx, weightIdx)) continue;
    const date = (cols[dateIdx] ?? "").trim();
    const rawWeight = (cols[weightIdx] ?? "").trim();
    if (!date || !rawWeight) continue;
    const num = Number(rawWeight);
    if (!Number.isFinite(num) || num <= 0) continue;
    const weight = isLb ? lbToKg(num) : num;
    out.push({ date, weight: Math.round(weight * 1000) / 1000 });
  }

  return out;
}

/**
 * Minimal CSV-line splitter that handles double-quoted fields with commas.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

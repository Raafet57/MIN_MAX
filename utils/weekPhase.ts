// =============================================================================
// Week + phase calculations derived from the user's program start date.
// =============================================================================

import { differenceInCalendarDays, startOfDay } from "date-fns";

import type { DayId, Phase } from "@/types";
import { APP_CONFIG } from "@/constants/config";
import { getPhaseForWeek } from "@/data/phases";

/**
 * Parse an ISO (date or datetime) string as a local Date at midnight.
 */
function midnight(iso: string): Date {
  return startOfDay(new Date(iso));
}

/**
 * Current program week (1-indexed), capped at `APP_CONFIG.totalWeeks`.
 * Day 1..7 -> week 1; day 8..14 -> week 2; etc.
 */
export function currentWeek(startDate: string): number {
  const days = daysIntoProgram(startDate);
  if (days < 0) return 1;
  const week = Math.ceil((days + 1) / 7);
  if (week < 1) return 1;
  if (week > APP_CONFIG.totalWeeks) return APP_CONFIG.totalWeeks;
  return week;
}

/**
 * True once the user has surpassed the program's total duration.
 * Uses the uncapped week calculation so "complete" fires after week 12.
 */
export function isProgramComplete(startDate: string): boolean {
  const days = daysIntoProgram(startDate);
  if (days < 0) return false;
  const uncapped = Math.ceil((days + 1) / 7);
  return uncapped > APP_CONFIG.totalWeeks;
}

/**
 * Calendar days elapsed since the program start (0 on day one).
 */
export function daysIntoProgram(startDate: string): number {
  return differenceInCalendarDays(startOfDay(new Date()), midnight(startDate));
}

/**
 * Cycle: full-body -> upper -> lower -> arms-delts -> full-body ...
 * If no workout has been completed yet, start with the first day.
 */
export function nextDayId(lastCompletedDayId?: DayId): DayId {
  const cycle = APP_CONFIG.dayCycle as readonly DayId[];
  if (!lastCompletedDayId) return cycle[0];
  const idx = cycle.indexOf(lastCompletedDayId);
  if (idx === -1) return cycle[0];
  return cycle[(idx + 1) % cycle.length];
}

/**
 * Re-export from data/phases so consumers only need one import path.
 */
export function phaseForWeek(week: number): Phase {
  return getPhaseForWeek(week);
}

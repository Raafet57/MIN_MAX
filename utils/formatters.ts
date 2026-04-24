// =============================================================================
// Display formatters: weight, duration, dates, volume, rep ranges.
// All weights are stored internally in kilograms; display conversion lives here.
// =============================================================================

import { format } from "date-fns";

import type { WeightUnit } from "@/types";
import { APP_CONFIG } from "@/constants/config";

// --- Weight conversion -----------------------------------------------------

export function kgToLb(kg: number): number {
  return kg * APP_CONFIG.kgToLb;
}

export function lbToKg(lb: number): number {
  return lb / APP_CONFIG.kgToLb;
}

/**
 * Convert stored kg -> display value in the user's unit, rounded to .1.
 */
export function displayWeight(kgStored: number, unit: WeightUnit): number {
  const raw = unit === "lb" ? kgToLb(kgStored) : kgStored;
  return Math.round(raw * 10) / 10;
}

/**
 * Convert user-entered display value back to kg for storage.
 * Returns the value rounded to 3 decimals to avoid float drift.
 */
export function storageWeight(displayValue: number, unit: WeightUnit): number {
  const kg = unit === "lb" ? lbToKg(displayValue) : displayValue;
  return Math.round(kg * 1000) / 1000;
}

// --- Display strings -------------------------------------------------------

function formatNumber1dp(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

function formatNumberThousands(n: number): string {
  const rounded = Math.round(n);
  return rounded.toLocaleString("en-US");
}

/**
 * "42.5 kg" / "93.7 lb" — 1 decimal place, unit suffix included.
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const v = unit === "lb" ? kgToLb(kg) : kg;
  return `${formatNumber1dp(v)} ${unit}`;
}

/**
 * Compact duration:
 *   < 1 hour      -> "42m 15s"
 *   >= 1 hour     -> "1h 23m"
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "EEE, MMM d");
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "EEE, MMM d • h:mm a");
}

/**
 * Whole-number volume with thousands separators: "3,240 kg" / "7,145 lb".
 */
export function formatVolume(kg: number, unit: WeightUnit): string {
  const v = unit === "lb" ? kgToLb(kg) : kg;
  return `${formatNumberThousands(v)} ${unit}`;
}

/**
 * Rep range helper: "6-8" or just "8" when bounds match.
 */
export function formatRepRange(low: number, high: number): string {
  if (low === high) return String(low);
  return `${low}-${high}`;
}

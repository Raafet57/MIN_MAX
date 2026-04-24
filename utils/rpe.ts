// =============================================================================
// RPE helpers: human-readable labels + color mapping.
// =============================================================================

import type { RPE } from "@/types";
import { rpeColors } from "@/constants/colors";

export const RPE_DESCRIPTIONS: Record<
  RPE,
  { short: string; long: string; repsInReserve: number }
> = {
  7: {
    short: "Easy",
    long: "3 reps in reserve. Could grind out a few more.",
    repsInReserve: 3,
  },
  8: {
    short: "Moderate",
    long: "2 reps in reserve. Difficult but controlled.",
    repsInReserve: 2,
  },
  9: {
    short: "Hard",
    long: "1 rep in reserve. Bar slows noticeably on the last rep.",
    repsInReserve: 1,
  },
  10: {
    short: "Max",
    long: "0 reps in reserve. True technical failure.",
    repsInReserve: 0,
  },
};

/**
 * Clamp any rpe-ish number to the closest of {7,8,9,10} and return its hex.
 */
export function rpeColor(rpe: number): string {
  const clamped = clampToStep(rpe);
  return rpeColors[clamped];
}

export function rpeLabel(rpe: number): string {
  const clamped = clampToStep(rpe);
  return `@${clamped} ${RPE_DESCRIPTIONS[clamped].short}`;
}

function clampToStep(rpe: number): RPE {
  if (!Number.isFinite(rpe)) return 9;
  if (rpe <= 7) return 7;
  if (rpe >= 10) return 10;
  // Round to nearest integer within 7..10.
  const r = Math.round(rpe);
  if (r === 7 || r === 8 || r === 9 || r === 10) return r as RPE;
  return 9;
}

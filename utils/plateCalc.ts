// =============================================================================
// Plate loading calculator. Greedy from heaviest to lightest, per-side.
// =============================================================================

export interface PlateBreakdown {
  /** Plates to load, one entry per plate, heaviest first (for one side). */
  plates: number[];
  /** Same as `plates`; per-side list. Kept for API clarity. */
  perSide: number[];
  /** Unresolved weight left over after greedy fit (kg on the bar total). */
  remaining: number;
}

/**
 * Compute plates per side for a target weight given bar + plate set.
 *
 * - If targetKg <= barKg, nothing is loaded and `remaining` reflects any
 *   requested weight below the bar (negative if target was set under bar).
 * - `available` is a list of plate sizes in kg. Duplicates are treated as a
 *   unique set (we assume unlimited supply of each size, consistent with gym).
 */
export function platesFor(
  targetKg: number,
  barKg: number,
  available: number[],
): PlateBreakdown {
  if (!Number.isFinite(targetKg) || !Number.isFinite(barKg)) {
    return { plates: [], perSide: [], remaining: 0 };
  }

  if (targetKg <= barKg) {
    return {
      plates: [],
      perSide: [],
      remaining: Math.max(0, targetKg - barKg),
    };
  }

  const perSideTarget = (targetKg - barKg) / 2;
  // Sort heaviest-first. Dedup so 20,20,15 and 20,15 behave identically.
  const sizes = Array.from(new Set(available))
    .filter((p) => p > 0)
    .sort((a, b) => b - a);

  const plates: number[] = [];
  let remainingPerSide = perSideTarget;
  // Use an epsilon to avoid float drift (e.g. 2.5+1.25 type combinations).
  const EPS = 1e-6;

  for (const size of sizes) {
    while (remainingPerSide + EPS >= size) {
      plates.push(size);
      remainingPerSide -= size;
    }
  }

  // Snap tiny float residuals to zero.
  if (Math.abs(remainingPerSide) < EPS) remainingPerSide = 0;

  return {
    plates,
    perSide: plates,
    // Convert per-side leftover back to total weight remaining.
    remaining: remainingPerSide * 2,
  };
}

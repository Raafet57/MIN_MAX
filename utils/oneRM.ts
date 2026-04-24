// =============================================================================
// Estimated 1-rep-max formulas.
// =============================================================================

/**
 * Epley:  1RM = weight * (1 + reps/30)
 * Returns 0 for degenerate inputs so callers can filter trivially.
 */
export function epley1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0) return 0;
  if (!reps || reps < 1) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Brzycki: 1RM = weight * (36 / (37 - reps))
 * Valid for reps < 37; returns 0 otherwise.
 */
export function brzycki1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0) return 0;
  if (!reps || reps < 1) return 0;
  if (reps >= 37) return 0;
  return weight * (36 / (37 - reps));
}

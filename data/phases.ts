import type { Phase, PhaseId } from "@/types";
import { phaseColors } from "@/constants/colors";

export const PHASES: Phase[] = [
  {
    id: "intro",
    name: "Intro",
    weekRange: [1, 1],
    color: phaseColors.intro,
    progressionEnabled: true,
    description: "Establish baselines. Compounds at lower RPE (7-8).",
  },
  {
    id: "base",
    name: "Base",
    weekRange: [2, 6],
    color: phaseColors.base,
    progressionEnabled: true,
    description: "Progressive overload. RPE @9-10 across the board.",
  },
  {
    id: "deload",
    name: "Deload",
    weekRange: [7, 7],
    color: phaseColors.deload,
    progressionEnabled: false,
    description: "Recovery week. Same weights, lower effort. No progression.",
  },
  {
    id: "intensification",
    name: "Intensification",
    weekRange: [8, 12],
    color: phaseColors.intensification,
    progressionEnabled: true,
    description:
      "Advanced techniques: partials, drop sets, myo-reps. Peak block.",
  },
];

export function getPhaseForWeek(week: number): Phase {
  if (week <= 1) return PHASES[0];
  if (week <= 6) return PHASES[1];
  if (week === 7) return PHASES[2];
  return PHASES[3];
}

export function getPhaseById(id: PhaseId): Phase {
  return PHASES.find((p) => p.id === id) ?? PHASES[0];
}

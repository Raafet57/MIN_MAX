import type { MuscleGroup } from "@/types";
import { muscleColors } from "@/constants/colors";

export interface MuscleGroupInfo {
  id: MuscleGroup;
  displayName: string;
  shortName: string;
  color: string;
  recommendedWeeklySets: [number, number];
}

export const MUSCLE_GROUPS: Record<MuscleGroup, MuscleGroupInfo> = {
  shoulders: {
    id: "shoulders",
    displayName: "Shoulders",
    shortName: "Delts",
    color: muscleColors.shoulders,
    recommendedWeeklySets: [10, 20],
  },
  chest: {
    id: "chest",
    displayName: "Chest",
    shortName: "Chest",
    color: muscleColors.chest,
    recommendedWeeklySets: [10, 20],
  },
  back: {
    id: "back",
    displayName: "Back",
    shortName: "Back",
    color: muscleColors.back,
    recommendedWeeklySets: [10, 25],
  },
  biceps: {
    id: "biceps",
    displayName: "Biceps",
    shortName: "Bis",
    color: muscleColors.biceps,
    recommendedWeeklySets: [8, 20],
  },
  triceps: {
    id: "triceps",
    displayName: "Triceps",
    shortName: "Tris",
    color: muscleColors.triceps,
    recommendedWeeklySets: [8, 20],
  },
  forearms: {
    id: "forearms",
    displayName: "Forearms",
    shortName: "Fore",
    color: muscleColors.forearms,
    recommendedWeeklySets: [4, 10],
  },
  quadriceps: {
    id: "quadriceps",
    displayName: "Quadriceps",
    shortName: "Quads",
    color: muscleColors.quadriceps,
    recommendedWeeklySets: [8, 18],
  },
  hamstrings: {
    id: "hamstrings",
    displayName: "Hamstrings",
    shortName: "Hams",
    color: muscleColors.hamstrings,
    recommendedWeeklySets: [6, 16],
  },
  glutes: {
    id: "glutes",
    displayName: "Glutes",
    shortName: "Glutes",
    color: muscleColors.glutes,
    recommendedWeeklySets: [6, 16],
  },
  calves: {
    id: "calves",
    displayName: "Calves",
    shortName: "Calves",
    color: muscleColors.calves,
    recommendedWeeklySets: [6, 16],
  },
  abs: {
    id: "abs",
    displayName: "Abs",
    shortName: "Abs",
    color: muscleColors.abs,
    recommendedWeeklySets: [4, 12],
  },
};

export function getMuscleColor(group: MuscleGroup): string {
  return MUSCLE_GROUPS[group].color;
}

export function getMuscleShortName(group: MuscleGroup): string {
  return MUSCLE_GROUPS[group].shortName;
}

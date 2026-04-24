// Dark-theme palette. Hex literals — use with NativeWind or inline styles.

export const colors = {
  // Surfaces
  bg: "#0A0A0A",
  surface: "#141414",
  surfaceElevated: "#1E1E1E",
  surfaceOverlay: "#282828",
  card: "#1A1A1A",

  // Borders & dividers
  border: "#1F1F1F",
  borderActive: "#333333",
  divider: "#1A1A1A",
  dividerStrong: "#252525",

  // Text
  textPrimary: "#F5F5F5",
  textSecondary: "#999999",
  textTertiary: "#555555",
  textInverse: "#0A0A0A",
  ghost: "#3A3A3A",

  // Accent
  primary: "#E94560",
  primaryPressed: "#D63D56",
  primaryMuted: "#E9456020",
  secondary: "#4ECDC4",
  secondaryMuted: "#4ECDC420",
  tertiary: "#A855F7",
  tertiaryMuted: "#A855F720",

  // Semantic
  success: "#4ADE80",
  successMuted: "#4ADE8020",
  warning: "#FBBF24",
  warningMuted: "#FBBF2420",
  error: "#EF4444",
  errorMuted: "#EF444420",
  prGold: "#FFD700",
} as const;

export const rpeColors = {
  7: "#4ECDC4",
  8: "#FBBF24",
  9: "#F97316",
  10: "#E94560",
} as const;

export const phaseColors = {
  intro: "#4ECDC4",
  base: "#E94560",
  deload: "#FBBF24",
  intensification: "#A855F7",
} as const;

export const muscleColors: Record<string, string> = {
  shoulders: "#E94560",
  back: "#4ECDC4",
  chest: "#F97316",
  quadriceps: "#3B82F6",
  hamstrings: "#8B5CF6",
  glutes: "#EC4899",
  biceps: "#10B981",
  triceps: "#6366F1",
  calves: "#14B8A6",
  forearms: "#F59E0B",
  abs: "#64748B",
};

export const feelingColors: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#FBBF24",
  4: "#4ADE80",
  5: "#E94560",
};

export const feelingEmoji: Record<number, string> = {
  1: "😴",
  2: "😐",
  3: "🙂",
  4: "💪",
  5: "🔥",
};

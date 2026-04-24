// 4pt base grid spacing tokens + sizing conventions.

export const spacing = {
  "2xs": 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 99,
} as const;

export const touchTarget = {
  min: 44,
  recommended: 48,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "600" as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: "500" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: "500" as const },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  dataLarge: { fontSize: 28, lineHeight: 32, fontWeight: "700" as const },
  dataMedium: { fontSize: 18, lineHeight: 22, fontWeight: "500" as const },
  dataSmall: { fontSize: 14, lineHeight: 18, fontWeight: "400" as const },
};

export const screenPadding = {
  horizontal: 16,
  topOffset: 8,
  bottomOffset: 8,
  tabBarHeight: 56,
};

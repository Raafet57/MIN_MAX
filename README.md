# MinMax Tracker

Offline-first personal workout tracker for the **Min-Max 4x** 12-week strength program. Single user, no cloud, no accounts. Built with Expo / React Native.

The program is hardcoded: 4 training days (Full Body / Upper / Lower / Arms+Delts) cycled in order, 12 weeks split into Intro (week 1) → Base (weeks 2-6) → Deload (week 7) → Intensification (weeks 8-12). The app auto-progresses weights, detects PRs, freezes progression on deload, and layers partials / drop sets / myo-reps into the intensification block.

## Stack

- Expo SDK 55, React Native 0.83, React 19, TypeScript
- Expo Router v5 (file-based navigation)
- SQLite via `expo-sqlite` (offline-first, crash-recoverable)
- Zustand for runtime state, NativeWind v4 for styling
- Hand-rolled `react-native-svg` charts (no victory-native)
- Local notifications via `expo-notifications` for background rest timer
- `expo-file-system` + `expo-sharing` + `expo-document-picker` for JSON/CSV export and body-weight CSV import

## Features (shipped)

| Area | Included |
|---|---|
| Program | Full 12-week × 4-day × 27-exercise Min-Max 4x hardcoded with phase-specific set configs |
| Active workout | Set rows, ghost values from last session, warmup sets, extra sets, per-set notes, exercise substitution, floating rest timer with background notification, RPE bottom-sheet selector |
| Progression | Top-of-range → increment; missed reps → revert + rep bump; deload-week freeze |
| PRs | Weight / reps / volume / estimated-1RM detection, gold-flash surface in workout summary |
| History | List + calendar toggle, day-type filter, drill-down detail with retroactive set edit, two-stage workout delete |
| Progress | Exercise picker, weight-over-time chart, e1RM trend, 12-week stacked volume by muscle group, "this week" muscle breakdown, PR board |
| Body | Weight / SMM / waist logging, 30/60/90-day chart with 7-day moving average + 72 kg goal line, entry list with delete |
| Settings | Program start date, kg/lb toggle, rest-timer prefs, plate config, reset program (double-confirm), visual plate calculator |
| Data | Export all as JSON, export workouts as CSV, import body-weight CSV — all via native share sheet / document picker |

## Explicitly dropped from the original spec

- **Haptic feedback** — all haptics (set completion, PR, timer) are replaced with visual-only cues
- **Body-fat % tracking** — `body_metrics` schema has no `body_fat` column; Body tab UI has no bf% input

## Run locally

```bash
git clone https://github.com/Raafet57/MIN_MAX.git
cd MIN_MAX
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code in the terminal with your iPhone Camera app (iOS) or the Expo Go app (Android). Install **Expo Go** from the App Store / Play Store first.

First time: open **Settings → Program Start Date** and set it before hitting "Start Workout".

## Deploy to TestFlight (via Replit)

Replit's Mobile Apps product wraps Expo + EAS Build and has a guided TestFlight flow:

1. On replit.com → Create App → Import from GitHub → paste this repo URL
2. Replit detects the Expo project and wires up the mobile workflow
3. Follow the 3-step Publish → Submit to TestFlight → Promote flow in Replit's UI
4. Sign in to your Apple Developer account ($99/yr — still required by Apple) when prompted; Replit/EAS handles certs and provisioning
5. First build has to pass Apple beta review (hours to ~1 day); later builds are fast

Alternative direct path without Replit: `npx eas-cli build --platform ios --profile preview && npx eas-cli submit --platform ios --latest`.

**Gotcha:** features working in Expo Go don't guarantee they'll work in the signed TestFlight build. Do a real device smoke test on the first build before inviting anyone.

## Project layout

```
app/               Expo Router screens (tabs + workout session + workout detail)
components/
  workout/         SetRow, ExerciseCard, RestTimer, RPESelector, WeightInput, WorkoutSummary, etc.
  shared/          WeekBadge, PhaseBanner, StatCard, EmptyState, MuscleGroupTag, PlateCalc
  progress/        ExerciseChart, OneRMChart, VolumeChart, BodyChart, PRBoard (hand-rolled SVG)
data/              program.ts (hardcoded 12-week program), exercises, muscleGroups, phases
db/                schema.ts, migrations.ts, queries.ts — all SQL lives here
stores/            Zustand: workoutStore (active session), settingsStore, uiStore
utils/             progression, weekPhase, oneRM (Epley), volumeCalc, plateCalc, formatters, rpe, export, fileIo
types/             shared TypeScript types
constants/         colors, layout tokens, config
```

## Design docs

The three specs we built against live in the repo root:

- **`CLAUDE.md`** — the full product brief, data model, screen specs, progression logic
- **`REQUIREMENTS.md`** — functional + non-functional requirements with acceptance criteria
- **`DESIGN.md`** — visual design system: color, typography, spacing, component specs

Treat these as reference material; the actual behavior lives in the code.

## Key decisions

- **Offline-first.** SQLite only. No backend, no auth, no cloud. One phone, one user.
- **Hardcoded program.** No exercise library, no program editor. Min-Max 4x lives in `data/program.ts`; change the code to change the program.
- **kg internally.** All weights stored in kg; conversion happens at the display layer. 1 kg = 2.20462 lb.
- **Week cycling, not calendar weekdays.** Days cycle Full Body → Upper → Lower → Arms/Delts → Full Body regardless of what day of the week you train.
- **Crash recovery.** Every set completion writes straight to SQLite. Force-quit mid-workout; on relaunch the session restores.

## License

Private project, no license granted.

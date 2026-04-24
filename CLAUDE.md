# CLAUDE.md — MinMax Tracker

## Project Overview

A personal workout tracker app built for a single program: the Min-Max 4x split (Full Body / Upper / Lower / Arms+Delts, 12-week periodized block). This is NOT a general-purpose workout app. It is purpose-built for one user, one program, with hardcoded structure and smart auto-progression.

Design philosophy: inspired by Hevy's speed and social polish, Strong's minimalist logging, SetGraph's clean interface, and Liftosaur's programmable progression. The app should feel like a premium tool that gets out of your way — tap, log, move on. Every screen should be usable one-handed in a gym with sweaty fingers.

## Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Local Storage:** SQLite via expo-sqlite (offline-first, no cloud dependency)
- **State Management:** Zustand
- **Navigation:** Expo Router (file-based)
- **Styling:** NativeWind (Tailwind for RN)
- **Charts:** victory-native for progress graphs
- **Haptics:** expo-haptics (set completion, PR, timer done)
- **Notifications:** expo-notifications (rest timer background alerts)
- **Icons:** lucide-react-native
- **Date Handling:** date-fns

## Project Structure

```
minmax-tracker/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx             # Dashboard / today's workout
│   │   ├── history.tsx           # Past workouts log
│   │   ├── progress.tsx          # Charts, PRs, analytics
│   │   ├── body.tsx              # Body metrics tracking
│   │   └── settings.tsx          # Preferences
│   ├── workout/
│   │   └── [dayId].tsx           # Active workout session
│   ├── exercise/
│   │   └── [exerciseId].tsx      # Exercise detail + history
│   └── _layout.tsx
├── components/
│   ├── workout/
│   │   ├── SetRow.tsx            # Individual set logging row
│   │   ├── ExerciseCard.tsx      # Exercise block with all sets
│   │   ├── RestTimer.tsx         # Floating countdown timer
│   │   ├── RPESelector.tsx       # Visual RPE picker (7-10)
│   │   ├── WeightInput.tsx       # Numeric weight entry with +/- buttons
│   │   ├── RepInput.tsx          # Numeric rep entry
│   │   ├── SetTypeBadge.tsx      # Normal / Partial / Dropset / Myorep label
│   │   ├── GhostValues.tsx       # Previous session overlay
│   │   ├── WarmupSets.tsx        # Optional warm-up set display
│   │   └── WorkoutSummary.tsx    # Post-workout recap modal
│   ├── progress/
│   │   ├── ExerciseChart.tsx     # Per-exercise line chart
│   │   ├── VolumeChart.tsx       # Weekly volume by muscle group
│   │   ├── PRBoard.tsx           # Personal records list
│   │   ├── BodyChart.tsx         # Body weight / bf% over time
│   │   └── OneRMChart.tsx        # Estimated 1RM trend
│   ├── shared/
│   │   ├── WeekBadge.tsx         # Week number + phase indicator
│   │   ├── PhaseBanner.tsx       # Current phase context bar
│   │   ├── StatCard.tsx          # Reusable metric card
│   │   ├── SwipeableRow.tsx      # Swipe to delete/edit
│   │   └── EmptyState.tsx        # Placeholder for no-data screens
│   └── icons/
│       └── MuscleGroupIcon.tsx   # SVG muscle group indicators
├── data/
│   ├── program.ts                # Complete Min-Max 4x program (all 12 weeks)
│   ├── exercises.ts              # Exercise metadata (name, video, notes, subs, muscles)
│   ├── muscleGroups.ts           # Muscle group definitions + exercise mappings
│   └── phases.ts                 # Week-to-phase mapping and phase configs
├── db/
│   ├── schema.ts                 # SQLite table definitions
│   ├── migrations.ts             # Schema versioning
│   └── queries.ts                # All read/write helpers (NEVER raw SQL in components)
├── stores/
│   ├── workoutStore.ts           # Active session state (sets, timer, notes)
│   ├── settingsStore.ts          # User preferences (units, start date, timer defaults)
│   └── uiStore.ts                # UI state (selected exercise, active tab)
├── utils/
│   ├── progression.ts            # Auto-progression engine
│   ├── weekPhase.ts              # Calculate current week + phase from start date
│   ├── oneRM.ts                  # Estimated 1RM calculations (Epley, Brzycki)
│   ├── volumeCalc.ts             # Weekly volume per muscle group
│   ├── plateCalc.ts              # Plate loading calculator
│   ├── formatters.ts             # Weight display, duration, dates
│   ├── rpe.ts                    # RPE helpers, descriptions, color mapping
│   └── export.ts                 # JSON/CSV export
├── types/
│   └── index.ts                  # All shared TypeScript types
├── constants/
│   ├── colors.ts                 # Theme palette
│   ├── layout.ts                 # Spacing, sizing tokens
│   └── config.ts                 # App-wide defaults
└── assets/
    ├── fonts/
    └── images/
```

## Complete Program Data Model

The Min-Max 4x program has this structure:

```
Program: Min-Max 4x (12 Weeks)
├── Phase 1: Intro (Week 1) — lower RPE on compounds, establish baselines
├── Phase 2: Base (Weeks 2-6) — RPE @9-10, progressive overload each session
├── Phase 3: Deload (Week 7) — same weights, RPE drops to Week 1 levels, no progression
├── Phase 4: Intensification (Weeks 8-12) — adds lengthened partials, drop sets, myo-reps
│
└── 4 Training Days (cycle in order, not tied to weekdays)
    ├── Day 1: Full Body    (6 exercises, ~10 working sets, ~32 min)
    ├── Day 2: Upper        (7 exercises, ~12 working sets, ~37 min)
    ├── Day 3: Lower        (5 exercises, ~9 working sets, ~26 min)
    └── Day 4: Arms/Delts   (9 exercises, ~16 working sets, ~41 min)
```

### Core Types

```typescript
// --- Program Definition ---

interface Program {
  id: string;
  name: string;
  totalWeeks: number;
  phases: Phase[];
  days: ProgramDay[];
}

interface Phase {
  id: 'intro' | 'base' | 'deload' | 'intensification';
  name: string;
  weekRange: [number, number];    // e.g. [2, 6] for base
  color: string;                   // phase badge color
  progressionEnabled: boolean;     // false for deload
  description: string;
}

interface ProgramDay {
  id: string;                      // 'full-body', 'upper', 'lower', 'arms-delts'
  name: string;
  exercises: ProgramExercise[];
  estimatedMinutes: number;
}

interface ProgramExercise {
  id: string;                      // stable slug: 'lying-leg-curl'
  name: string;                    // display name: 'Lying Leg Curl'
  originalName: string;            // from program source: 'Lying Leg Curl'
  substitutes: string[];           // e.g. ['Seated Leg Curl', 'Nordic Ham Curl']
  videoUrl: string;                // YouTube link
  note: string;                    // Technique cue (full text)
  targetMuscles: MuscleGroup[];    // primary muscles hit
  restSeconds: number;             // 60, 120, or 180
  incrementKg: number;             // 2.5 for compounds, 1.0 for isolation
  weekConfigs: WeekConfig[];       // different set schemes per phase
  trackingPrefix?: string;         // 'A' or 'B' for separate progression tracks
}

interface WeekConfig {
  weekRange: [number, number];     // which weeks this config applies
  sets: SetDefinition[];
}

interface SetDefinition {
  reps: [number, number];          // [6, 8] = 6-8 rep range
  rpe: number;                     // 7, 8, 9, or 10
  type: 'normal' | 'partial' | 'dropset' | 'myorep';
  label?: string;                  // 'Full ROM', 'Partial', 'Dropset'
  restOverrideSeconds?: number;    // myo-reps use 5s rest
}

// --- Workout Logging ---

interface Workout {
  id: string;
  dayId: string;                   // which program day
  dayName: string;
  weekNumber: number;
  phase: Phase['id'];
  startedAt: string;               // ISO 8601
  completedAt?: string;
  durationSeconds?: number;
  totalSets: number;
  completedSets: number;
  totalVolume: number;             // kg × reps summed
  notes?: string;                  // free-text session notes
  feeling?: 1 | 2 | 3 | 4 | 5;   // session RPE / energy rating
}

interface LoggedSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;                // 0-based within the exercise
  // Targets (from program)
  targetRepsLow: number;
  targetRepsHigh: number;
  targetRpe: number;
  setType: 'normal' | 'partial' | 'dropset' | 'myorep' | 'warmup';
  // Logged values
  weight: number;                  // kg (always stored in kg)
  completedReps: number;
  actualRpe?: number;              // optional RPE override
  completed: boolean;
  skipped: boolean;                // user explicitly skipped
  // Metadata
  timestamp: string;
  notes?: string;                  // per-set notes (e.g. "grip failed", "left shoulder tight")
  exerciseSubstitution?: string;   // if user swapped exercise, log what they actually did
}

// --- Exercise State (progression tracking) ---

interface ExerciseState {
  exerciseId: string;
  currentWeight: number;           // kg — next session's target
  lastSuccessfulWeight: number;    // fallback on missed reps
  currentRepsLow: number;
  currentRepsHigh: number;
  increment: number;               // kg per progression step
  totalSessions: number;           // how many times this exercise has been logged
  lastPerformedAt?: string;
}

// --- Personal Records ---

interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: 'weight' | 'reps' | 'volume' | 'estimated1rm';
  value: number;
  weight?: number;                 // the weight used (for rep PRs)
  reps?: number;                   // the reps done (for weight PRs)
  achievedAt: string;
  workoutId: string;
}

// --- Body Metrics ---

interface BodyMetric {
  id: string;
  date: string;                    // ISO date (one entry per day max)
  weight?: number;                 // kg
  bodyFat?: number;                // percentage
  skeletalMuscleMass?: number;     // kg
  waist?: number;                  // cm
  notes?: string;
}

// --- Muscle Groups ---

type MuscleGroup =
  | 'shoulders' | 'chest' | 'back' | 'biceps' | 'triceps'
  | 'forearms' | 'quadriceps' | 'hamstrings' | 'glutes'
  | 'calves' | 'abs';
```

## Progression Logic (CRITICAL — must match Liftosaur)

```
ON WORKOUT COMPLETE:
  IF current phase is 'deload':
    → Skip all progression. No weight changes.
    → RETURN

  FOR EACH exercise in the session:
    previousState = getExerciseState(exercise.id)

    IF previousState.currentWeight == 0 (first time):
      → Store completed weight as baseline
      → Set lastSuccessfulWeight = completed weight
      → RETURN for this exercise

    allSetsHit = every working set completed >= target rep minimum
    topOfRange = every working set completed >= target rep maximum

    IF topOfRange:
      → newWeight = currentWeight + exercise.increment
      → Update lastSuccessfulWeight = currentWeight
      → Update currentWeight = newWeight
      → Check for PR (weight PR if newWeight > any previous)

    ELSE IF allSetsHit BUT NOT topOfRange:
      → Keep weight the same. Try to get more reps next session.

    ELSE IF any set below minimum reps AND lastSuccessfulWeight exists:
      → Revert currentWeight to lastSuccessfulWeight
      → Add 2 to both repsLow and repsHigh (rep progression fallback)

    ELSE:
      → Keep everything the same. Retry next session.

  AFTER all exercises processed:
    → Check all sets for new PRs (weight, reps, estimated 1RM, volume)
    → Show workout summary with progression changes + any PRs
```

**Increment defaults:**
- Squat, Incline Bench, RDL, Hip Thrust, Leg Press, T-Bar Row, Chest Press: **2.5 kg**
- Lat Pulldown, Seated Row, Wide Pull-Up, Shrug: **2.5 kg**
- All isolation (curls, raises, flyes, extensions, calves, abs): **1.0 kg**

**Estimated 1RM formula (Epley):**
```
e1RM = weight × (1 + reps / 30)
```

## Database Schema

```sql
-- Core workout log
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  day_name TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  phase TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER,
  total_sets INTEGER DEFAULT 0,
  completed_sets INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  notes TEXT,
  feeling INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Every set logged (working + warmup + skipped)
CREATE TABLE logged_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  target_reps_low INTEGER NOT NULL,
  target_reps_high INTEGER NOT NULL,
  target_rpe REAL NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight REAL,
  completed_reps INTEGER,
  actual_rpe REAL,
  completed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  notes TEXT,
  exercise_substitution TEXT,
  timestamp TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_logged_sets_workout ON logged_sets(workout_id);
CREATE INDEX idx_logged_sets_exercise ON logged_sets(exercise_id);
CREATE INDEX idx_logged_sets_timestamp ON logged_sets(timestamp);

-- Per-exercise progression state
CREATE TABLE exercise_state (
  exercise_id TEXT PRIMARY KEY,
  current_weight REAL DEFAULT 0,
  last_successful_weight REAL DEFAULT 0,
  current_reps_low INTEGER,
  current_reps_high INTEGER,
  increment REAL DEFAULT 2.5,
  total_sessions INTEGER DEFAULT 0,
  last_performed_at TEXT
);

-- Personal records (multiple types per exercise)
CREATE TABLE personal_records (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  pr_type TEXT NOT NULL,
  value REAL NOT NULL,
  weight REAL,
  reps INTEGER,
  estimated_1rm REAL,
  achieved_at TEXT NOT NULL,
  workout_id TEXT REFERENCES workouts(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_prs_exercise ON personal_records(exercise_id);

-- Body metrics (one row per date)
CREATE TABLE body_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  weight REAL,
  body_fat REAL,
  skeletal_muscle_mass REAL,
  waist REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_body_metrics_date ON body_metrics(date);

-- Warm-up sets (optional, separate from working sets)
CREATE TABLE warmup_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  weight REAL,
  reps INTEGER,
  timestamp TEXT
);

-- App settings (key-value store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Default settings inserted on first launch:
-- program_start_date: ISO date
-- weight_unit: 'kg' | 'lb'
-- rest_timer_vibrate: '1'
-- rest_timer_sound: '1'
-- show_warmup_sets: '1'
-- show_exercise_notes: '1'
-- plate_set: '1.25,2.5,5,10,15,20' (kg, Olympic standard)
```

## Screen Specifications

### 1. Dashboard (Home Tab)

**Layout:** Single scrollable screen.

**Top section:**
- Current week number (large) + phase badge with color
- Phase name and description (e.g. "Week 3 — Base Phase: Progressive overload, RPE @9-10")
- Progress bar showing week 3/12

**Next workout card:**
- Shows next day in cycle (e.g. "Upper" if last completed was "Full Body")
- Exercise list preview (names only, condensed)
- Estimated duration
- Large "START WORKOUT" button (primary color, full width)

**This week stats row:**
- Sessions completed / planned (e.g. "2/4")
- Total volume this week (kg)
- Total sets this week

**Recent activity:**
- Last 3 completed workouts as compact cards
- Each shows: day name, date, duration, total volume, feeling emoji
- Tap to open full workout detail

**Body weight sparkline:**
- Small inline chart showing last 14 days of body weight
- Current weight displayed large
- Tap to open Body tab

---

### 2. Active Workout Screen

**Header (fixed):**
- Day name + week/phase badge
- Elapsed timer (running from session start)
- "Finish" button (top right)

**Exercise cards (scrollable, stacked vertically):**

Each exercise card contains:
- **Exercise name** (bold, large)
- **Muscle group tags** (small colored pills)
- **Info row:** tap to expand → shows technique note, video link (tap opens YouTube), substitute exercises
- **Set rows** (the core logging interface):

```
┌─────────────────────────────────────────────────────┐
│  SET  │  PREVIOUS   │  KG    │  REPS  │ RPE  │  ✓  │
├───────┼─────────────┼────────┼────────┼──────┼─────┤
│  1    │  40 × 7 @9  │ [40.0] │ [  7]  │ [@9] │ [ ] │
│  2    │  40 × 6 @10 │ [40.0] │ [  6]  │ [@10]│ [ ] │
│  + Add warmup set                                    │
│  + Add extra working set                             │
│  📝 Add note for this exercise                       │
│  🔄 Log substitution (did a different exercise)      │
└─────────────────────────────────────────────────────┘
```

- **PREVIOUS column** = ghost values from last session (grey text). Shows weight × reps @RPE for each set. If no previous data, shows target: "6-8 @9".
- **KG column** = numeric input. Pre-filled with current exercise state weight. Tap to edit with numeric keypad. +/- stepper buttons for 1.0 or 2.5 kg increments.
- **REPS column** = numeric input. Tap to edit. Large touch target.
- **RPE column** = tap to open RPE selector (visual scale 7-10 with descriptions and colors). Optional — if user doesn't tap, defaults to target RPE.
- **Checkmark** = tap to complete set. Triggers: haptic feedback, rest timer auto-start, row highlights green, next set row activates.
- **Set type badge** = shows if set is (Partial), (Dropset), (Myorep) — auto-tagged from program definition.

**Per-set notes:** Each set row has a tiny note icon. Tap to add free-text note for that specific set (e.g. "grip gave out", "felt easy", "left shoulder pain"). Stored in `logged_sets.notes`.

**Exercise substitution:** If user swaps an exercise (e.g. does Seated Leg Curl instead of Lying Leg Curl), they tap "Log substitution" and type or select what they actually did. Stored in `logged_sets.exercise_substitution`. Progression still tracks against the original exercise.

**Warmup sets:** Expandable section above working sets. User can add warmup sets (weight + reps only, no RPE). Not counted in volume or progression.

**Floating rest timer (bottom overlay):**
- Auto-starts when a set is checked off
- Shows countdown (large numbers), exercise-specific duration (60/120/180s)
- Progress ring animation
- Tap to pause/resume
- +30s / -30s adjust buttons
- Skip button
- When timer hits 0: haptic burst + optional sound + visual pulse
- Timer persists across scroll — always visible at bottom of screen
- Shows "REST 1:42" in collapsed state, expandable to full controls

**Finish workout flow:**
1. Tap "Finish" → confirmation dialog ("End workout? X sets incomplete" if any unchecked)
2. Run progression logic for all exercises
3. Show WorkoutSummary modal:
   - Duration
   - Sets completed / total
   - Total volume (kg × reps)
   - Session feeling selector (1-5 emoji scale: 😴 😐 🙂 💪 🔥)
   - Session notes text input
   - Progression changes: list of exercises with "40 kg → 42.5 kg ⬆️" or "Reps: 6-8 → 8-10 (weight reverted to 37.5 kg)"
   - New PRs with 🏆 celebration
   - "Save & Close" button

---

### 3. History Tab

**Filter bar:** All / Full Body / Upper / Lower / Arms+Delts

**Workout list (reverse chronological):**

Each workout card:
```
┌─────────────────────────────────────────┐
│  UPPER              Week 3 • Base       │
│  Mon, Apr 14 2026         37 min        │
│  12 sets • 3,240 kg volume      💪      │
└─────────────────────────────────────────┘
```

**Tap to expand** → full workout detail:
- Every exercise with every logged set (weight × reps @RPE)
- Set notes shown inline (italic, grey)
- Exercise substitutions flagged
- Warmup sets shown (dimmed)
- Session notes at bottom
- Option to edit any value retroactively (tap a set to modify)
- Delete workout option (with confirmation)

**Calendar view toggle:** Switch between list view and calendar grid. Calendar shows dots on training days, colored by day type.

---

### 4. Progress Tab

**Exercise picker:** Dropdown at top. Lists all program exercises. Selecting one shows:

**Weight over time chart (line):**
- X axis: date
- Y axis: weight (kg or lb)
- Each point = weight used in most recent working set for that session
- Tap a point to see full set data for that day

**Estimated 1RM over time chart (line):**
- Calculated via Epley from best set each session
- Shows trend line

**Rep performance chart (bar):**
- Shows reps achieved per set across sessions
- Color coded by RPE

**PR history for selected exercise:**
- Weight PR: heaviest weight × reps completed
- Rep PR: most reps at a given weight
- Volume PR: highest single-session volume for this exercise
- 1RM PR: highest estimated 1RM

**Weekly volume chart (stacked bar):**
- X axis: weeks 1-12
- Y axis: total sets
- Stacked by muscle group
- Color coded per muscle group
- Shows recommended range bands

**Muscle group breakdown (current week):**
```
Shoulders:   12 sets  ████████████  ✓ in range
Back:        13 sets  █████████████ ✓ in range
Chest:        9 sets  █████████    ✓ in range
Quads:        7 sets  ███████      ✓ in range
Hamstrings:   5 sets  █████        ⚠ low end
...
```

**All-time PR board:**
- List every exercise with current PR (weight, reps, e1RM)
- Sort by most recent PR date
- Tap to see full PR history for that exercise

---

### 5. Body Tab

**Input card (top):**
- Date picker (defaults to today)
- Weight input (kg, one decimal)
- Body fat % input (optional)
- Skeletal muscle mass input (optional, kg)
- Waist measurement input (optional, cm)
- Notes field
- Save button

**Weight chart (line):**
- Last 30/60/90 days toggle
- Shows daily weight with 7-day moving average overlay
- Goal weight line (72 kg) shown as dashed horizontal

**Body composition chart (dual axis or stacked):**
- Body fat % and SMM over time
- If data exists

**Stats summary:**
- Starting weight → current weight → goal weight
- Total change
- Average weekly loss/gain
- Days tracked

---

### 6. Settings Tab

- **Program start date** — date picker. Used to calculate current week.
- **Weight unit** — kg / lb toggle. Default kg.
- **Rest timer defaults** — per category: compounds 180s, moderate 120s, isolation 60s. User can override.
- **Rest timer vibrate** — on/off
- **Rest timer sound** — on/off
- **Show warmup sets** — on/off
- **Show exercise notes by default** — expanded/collapsed
- **Plate calculator config** — available plate sizes (default: 1.25, 2.5, 5, 10, 15, 20 kg)
- **Bar weight** — default 20 kg
- **Export data** — JSON dump of all tables
- **Export CSV** — workout history as spreadsheet-friendly CSV
- **Import body weight** — manual CSV import (date, weight columns)
- **Reset program** — clears all data, re-initializes (double confirmation required)
- **About** — version, build info

---

## UX Principles

1. **One-handed operation.** Everything reachable with thumb. No modals requiring precise taps. Large touch targets (minimum 44pt).
2. **Speed-first logging.** Pre-fill weight from exercise state. Tap reps, check set, rest timer starts. Three taps per set maximum.
3. **Previous session as context.** Ghost values (last session's weight × reps) shown on every set row. No need to navigate away to remember what you did last time.
4. **Dark theme only.** Gym lighting demands it. High contrast text. OLED-friendly pure blacks.
5. **Haptic language.** Medium impact on set completion. Heavy impact + success pattern on PR. Light tap on timer start. Notification buzz on timer done.
6. **Rest timer is sacred.** Always visible. Auto-starts. Never gets lost behind navigation. Survives screen rotation and app backgrounding.
7. **Data density where it matters.** Active workout screen shows maximum info per pixel. Dashboard and progress screens can breathe more.
8. **Never lose data.** Auto-save every set completion to SQLite. Crash recovery: if app restarts mid-workout, restore from last saved state.
9. **Phase awareness everywhere.** Current week + phase shown on dashboard, active workout header, and history cards. User always knows where they are in the 12-week block.
10. **Celebrate PRs, don't spam.** Subtle gold flash + haptic on PR. Show in workout summary. Don't interrupt the session with fullscreen modals.

## Color Palette (Dark Theme)

```
Background:           #0A0A0A
Surface:              #141414
Surface Elevated:     #1E1E1E
Card:                 #1A1A1A
Border:               #2A2A2A

Primary:              #E94560   (CTAs, active states, PRs, primary actions)
Primary Muted:        #E9456033 (backgrounds for primary elements)

Secondary:            #4ECDC4   (rest timer, secondary actions)
Secondary Muted:      #4ECDC433

Text Primary:         #F5F5F5
Text Secondary:       #999999
Text Tertiary:        #555555
Ghost/Previous:       #3A3A3A

Success:              #4ADE80   (completed sets, positive changes)
Warning:              #FBBF24   (deload phase, caution)
Error:                #EF4444   (missed sets, destructive actions)
PR Gold:              #FFD700   (personal records)

Phase Colors:
  Intro:              #4ECDC4
  Base:               #E94560
  Deload:             #FBBF24
  Intensification:    #A855F7

RPE Colors:
  @7:                 #4ECDC4   (easy — teal)
  @8:                 #FBBF24   (moderate — amber)
  @9:                 #F97316   (hard — orange)
  @10:                #E94560   (failure — red)

Muscle Group Colors:
  Shoulders:          #E94560
  Back:               #4ECDC4
  Chest:              #F97316
  Quadriceps:         #3B82F6
  Hamstrings:         #8B5CF6
  Glutes:             #EC4899
  Biceps:             #10B981
  Triceps:            #6366F1
  Calves:             #14B8A6
  Forearms:           #F59E0B
  Abs:                #64748B

Session Feeling:
  1 😴:               #EF4444
  2 😐:               #F97316
  3 🙂:               #FBBF24
  4 💪:               #4ADE80
  5 🔥:               #E94560
```

## Development Phases

### Phase 1: Core MVP (Build First)
- [ ] Expo project setup with TypeScript, NativeWind, Expo Router
- [ ] SQLite database setup with full schema + migrations
- [ ] Hardcoded program data: all 12 weeks, 4 days, all exercises with metadata
- [ ] Settings screen with program start date and weight unit
- [ ] Dashboard with next workout detection (day cycling logic)
- [ ] Active workout screen: exercise cards, set rows, weight/rep input
- [ ] Previous session ghost values pre-filled on each set row
- [ ] Set completion with checkmark (marks set, stores to DB)
- [ ] Rest timer: auto-start on set complete, floating overlay, countdown, haptic on done
- [ ] Progression logic: runs on workout finish, updates exercise_state table
- [ ] Workout summary modal: duration, volume, progression changes
- [ ] Basic workout history list (reverse chronological)

### Phase 2: Full Tracking
- [ ] Per-set notes (free text on any set)
- [ ] Per-session notes + feeling rating (1-5)
- [ ] Exercise substitution logging
- [ ] Warmup set logging (separate from working sets)
- [ ] RPE selector component (visual, color-coded, tap to select)
- [ ] Workout detail view in history (tap to see all sets)
- [ ] Edit logged sets retroactively
- [ ] Delete workout with confirmation
- [ ] Body metrics tab: weight, bf%, SMM, waist input and storage
- [ ] Auto-save mid-workout (crash recovery)

### Phase 3: Analytics & Progress
- [ ] Per-exercise weight-over-time chart
- [ ] Estimated 1RM trend chart (Epley)
- [ ] PR detection on workout complete (weight, reps, volume, e1RM)
- [ ] PR celebration: haptic + gold flash + workout summary callout
- [ ] PR board: all exercises with current records
- [ ] Weekly volume chart by muscle group (stacked bar)
- [ ] Muscle group breakdown with recommended range indicators
- [ ] Body weight chart with 7-day moving average + goal line
- [ ] Body composition chart (bf% + SMM over time)
- [ ] Calendar view in history tab

### Phase 4: Polish & Extras
- [ ] Weight +/- stepper buttons on set rows (1.0 kg and 2.5 kg increments)
- [ ] Plate calculator: input target weight → shows plates per side
- [ ] Haptic feedback: medium on set complete, heavy on PR, light on timer
- [ ] Exercise detail screen: full history, all PRs, charts for that exercise
- [ ] Export to JSON (full database dump)
- [ ] Export to CSV (workout history, body metrics)
- [ ] Import body weight from CSV
- [ ] Workout duration tracking (auto from start to finish)
- [ ] Phase transition notifications ("Week 7: Deload week starts")
- [ ] Program completion screen at end of Week 12
- [ ] Swipe-to-skip on set rows

### Phase 5: Future (Post-Launch)
- [ ] Garmin Connect sync for daily body weight
- [ ] Apple Health / Google Health Connect integration
- [ ] Workout reminders (local notifications)
- [ ] Superset/circuit mode (alternating exercises, shared timer)
- [ ] Dark/light theme toggle
- [ ] Widget: next workout + current streak

## Key Decisions

- **Offline-first.** SQLite only. No backend, no auth, no cloud. One phone, one user.
- **No exercise library.** Only the exercises in the Min-Max 4x program exist. No search, no browse.
- **No program editor.** Program is hardcoded in `data/program.ts`. Change the code to change the program.
- **kg internally.** All weights stored in kg. Display converts to lb if user preference is lb. Conversion: 1 kg = 2.20462 lb.
- **Week calculation.** `currentWeek = Math.ceil((today - programStartDate) / 7)`. Capped at 12. If > 12, show "Program Complete" state with option to restart.
- **Day cycling.** App does NOT map days to weekdays. It cycles: Full Body → Upper → Lower → Arms/Delts → Full Body... The "next workout" is always the one after the last completed.
- **IDs.** Workout IDs = UUIDs. Exercise IDs = stable slugs. Set IDs = UUIDs. Body metric IDs = UUIDs.
- **No undo on set completion** (too fiddly in gym). User can tap the checkmark again to un-complete, or edit after workout.

## Conventions

- Functional components with hooks only (no class components)
- All database calls through `db/queries.ts` — never raw SQL in components or screens
- Zustand stores for runtime state; SQLite for persistence. Stores hydrate from DB on app launch.
- All weights stored in kg internally. `formatters.ts` handles display conversion.
- All dates stored as ISO 8601 strings. Use `date-fns` for manipulation.
- Use `expo-haptics` ImpactFeedbackStyle: `Medium` for set completion, `Heavy` for PR, `Light` for timer events
- Rest timer state lives in `workoutStore` Zustand store — survives screen navigation
- No `console.log` in committed code. Use `__DEV__` flag for debug logging.
- Component files use PascalCase. Utility files use camelCase. Constants use camelCase.
- Every screen has an `EmptyState` component for when there's no data yet.

## Useful Queries Reference

```sql
-- Last workout for a given exercise (for ghost values)
SELECT ls.* FROM logged_sets ls
JOIN workouts w ON ls.workout_id = w.id
WHERE ls.exercise_id = ? AND ls.set_type != 'warmup' AND ls.completed = 1
ORDER BY w.started_at DESC
LIMIT 10;

-- Exercise progression history (for charts)
SELECT w.started_at, MAX(ls.weight) as max_weight, MAX(ls.completed_reps) as max_reps
FROM logged_sets ls
JOIN workouts w ON ls.workout_id = w.id
WHERE ls.exercise_id = ? AND ls.completed = 1 AND ls.set_type = 'normal'
GROUP BY w.id
ORDER BY w.started_at;

-- Weekly volume by muscle group
-- (requires joining against exercise metadata in app code)

-- Current PRs per exercise
SELECT exercise_id, pr_type, MAX(value) as best, achieved_at
FROM personal_records
GROUP BY exercise_id, pr_type;

-- Body weight trend (last 30 days)
SELECT date, weight FROM body_metrics
WHERE weight IS NOT NULL
ORDER BY date DESC LIMIT 30;
```

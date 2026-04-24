# REQUIREMENTS.md — MinMax Tracker

## 1. Product Summary

MinMax Tracker is a personal workout logging app for a single 12-week strength program (Min-Max 4x). It tracks every set, every rep, every weight, every session — and automatically handles progression, deloads, and intensification phase changes. The user opens the app, sees today's workout, taps Start, logs sets as they go, and the app tells them what weight to use next time.

No account creation. No subscription. No social features. No exercise library. One program, one user, zero friction.

---

## 2. Functional Requirements

### 2.1 Program Engine

| ID | Requirement |
|----|-------------|
| PE-01 | App ships with the complete Min-Max 4x program hardcoded: 12 weeks, 4 days, all exercises with metadata (name, original name, substitutes, video URL, technique note, target muscles, rest time, increment). |
| PE-02 | Program phases are determined by week number: Week 1 = Intro, Weeks 2-6 = Base, Week 7 = Deload, Weeks 8-12 = Intensification. |
| PE-03 | Each exercise has week-specific set configurations (different RPE targets in Week 1 vs Week 2+, additional partial/dropset/myorep sets in Weeks 8-12). |
| PE-04 | Day cycling: the app tracks which day was last completed and presents the next day in sequence (Full Body → Upper → Lower → Arms/Delts → Full Body...). Days are NOT tied to calendar weekdays. |
| PE-05 | Week number is calculated from a user-configured program start date: `currentWeek = ceil((today - startDate) / 7)`. Capped at 12. |
| PE-06 | When currentWeek > 12, app enters "Program Complete" state with summary stats and option to restart. |

### 2.2 Workout Logging

| ID | Requirement |
|----|-------------|
| WL-01 | User taps "Start Workout" to begin a session. App records start time and displays the active workout screen. |
| WL-02 | Active workout shows exercise cards stacked vertically, one per exercise, in program order. |
| WL-03 | Each exercise card displays: exercise name, muscle group tags, expandable technique note, video link, set rows. |
| WL-04 | Each working set row shows: set number, previous session values (ghost text), weight input, reps input, RPE selector, completion checkmark. |
| WL-05 | Weight input pre-fills with the current exercise state weight (from progression engine). User can override. |
| WL-06 | Weight input supports +/- stepper buttons in 1.0 kg and 2.5 kg increments, plus direct numeric entry via keypad. |
| WL-07 | Reps input is a numeric field with large touch target. Tap to enter via keypad. |
| WL-08 | RPE selector is optional per set. Tap opens a visual scale (7-10) with color coding and descriptions. Defaults to target RPE if not explicitly set. |
| WL-09 | Tapping the checkmark completes a set: marks it green, stores to database, triggers haptic feedback, auto-starts rest timer. |
| WL-10 | User can un-complete a set by tapping the checkmark again (toggle behavior). |
| WL-11 | Sets are tagged by type from program data: Normal, Partial, Dropset, Myorep. Displayed as a badge on the set row. |
| WL-12 | User can add free-text notes to any individual set (e.g. "grip failed on rep 7"). |
| WL-13 | User can add warmup sets above working sets for any exercise. Warmup sets log weight and reps only (no RPE, not counted in volume/progression). |
| WL-14 | User can add extra working sets beyond the programmed number for any exercise. |
| WL-15 | User can log an exercise substitution (e.g. "Did Seated Leg Curl instead of Lying Leg Curl"). Free text field stored alongside the set data. Progression still tracks against the original exercise ID. |
| WL-16 | User can skip a set explicitly. Skipped sets are stored with a skipped flag and not counted in progression. |
| WL-17 | App auto-saves every set completion to SQLite immediately. If app crashes or closes mid-workout, session is recoverable on next launch. |
| WL-18 | Elapsed workout duration shown in the header, running from session start. |
| WL-19 | "Finish Workout" button requires confirmation. If incomplete sets exist, confirmation message indicates how many. |
| WL-20 | On finish: record completion time, calculate duration, calculate total volume (sum of weight × reps for all completed working sets), run progression logic, detect PRs, show workout summary. |

### 2.3 Workout Summary (Post-Session)

| ID | Requirement |
|----|-------------|
| WS-01 | Summary modal displays: session duration, sets completed/total, total volume (kg). |
| WS-02 | Session feeling selector: 5-point emoji scale (😴 😐 🙂 💪 🔥). Stored with workout record. |
| WS-03 | Session notes: free-text field for general session comments. Stored with workout record. |
| WS-04 | Progression changes: list each exercise with weight change arrows (e.g. "Squat: 80 kg → 82.5 kg ⬆️") or rep range changes on regression. |
| WS-05 | New PRs: highlighted with gold/trophy icon. Types: weight PR, rep PR, volume PR, estimated 1RM PR. |
| WS-06 | "Save & Close" button writes all data and returns to dashboard. |

### 2.4 Rest Timer

| ID | Requirement |
|----|-------------|
| RT-01 | Rest timer auto-starts when a set is marked complete. |
| RT-02 | Timer duration matches the exercise's configured rest time (60s, 120s, or 180s). |
| RT-03 | Timer displays as a floating overlay at the bottom of the screen, always visible regardless of scroll position. |
| RT-04 | Timer shows: countdown in large digits, circular progress animation, exercise name. |
| RT-05 | Controls: pause/resume, +30s, -30s, skip/dismiss. |
| RT-06 | When timer reaches 0: haptic burst, optional sound alert, visual pulse animation. |
| RT-07 | Timer continues running if user navigates between exercises (scroll) — it does NOT reset. |
| RT-08 | Timer survives app backgrounding (local notification fires at completion). |
| RT-09 | Collapsed state shows a compact bar: "REST 1:42" with tap to expand to full controls. |

### 2.5 Progression Engine

| ID | Requirement |
|----|-------------|
| PR-01 | Progression runs automatically on workout completion for every exercise in the session. |
| PR-02 | During Deload phase (Week 7), progression is completely disabled. No weight or rep changes. |
| PR-03 | First-time exercise: whatever weight the user completes becomes the baseline. No automatic change. |
| PR-04 | If user hits top of rep range on ALL working sets → increase weight by exercise-specific increment. |
| PR-05 | If user hits minimum reps on all sets but NOT top of range → weight stays the same, retry next session. |
| PR-06 | If user fails to hit minimum reps on any set AND a lastSuccessfulWeight exists → revert to lastSuccessfulWeight, add 2 to target rep range. |
| PR-07 | Default increments: 2.5 kg for compounds, 1.0 kg for isolation. Stored per exercise in exercise_state. |
| PR-08 | Exercise state (current_weight, last_successful_weight, current_reps) persists in SQLite and is loaded on workout start. |

### 2.6 Personal Records

| ID | Requirement |
|----|-------------|
| PRR-01 | PR detection runs on workout completion for every completed set. |
| PRR-02 | PR types tracked: highest weight at target reps, most reps at a given weight, highest single-session exercise volume, highest estimated 1RM (Epley formula). |
| PRR-03 | New PRs trigger haptic feedback (Heavy impact) + gold visual flash on the workout summary. |
| PRR-04 | PR board accessible in Progress tab: lists every exercise with current record per PR type + date achieved. |
| PRR-05 | PR history per exercise: full list of previous PRs with dates and workout links. |

### 2.7 Workout History

| ID | Requirement |
|----|-------------|
| WH-01 | History tab shows all completed workouts in reverse chronological order. |
| WH-02 | Filter by day type: All / Full Body / Upper / Lower / Arms+Delts. |
| WH-03 | Each workout card shows: day name, date, week/phase, duration, total sets, total volume, feeling emoji. |
| WH-04 | Tap a workout card to see full detail: every exercise, every set (weight × reps @RPE), set notes, exercise substitutions, warmup sets (dimmed), session notes. |
| WH-05 | User can edit any logged set value retroactively from the detail view. |
| WH-06 | User can delete a workout entirely (double confirmation required). |
| WH-07 | Calendar view toggle: shows training days as colored dots on a monthly calendar grid. |

### 2.8 Progress & Analytics

| ID | Requirement |
|----|-------------|
| PA-01 | Exercise picker dropdown listing all program exercises. Selecting one shows its analytics. |
| PA-02 | Weight-over-time line chart: plots working set weight per session over all logged sessions. |
| PA-03 | Estimated 1RM trend line chart: Epley-calculated from best set each session. |
| PA-04 | Weekly volume stacked bar chart: total sets per week, broken down by muscle group with color coding. |
| PA-05 | Muscle group breakdown for current week: horizontal bars showing sets per group with recommended range indicators. |
| PA-06 | PR board: sortable list of all exercises with current PR values across all types. |

### 2.9 Body Metrics

| ID | Requirement |
|----|-------------|
| BM-01 | Dedicated Body tab for tracking body measurements. |
| BM-02 | Input fields: date (default today), weight (kg, one decimal), body fat % (optional), skeletal muscle mass (optional, kg), waist circumference (optional, cm), notes. |
| BM-03 | One entry per day maximum. Editing same day overwrites previous entry. |
| BM-04 | Body weight line chart: 30/60/90 day toggles, with 7-day moving average overlay. |
| BM-05 | Goal weight horizontal dashed line at 72 kg on body weight chart. |
| BM-06 | Stats summary: starting weight, current weight, goal weight, total change, average weekly change. |
| BM-07 | Body composition chart: bf% and SMM trend lines if data exists. |

### 2.10 Settings

| ID | Requirement |
|----|-------------|
| ST-01 | Program start date: date picker. Used for week calculation. |
| ST-02 | Weight unit: kg/lb toggle. All display converts accordingly. Internal storage always kg. |
| ST-03 | Rest timer: vibrate on/off, sound on/off. |
| ST-04 | Default rest timer overrides per category (compounds, moderate, isolation). |
| ST-05 | Show warmup sets: on/off. |
| ST-06 | Show exercise notes by default: expanded/collapsed. |
| ST-07 | Plate calculator: configurable plate sizes (default: 1.25, 2.5, 5, 10, 15, 20 kg). Bar weight (default 20 kg). |
| ST-08 | Export data: full database dump as JSON file. |
| ST-09 | Export CSV: workout history as CSV for spreadsheet use. |
| ST-10 | Import body weight CSV (columns: date, weight). |
| ST-11 | Reset program: clears all data, re-initializes. Requires typing "RESET" to confirm. |

---

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-01 | **Offline-first.** App works entirely offline. All data in local SQLite. No network dependency. |
| NF-02 | **Performance.** Active workout screen must render within 100ms. Set logging (tap checkmark to database write) must complete within 50ms. |
| NF-03 | **Data integrity.** Every set completion writes immediately to SQLite. App crash mid-workout must be fully recoverable. |
| NF-04 | **One-handed use.** All primary actions reachable with thumb. Minimum touch target 44×44pt. |
| NF-05 | **Dark theme.** Single dark theme optimized for gym lighting and OLED screens. High contrast text. |
| NF-06 | **Platform.** iOS primary (Expo/React Native). Android support via Expo but not a launch priority. |
| NF-07 | **Storage.** Database should handle 12 weeks × 4 sessions × 16 sets per session × 4 values per set with no performance degradation. Estimated max ~3,000 set records. |
| NF-08 | **Accessibility.** Minimum font size 14pt on set rows. Dynamic Type support for labels. VoiceOver labels on all interactive elements. |
| NF-09 | **Battery.** Rest timer must not drain battery. Use expo-notifications for background timer completion rather than keeping app active. |

---

## 4. Exercise Data Reference

Complete exercise list with metadata. All exercises must be included in `data/exercises.ts`.

### Day 1: Full Body

| Exercise | OG Name | Substitutes | Video | Rest | Muscles | Increment |
|----------|---------|-------------|-------|------|---------|-----------|
| Lying Leg Curl | Lying Leg Curl | Seated Leg Curl, Nordic Ham Curl | youtu.be/y28L1m1PYUQ | 60s | Hamstrings | 2.5 kg |
| Squat | Squat (Your Choice) | Back Squat, Front Squat, Pendulum, Hack, Belt, Smith | youtu.be/v3N4tpPpmyQ | 180s | Quadriceps, Glutes | 2.5 kg |
| Incline Bench Press | Barbell Incline Press | Smith Incline, DB Incline Press | youtu.be/ad0NL7TH2-I | 180s | Chest, Shoulders, Triceps | 2.5 kg |
| Lateral Raise | Incline DB Y-Raise | Cable Y-Raise, Machine Lateral Raise | youtu.be/xaOQJjzNrd8 | 60s | Shoulders | 1.0 kg |
| Wide Pull Up | Pull-Up (Wide Grip) | Lat Pulldown Wide, 1-Arm Cable Pulldown | youtu.be/oB27u_w3pX4 | 120s | Back, Biceps | 2.5 kg |
| Standing Calf Raise (A) | Standing Calf Raise | Leg Press Calf, Donkey Calf Raise | youtu.be/WMkCGNwo5ts | 60s | Calves | 2.5 kg |

### Day 2: Upper

| Exercise | OG Name | Substitutes | Video | Rest | Muscles | Increment |
|----------|---------|-------------|-------|------|---------|-----------|
| Lat Pulldown | Close-Grip Lat Pulldown | Close-Grip Pull-Up, 1-Arm Cable Pulldown | youtu.be/7l859qd4E48 | 120s | Back, Biceps | 2.5 kg |
| T Bar Row | Chest-Supported T-Bar Row | Chest-Supported Machine Row, Chest-Supported DB Row | youtu.be/-FAxUZoPDc4 | 120s | Back, Shoulders | 2.5 kg |
| Shrug | Machine Shrug | Barbell Shrug, Cable Shrug-In | youtu.be/2KDc6iAcrAw | 60s | Back, Shoulders | 2.5 kg |
| Chest Press (Machine) | Machine Chest Press | Smith Bench, DB Bench | youtu.be/qTSTOVVr8rU | 180s | Chest, Triceps | 2.5 kg |
| Lateral Raise (Cable) | High-Cable Lateral Raise | DB Lateral Raise, Machine Lateral Raise | youtu.be/DX1WzS7k0Uc | 60s | Shoulders | 1.0 kg |
| Reverse Fly | 1-Arm Reverse Pec Deck | Lying Reverse DB Fly, Reverse Cable Crossover | youtu.be/WkI6IHmYORY | 60s | Shoulders, Back | 1.0 kg |
| Cable Crunch | Cable Crunch | Weighted Crunch, Machine Crunch | youtu.be/LvJM9V3D_CQ | 60s | Abs | 2.5 kg |

### Day 3: Lower

| Exercise | OG Name | Substitutes | Video | Rest | Muscles | Increment |
|----------|---------|-------------|-------|------|---------|-----------|
| Leg Extension | Leg Extension | Reverse Nordic, Sissy Squat | youtu.be/G0_M9LBCT0o | 60s | Quadriceps | 2.5 kg |
| Romanian Deadlift | Barbell RDL | DB RDL, Seated Cable Deadlift | youtu.be/xbnan2iNh-Q | 120s | Hamstrings, Glutes, Back | 2.5 kg |
| Hip Thrust | Machine Hip Thrust | Barbell Hip Thrust, 45° Hyperextension | youtu.be/ELgSmlwFsFQ | 120s | Glutes, Hamstrings | 2.5 kg |
| Leg Press | Leg Press | Smith Squat, Barbell Squat | youtu.be/ksBaBSfmZf4 | 120s | Quadriceps, Glutes | 5.0 kg |
| Standing Calf Raise (B) | Standing Calf Raise | Leg Press Calf, Donkey Calf Raise | youtu.be/WMkCGNwo5ts | 60s | Calves | 2.5 kg |

### Day 4: Arms/Delts

| Exercise | OG Name | Substitutes | Video | Rest | Muscles | Increment |
|----------|---------|-------------|-------|------|---------|-----------|
| Bicep Curl (Cable) | Bayesian Cable Curl | Incline DB Curl, Standing DB Curl | youtu.be/_w_Uan2dG-4 | 60s | Biceps | 1.0 kg |
| Triceps Extension (Cable) | Overhead Cable Triceps Extension | Overhead DB Extension, Skull Crusher | youtu.be/7GvY7yTEepM | 60s | Triceps | 1.0 kg |
| Hammer Curl (DB) | Modified Zottman Curl | DB Hammer Curl, Preacher Hammer Curl | youtu.be/J0l0qQCy80Q | 60s | Biceps, Forearms | 1.0 kg |
| Cable Kickback | Cable Triceps Kickback | Seated Dip Machine, Close-Grip Dip | youtu.be/FGJ64JyKod0 | 60s | Triceps | 1.0 kg |
| Wrist Curl (DB) | DB Wrist Curl | Cable Wrist Curl | youtu.be/HJx1sIZKDqk | 60s | Forearms | 1.0 kg |
| Reverse Wrist Curl | DB Wrist Extension | Cable Wrist Extension | youtu.be/uCAoI5FnLhs | 60s | Forearms | 1.0 kg |
| Bicep Curl (DB) | Alternating DB Curl | Barbell Curl, EZ-Bar Curl | youtu.be/kSxgX6HIYxQ | 60s | Biceps | 1.0 kg |
| Lateral Raise (Machine) | Machine Lateral Raise | High-Cable Lateral Raise, DB Lateral Raise | youtu.be/nc6pAci8Tpg | 60s | Shoulders | 1.0 kg |
| Dead Hang | Dead Hang | N/A | youtu.be/5M8uPbfQsbg | — | Back, Forearms | — (time-based) |

---

## 5. Set Configurations Per Phase

### Weeks 1 (Intro — lower RPE on compounds)

| Day | Exercise | Sets |
|-----|----------|------|
| Full Body | Lying Leg Curl | 1×6-8 @9, 1×6-8 @10 |
| Full Body | Squat | 1×6-8 @7, 1×6-8 @8 |
| Full Body | Incline Bench Press | 1×6-8 @8, 1×6-8 @9 |
| Full Body | Lateral Raise | 1×8-10 @10 |
| Full Body | Wide Pull Up | 1×6-8 @8, 1×6-8 @9 |
| Full Body | Standing Calf Raise (A) | 1×6-8 @10 |
| Upper | Lat Pulldown | 1×8-10 @8, 1×8-10 @9 |
| Upper | T Bar Row | 1×8-10 @8, 1×8-10 @9 |
| Upper | Shrug | 1×6-8 @9 |
| Upper | Chest Press (Machine) | 1×8-10 @8, 1×8-10 @9 |
| Upper | Lateral Raise (Cable) | 1×8-10 @9, 1×8-10 @10 |
| Upper | Reverse Fly | 1×8-10 @10 |
| Upper | Cable Crunch | 1×6-8 @9, 1×6-8 @10 |
| Lower | Leg Extension | 1×8-10 @9, 1×8-10 @10 |
| Lower | Romanian Deadlift | 1×6-8 @7, 1×6-8 @8 |
| Lower | Hip Thrust | 1×6-8 @8, 1×6-8 @9 |
| Lower | Leg Press | 1×6-8 @9 |
| Lower | Standing Calf Raise (B) | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Bicep Curl (Cable) | 1×6-8 @9, 1×6-8 @10 |
| Arms/Delts | Triceps Extension (Cable) | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Hammer Curl (DB) | 1×8-10 @10 |
| Arms/Delts | Cable Kickback | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Wrist Curl (DB) | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Reverse Wrist Curl | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Bicep Curl (DB) | 1×6-8 @10 |
| Arms/Delts | Lateral Raise (Machine) | 1×8-10 @9, 1×8-10 @10 |
| Arms/Delts | Dead Hang | 2×max |

### Weeks 2-6 (Base — RPE bumps to @9-10 across the board)

All exercises bump RPE to @9-10 on every set. Same exercises, same rep ranges, same rest. The only change is effort level.

### Week 7 (Deload — same structure as Week 1, progression disabled)

Identical set/rep/RPE config to Week 1. Progression engine is OFF. Weights stay at whatever they were end of Week 6.

### Weeks 8-12 (Intensification — adds advanced techniques)

Base phase structure PLUS these additions:

| Exercise | Addition |
|----------|----------|
| Lying Leg Curl | +1 set of lengthened partials to failure |
| Wide Pull Up | +1 set of lengthened partials to failure |
| Standing Calf Raise (A) | +1 set of lengthened partials to failure |
| Lat Pulldown | +1 set of lengthened partials to failure |
| T Bar Row | +2 drop sets (~25% weight reduction each) |
| Leg Extension | +1 set of lengthened partials to failure |
| Standing Calf Raise (B) | +1 set of lengthened partials to failure |
| Cable Kickback | +2 drop sets (~25% weight reduction each) |
| Bicep Curl (DB) | +2 drop sets (~25% weight reduction each) |
| Lateral Raise (Machine) | Myo-reps (5s rest between sets instead of 60s) |

---

## 6. Acceptance Criteria

### MVP Launch (Phase 1 + 2 complete)

- [ ] User can set program start date and see correct current week/phase
- [ ] User can start a workout and see all exercises with correct sets for current week
- [ ] User can log weight, reps, and RPE for every set
- [ ] Previous session values appear as ghost text on every set row
- [ ] Rest timer auto-starts on set completion with correct per-exercise duration
- [ ] Rest timer works as floating overlay, survives scrolling, has pause/skip/adjust controls
- [ ] On workout finish, progression runs correctly: weight increases when reps hit, reverts on failure, freezes on deload
- [ ] Workout summary shows duration, volume, progression changes, and PRs
- [ ] Session notes and feeling rating can be logged
- [ ] Per-set notes can be added
- [ ] Exercise substitutions can be logged
- [ ] History tab shows all past workouts with full set-by-set detail
- [ ] Body tab accepts and stores weight, bf%, SMM, waist measurements
- [ ] All data persists across app restarts (SQLite)
- [ ] Mid-workout crash recovery works (auto-save on every set completion)

### Full Launch (All phases)

- [ ] Progress charts render correctly for every exercise
- [ ] PR detection works for all four PR types
- [ ] Weekly volume chart accurately reflects logged data
- [ ] Body weight chart shows trend with moving average
- [ ] Plate calculator returns correct plate loading
- [ ] Export produces valid JSON and CSV files
- [ ] Haptic feedback fires on set completion, PR, and timer events
- [ ] Calendar view shows training day distribution

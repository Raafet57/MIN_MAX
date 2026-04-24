# DESIGN.md — MinMax Tracker

## Design Philosophy

MinMax Tracker is built dark-first. Not dark-as-afterthought — dark as the primary design surface. The gym is a low-light, high-focus environment. The screen should feel like an instrument panel: high contrast where it matters, receding into black where it doesn't. Every pixel either communicates data or gets out of the way.

**Design references:** Hevy (set logging speed + social polish), Strong (minimalist data density), SetGraph (clean typography), Linear (dark-first software design), Arc Browser (surface layering), Warp terminal (depth through subtle elevation).

**Anti-references:** Any fitness app with neon gradients, busy illustrations, gamification badges, motivational quotes, or a light theme that was clearly designed first.

---

## 1. Color System

### 1.1 Surface Hierarchy (4 levels — not optional)

Dark mode requires deliberate surface layering. A single shade of grey is not a dark mode. Each level communicates elevation and importance.

```
Level 0 — Background:       #0A0A0A   (true black, OLED power savings)
Level 1 — Surface:          #141414   (cards, list items, base containers)
Level 2 — Surface Elevated: #1E1E1E   (modals, floating elements, active cards)
Level 3 — Surface Overlay:  #282828   (dropdown menus, tooltips, popups)
```

**Usage rules:**
- Screen backgrounds are always Level 0
- Content cards sit on Level 1
- Modals, bottom sheets, and the rest timer overlay use Level 2
- Nested elements within cards (e.g. input fields inside an exercise card) use Level 2 against the Level 1 card
- Never place Level 1 content directly on Level 0 without a border or spacing — it will look like a rendering bug on OLED

### 1.2 Border & Dividers

```
Border Default:             #1F1F1F   (subtle card edges)
Border Active:              #333333   (focused inputs, selected states)
Border Accent:              #E94560   (primary-colored borders for emphasis)
Divider:                    #1A1A1A   (horizontal rules between list items)
Divider Strong:             #252525   (between major sections)
```

**Rules:**
- Use 1px borders, never thicker (except divider strong at 1px with more contrast)
- Card borders are optional — often elevation alone is enough
- Input fields always show a border (users need to know it's tappable)
- Active/focused inputs get `Border Active` + 1px primary glow via shadow

### 1.3 Text Colors

```
Text Primary:               #F5F5F5   (body text, labels, exercise names)
Text Secondary:             #999999   (supporting info, timestamps, metadata)
Text Tertiary:              #555555   (disabled states, placeholders)
Text Inverse:               #0A0A0A   (text on primary-colored buttons)
Ghost Values:               #3A3A3A   (previous session data behind inputs)
```

**Rules:**
- Never use pure white (#FFFFFF) for body text — it's too harsh on OLED. #F5F5F5 is the ceiling.
- Primary text must maintain 7:1 contrast ratio against Level 0 and Level 1 surfaces (WCAG AAA).
- Secondary text maintains 4.5:1 minimum.
- Ghost values must be legible but clearly subordinate — they sit behind active input values.

### 1.4 Accent Colors

```
Primary:                    #E94560   (CTAs, active states, primary actions, brand)
Primary Hover/Press:        #D63D56   (pressed state for primary buttons)
Primary Muted:              #E9456020 (backgrounds for primary-tinted elements)
Primary Glow:               0 0 12px #E9456040 (box-shadow for focused inputs)

Secondary:                  #4ECDC4   (rest timer, info badges, secondary actions)
Secondary Muted:            #4ECDC420
Secondary Glow:             0 0 12px #4ECDC440

Tertiary:                   #A855F7   (intensification phase, advanced features)
Tertiary Muted:             #A855F720
```

### 1.5 Semantic Colors

```
Success:                    #4ADE80   (completed sets, positive delta, weight up)
Success Muted:              #4ADE8020
Warning:                    #FBBF24   (deload phase, caution states, approaching failure)
Warning Muted:              #FBBF2420
Error:                      #EF4444   (missed targets, failed sets, destructive actions)
Error Muted:                #EF444420
PR Gold:                    #FFD700   (personal records, achievements)
PR Gold Glow:               0 0 20px #FFD70060
```

### 1.6 RPE Color Scale

These colors encode difficulty at a glance. Used on RPE badges, set row accents, and the RPE selector.

```
RPE 7:                      #4ECDC4   (teal — easy, 3 reps in reserve)
RPE 8:                      #FBBF24   (amber — moderate, 2 in reserve)
RPE 9:                      #F97316   (orange — hard, 1 in reserve)
RPE 10:                     #E94560   (red — failure, 0 in reserve)
```

**Application:** RPE badges use a filled pill with the RPE color at 20% opacity as background and full color for text. The RPE selector uses these colors for each option.

### 1.7 Phase Colors

Each 12-week phase has a distinct color for instant recognition in badges, headers, and charts.

```
Intro (Week 1):             #4ECDC4   (teal — calm, warming up)
Base (Weeks 2-6):           #E94560   (primary red — main work block)
Deload (Week 7):            #FBBF24   (amber — recovery, ease off)
Intensification (Wk 8-12):  #A855F7   (purple — advanced, elevated)
```

### 1.8 Muscle Group Colors (for volume charts)

```
Shoulders:                  #E94560
Back:                       #4ECDC4
Chest:                      #F97316
Quadriceps:                 #3B82F6
Hamstrings:                 #8B5CF6
Glutes:                     #EC4899
Biceps:                     #10B981
Triceps:                    #6366F1
Calves:                     #14B8A6
Forearms:                   #F59E0B
Abs:                        #64748B
```

### 1.9 Session Feeling Colors

```
1 — Terrible (😴):          #EF4444
2 — Low (😐):               #F97316
3 — Normal (🙂):            #FBBF24
4 — Strong (💪):            #4ADE80
5 — Exceptional (🔥):      #E94560
```

---

## 2. Typography

### 2.1 Font Stack

```
Primary:                    Inter (via expo-google-fonts or bundled)
Monospace:                  JetBrains Mono (weight displays, timers, stats)
Fallback:                   system-ui, -apple-system, sans-serif
```

**Why Inter:** Optimized for screens, excellent legibility at small sizes, great number disambiguation (critical for weight/rep displays where 6/8/9/0 must be instantly distinguishable). Broad weight range for hierarchy.

**Why JetBrains Mono for data:** Tabular (fixed-width) numbers align in columns. Weight values, rep counts, and timer digits must stack vertically without jitter. Proportional fonts cause visual chaos in set row tables.

### 2.2 Type Scale

All sizes in points. Line heights in multiples.

```
Display:        32pt / 38pt line / Inter Bold         (screen titles, current weight on body tab)
Heading 1:      24pt / 30pt line / Inter SemiBold      (section headers: "Full Body", "Progress")
Heading 2:      20pt / 26pt line / Inter SemiBold      (exercise names in workout cards)
Heading 3:      17pt / 22pt line / Inter Medium         (sub-section labels: "Shoulders", "Back - Width")
Body:           15pt / 22pt line / Inter Regular        (technique notes, descriptions, session notes)
Body Small:     13pt / 18pt line / Inter Regular        (metadata, timestamps, supporting text)
Caption:        11pt / 14pt line / Inter Medium         (badges, tags, labels above inputs)
Overline:       10pt / 14pt line / Inter SemiBold CAPS  (section labels, "PREVIOUS", "SET", "KG")

Data Large:     28pt / 32pt line / JetBrains Mono Bold  (rest timer countdown, current body weight)
Data Medium:    18pt / 22pt line / JetBrains Mono Medium (weight/rep values in set rows)
Data Small:     14pt / 18pt line / JetBrains Mono Regular (ghost values, secondary data)
```

### 2.3 Typography Rules

- **Never use more than 3 type sizes on a single screen.** Dashboard can use Display + Body + Caption. Workout screen uses Heading 2 + Data Medium + Caption.
- **Exercise names are always Heading 2.** Consistent hierarchy across all screens.
- **All numeric data uses JetBrains Mono.** Weights, reps, RPE numbers, timer digits, body weight, percentages. No exceptions.
- **Labels above data columns use Overline (CAPS).** "SET", "PREVIOUS", "KG", "REPS", "RPE" — always uppercase, always 10pt, always `Text Secondary` color.
- **Technique notes use Body at Text Secondary color.** They're important but subordinate to the logging interface.
- **No italics except for ghost values and placeholder text.** Italic in a gym UI just looks weak.

---

## 3. Spacing System

### 3.1 Base Unit

All spacing derives from a **4pt base grid**. Every margin, padding, and gap is a multiple of 4.

```
2xs:    4pt     (tight internal padding, icon-to-label gaps)
xs:     8pt     (between related elements within a component)
sm:     12pt    (between set rows, between badges)
md:     16pt    (standard content padding, card internal padding)
lg:     24pt    (between exercise cards, between sections)
xl:     32pt    (between major sections, screen top/bottom padding)
2xl:    48pt    (hero spacing, title to first content block)
```

### 3.2 Screen Padding

```
Horizontal screen padding:  16pt (both sides, consistent across all screens)
Top safe area:              system safe area inset + 8pt
Bottom safe area:           system safe area inset + 8pt (above tab bar)
Tab bar height:             56pt + bottom safe area
```

### 3.3 Card Padding

```
Card outer margin:          0pt horizontal (cards go edge-to-edge within screen padding)
Card internal padding:      16pt all sides
Card border radius:         12pt
Card gap (between cards):   12pt vertical
```

### 3.4 Touch Targets

```
Minimum touch target:       44 × 44pt (Apple HIG minimum)
Recommended touch target:   48 × 48pt (gym gloves / sweaty fingers)
Checkmark button:           48 × 48pt
RPE badge (tappable):       44 × 36pt minimum
Weight +/- stepper:         44 × 44pt per button
Tab bar icons:              48 × 48pt hit area
```

---

## 4. Component Specifications

### 4.1 Exercise Card

The primary unit of the workout screen. One card per exercise.

```
┌────────────────────────────────────────────────────────┐ ← 12pt radius
│  16pt padding                                          │
│                                                        │
│  ┌──────────────────────────────┐  ┌────┐  ┌────────┐  │
│  │ Lying Leg Curl         H2   │  │ ▶  │  │ Hams   │  │
│  └──────────────────────────────┘  └────┘  └────────┘  │
│         exercise name              video    muscle tag  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │ ← expandable
│  │ Set the machine so that you get the biggest...   │  │   technique note
│  │ Subs: Seated Leg Curl, Nordic Ham Curl           │  │   (Body, Text Secondary)
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────┬───────────┬────────┬──────┬──────┬───────┐  │ ← column headers
│  │ SET  │ PREVIOUS  │  KG    │ REPS │ RPE  │       │  │   (Overline, Text Tertiary)
│  ├──────┼───────────┼────────┼──────┼──────┼───────┤  │
│  │  1   │ 40×7 @9   │ [40.0] │ [ 7] │ [@9] │  [✓]  │  │ ← set row (active)
│  ├──────┼───────────┼────────┼──────┼──────┼───────┤  │
│  │  2   │ 40×6 @10  │ [40.0] │ [ 6] │ [@10]│  [ ]  │  │ ← set row (pending)
│  └──────┴───────────┴────────┴──────┴──────┴───────┘  │
│                                                        │
│  + Warmup Set    + Extra Set    📝 Note    🔄 Swap     │ ← action row
│                                         (Caption)      │
│  16pt padding                                          │
└────────────────────────────────────────────────────────┘
```

**Card states:**
- **Default:** Level 1 surface, default border
- **Active (has uncompleted sets):** Level 1 surface, left border accent (2pt primary color)
- **Complete (all sets checked):** Level 1 surface, opacity 0.6, green checkmark overlay on card header
- **Collapsed (scrolled past):** Auto-collapses completed cards to just the header row (exercise name + ✓)

### 4.2 Set Row

The most-tapped component in the app. Must be bulletproof.

```
Height:             52pt (comfortable thumb target)
Background:         Level 2 (nested inside Level 1 card)
Active set row:     Left accent border (2pt, primary color)
Completed row:      Background shifts to Success Muted, text dims slightly
Skipped row:        Background shifts to Error Muted, strikethrough text

Column widths (flexible, percentage-based):
  SET:              10%   (centered, Data Small, Text Secondary)
  PREVIOUS:         25%   (left-aligned, Data Small, Ghost color, italic)
  KG:               22%   (centered, Data Medium, editable input)
  REPS:             15%   (centered, Data Medium, editable input)
  RPE:              15%   (centered, RPE badge component)
  CHECK:            13%   (centered, 48×48pt checkmark button)
```

**Input fields within set rows:**
- Background: Level 3 (darker than row background for visible input area)
- Border: 1px Border Default, Border Active on focus
- Border radius: 8pt
- Text: Data Medium, Text Primary, center-aligned
- Placeholder: Data Medium, Text Tertiary
- On focus: Primary Glow shadow, border becomes primary color
- Numeric keypad only (no text keyboard)

### 4.3 RPE Selector

Appears as a bottom sheet when user taps an RPE badge on a set row.

```
┌────────────────────────────────────────┐
│                                        │ ← drag handle (center, 40×4pt, rounded)
│     Select RPE                  H3     │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  @7    3 reps in reserve       │    │ ← teal background pill
│  │        Easy / warming up       │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  @8    2 reps in reserve       │    │ ← amber background pill
│  │        Moderate effort         │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  @9    1 rep in reserve        │    │ ← orange background pill
│  │        Hard / near failure     │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  @10   0 reps left             │    │ ← red background pill
│  │        Absolute failure        │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  Skip RPE (use target)         │    │ ← ghost style, no color
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

Each option: 56pt height, full width, 12pt radius, RPE color at 15% opacity background, RPE color text for the number, Text Primary for description. Tap selects + dismisses sheet. Selected option shows a checkmark.

### 4.4 Rest Timer (Floating)

Always visible during active workout. Two states: expanded and collapsed.

**Collapsed (default after a few seconds):**
```
┌──────────────────────────────────────────────────┐
│  ⏱ REST  1:42  │ ████████░░░░░ │  +30s  │ Skip  │  ← 56pt height
└──────────────────────────────────────────────────┘
     Secondary     progress bar      actions
     color text     Secondary        Caption
```

Position: fixed to bottom of screen, above tab bar. Full width minus 32pt (16pt margin each side). 12pt radius. Level 2 surface with 1px border. Subtle drop shadow upward.

**Expanded (tap to expand):**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│              ┌──────────────┐                    │
│              │              │                    │
│              │    1:42      │  ← Data Large      │
│              │              │    inside circular  │
│              │   ╭──────╮   │    progress ring    │
│              │   │ 180s │   │    (Secondary color)│
│              │   ╰──────╯   │                    │
│              └──────────────┘                    │
│                                                  │
│          Next: Squat (Set 1 of 2)                │
│                                                  │
│     [ -30s ]    [ Pause ]    [ +30s ]    [ Skip ]│
│                                                  │
└──────────────────────────────────────────────────┘
```

**Timer complete state:** Background pulses between Level 2 and Secondary Muted. Text flashes "GO" in Secondary color. Haptic burst fires. Optional sound plays. Auto-collapses after 5 seconds.

### 4.5 Phase Badge

Small inline badge showing current week and phase.

```
┌──────────────────────────┐
│  Week 3 • Base           │  ← Caption text, phase color text
└──────────────────────────┘
   Phase color at 15% bg
   Phase color 1px border
   8pt vertical padding
   12pt horizontal padding
   99pt border radius (pill)
```

Variants by phase:
- Intro: teal border/text on teal 15% bg
- Base: primary border/text on primary 15% bg
- Deload: amber border/text on amber 15% bg
- Intensification: purple border/text on purple 15% bg

### 4.6 Muscle Group Tag

Small colored pill showing which muscles an exercise targets.

```
┌──────────┐
│  Hams    │  ← Caption, muscle color text
└──────────┘
   Muscle color at 12% bg
   6pt vertical padding
   10pt horizontal padding
   99pt radius
```

Multiple tags sit in a horizontal flex row with 6pt gaps.

### 4.7 Stat Card

Reusable metric display for dashboard and summary screens.

```
┌──────────────────────┐
│  Total Volume    Cap │  ← Caption, Text Secondary
│  3,240 kg       H1   │  ← Heading 1 or Data Large, Text Primary
│  ▲ 12% vs last  Sm   │  ← Body Small, Success or Error color
└──────────────────────┘
   Level 1 surface
   16pt padding all sides
   12pt radius
```

### 4.8 PR Celebration

Triggered when a new personal record is detected on workout completion.

**In workout summary:**
```
┌────────────────────────────────────────┐
│  🏆  NEW PR — Squat                    │
│                                        │
│  82.5 kg × 8 reps                      │  ← Data Medium, PR Gold
│  Est. 1RM: 104.5 kg                    │  ← Body Small, Text Secondary
│  Previous: 80 kg × 8                   │  ← Body Small, Text Tertiary
└────────────────────────────────────────┘
   PR Gold at 10% bg
   PR Gold 1px border
   PR Gold Glow shadow
   16pt padding
```

**Animation:** Card fades in with a 200ms scale-up from 95% to 100%. Gold shimmer gradient sweeps left-to-right once on appearance (CSS gradient animation, 600ms). Heavy haptic fires at the start.

### 4.9 Weight Input Stepper

Inline within set rows, but also used as a standalone component on exercise detail screens.

```
┌─────┬────────────┬─────┐
│  -  │   40.0     │  +  │  ← 44×44pt buttons, Data Medium center
└─────┴────────────┴─────┘
  Each button: Level 3 bg, Text Primary
  Pressed state: Primary Muted bg
  Long-press: auto-increment every 200ms
  Increment: configurable (1.0 kg for isolation, 2.5 kg for compounds)
```

### 4.10 Bottom Tab Bar

5 tabs. Fixed at bottom. Level 1 surface with top 1px border (Border Default).

```
┌────────┬────────┬────────┬────────┬────────┐
│  Home  │  Log   │  📊   │  Body  │  ⚙    │
│  🏠    │  📋   │ Stats  │  ⚖    │ Setup  │
└────────┴────────┴────────┴────────┴────────┘
  Active: Primary color icon + label
  Inactive: Text Tertiary icon + label
  Icon size: 24pt
  Label: Caption (10pt)
  Tab height: 56pt + bottom safe area
  Touch target: full tab width × 56pt
```

### 4.11 Calendar View (History)

Monthly grid showing training days as colored dots.

```
       Apr 2026
  Mo  Tu  We  Th  Fr  Sa  Su
           1   2   3   4   5
   6   7●  8   9  10● 11  12
  13  14● 15  16  17● 18  19
  20  21● 22  23  24  25  26
  27  28  29  30

  ● = training day dot (8pt circle)
  Color = day type (Full Body: primary, Upper: secondary, Lower: tertiary, Arms: purple)
```

Dot sits centered below the date number. Tap a date with a dot to jump to that workout in the history list.

### 4.12 Progress Chart

Line chart for per-exercise weight tracking.

```
Chart area:
  Background: transparent (inherits screen Level 0)
  Grid lines: Border Default color, 1px, dashed
  Axis labels: Caption, Text Tertiary
  Data line: 2pt stroke, Primary color
  Data points: 6pt circles, Primary fill, 1px white border
  Selected point: 10pt circle, Primary fill, PR Gold Glow if PR
  Tooltip on tap: Level 2 card, shows date + weight × reps

  Trend line (optional): 1pt stroke, Text Tertiary, dashed
  Goal line: 1pt stroke, Success color, dashed, labeled
```

**Interaction:** Tap and hold a data point to see tooltip. Swipe horizontally to scroll timeline. Pinch to zoom time range.

---

## 5. Interaction Patterns

### 5.1 Set Completion Flow

```
User taps checkmark on set row
  → Haptic: Medium impact
  → Row background transitions to Success Muted (150ms ease)
  → Checkmark fills with Success color
  → Weight + reps values lock (become non-editable, show as solid text)
  → Rest timer auto-starts (Secondary color countdown)
  → Next uncompleted set row gains active indicator (left primary border)
  → If last set in exercise: exercise card header gets green checkmark
  → If all exercises complete: "Finish Workout" button pulses gently
```

### 5.2 Rest Timer Lifecycle

```
Set completed → Timer starts at exercise-specific duration
  → Collapsed bar visible at bottom
  → Timer counts down (updates every 1s)
  → Progress bar fills left-to-right
  → At 0: Haptic Heavy + optional sound + visual pulse
  → "GO" text replaces timer for 3s
  → Timer dismisses after 5s of inactivity
  → User can tap to expand full controls at any time
  → +30s / -30s adjust the current countdown
  → Skip dismisses immediately
  → Starting a new set while timer is running resets and restarts
```

### 5.3 Workout Finish Flow

```
User taps "Finish" button
  → If uncompleted sets exist: confirmation dialog
    "X sets not completed. Finish anyway?"
    [Continue Workout] [Finish]
  → Progression engine runs (see CLAUDE.md)
  → PR detection runs
  → Bottom sheet slides up: WorkoutSummary
    → Duration, sets, volume displayed
    → Feeling selector (tap emoji)
    → Session notes text input
    → Progression changes listed per exercise
    → PRs highlighted with gold treatment
    → "Save & Close" button
  → On save: write to DB, clear workout store, return to dashboard
  → Dashboard refreshes with updated stats
```

### 5.4 Swipe Gestures

```
History workout card — swipe left:
  → Reveals red "Delete" button (56pt wide)
  → Tap delete: confirmation dialog
  → Confirm: workout and all sets deleted, list animates closed

Set row — swipe left:
  → Reveals "Skip" button (amber)
  → Tap skip: row marks as skipped (Error Muted bg, strikethrough)

Set row — swipe right:
  → Reveals "Note" button (secondary)
  → Tap: note input field expands below the set row
```

### 5.5 Pull-to-Refresh

Dashboard and history screens support pull-to-refresh. Recalculates current week, refreshes stats. Uses a custom spinner (circular progress ring in Primary color, no text).

---

## 6. Animation Specifications

All animations use `react-native-reanimated`. Keep durations short — this is a utility app, not a toy.

```
Transitions:
  Screen push/pop:          250ms, ease-in-out
  Bottom sheet open:        300ms, spring (damping: 20, stiffness: 150)
  Bottom sheet close:       200ms, ease-out
  Card expand/collapse:     200ms, ease-in-out

Feedback:
  Set completion row flash:  150ms fade to Success Muted, holds
  PR shimmer:               600ms linear gradient sweep, single pass
  Timer pulse at 0:         400ms scale 1.0→1.05→1.0, repeats 3x
  Button press:             100ms scale 1.0→0.95→1.0

Data:
  Chart line draw:          500ms, ease-out (draws from left to right)
  Stat counter:             400ms, counting up from 0 to value
  Progress bar fill:        300ms, ease-out
```

**Rules:**
- No animation longer than 600ms
- No bounce effects (looks childish in a utility app)
- No parallax scrolling
- Haptic always fires at the START of an animation, not the end
- If a user triggers multiple animations rapidly (e.g. checking off sets fast), skip animation and just show final state — never queue

---

## 7. Layout Patterns

### 7.1 Thumb Zone Design

Based on Hoober's 2025 research: 75% of phone interactions use a single thumb. The comfortable zone is the bottom third + side curve of the dominant hand.

**Primary actions go at the bottom:**
- "Start Workout" button: bottom of dashboard scroll
- "Finish Workout": top-right of active workout header (reachable, but not accidentally tappable)
- Rest timer: fixed at bottom
- Tab bar: bottom
- Set checkmarks: right side of each row (right-thumb dominant)

**Information displays go at the top:**
- Week/phase badge: top of screen
- Elapsed timer: top header
- Exercise name: top of each card (read, don't interact)

### 7.2 Active Workout Scroll Behavior

- Exercise cards scroll vertically in a flat list
- Completed exercise cards auto-collapse to a compact header row (exercise name + ✓) after the next exercise is started
- Current exercise always visible without scrolling when possible
- "Finish" button appears as a large card at the very bottom of the list after the last exercise
- Rest timer floats above the scroll, never scrolls off screen

### 7.3 Adaptive Density

```
Dashboard:          Breathing layout, generous spacing, stat cards with padding
Active Workout:     Dense layout, maximum data per pixel, tight set rows
History List:       Medium density, scannable cards
Progress Charts:    Generous, full-width charts with padding
Body Tab:           Breathing, input-focused, lots of whitespace around fields
Settings:           Standard list, iOS-style grouped sections
```

---

## 8. Iconography

Use **Lucide** icon set exclusively. 24pt default size. Stroke width 2pt. Color follows context (Text Secondary for passive, Primary for active/interactive).

**Key icons:**
```
Dashboard:          Home (home tab), Activity (stats), Scale (body), Settings (gear)
Workout:            Play (video link), ChevronDown (expand), Check (complete set),
                    Plus (add set), MessageSquare (note), RefreshCw (substitution),
                    Timer (rest), SkipForward (skip timer)
History:            Calendar (calendar view), List (list view), Trash2 (delete),
                    Edit3 (edit set)
Progress:           TrendingUp (chart), Trophy (PR), BarChart3 (volume)
```

**Rules:**
- Never use filled icons (always stroke/outline)
- Active tab icon: Primary color, filled variant (exception to above rule)
- Icon + label pairs: 4pt gap between icon and label
- Standalone icons (no label): always add accessibility label

---

## 9. Empty States

Every data screen must have a designed empty state for first use.

**Pattern:**
```
┌────────────────────────────────────────┐
│                                        │
│           [ Lucide icon, 48pt ]        │  ← Text Tertiary color
│                                        │
│         No workouts logged yet         │  ← Heading 3, Text Secondary
│                                        │
│    Start your first session to see     │  ← Body Small, Text Tertiary
│       your progress here.              │
│                                        │
│        [ Start Workout ]               │  ← Primary button (if applicable)
│                                        │
└────────────────────────────────────────┘
```

Centered vertically in the available space. No illustrations, no mascots, no confetti. Just the icon, a short message, and optionally a CTA.

---

## 10. Platform-Specific Notes

### iOS
- Use SF symbols as fallback if Lucide doesn't load
- Respect Dynamic Type: support accessibility text sizes on all labels (not on data inputs — those stay fixed for layout stability)
- Use native blur for modal backgrounds (expo-blur)
- Haptic engine: UIImpactFeedbackGenerator (Medium, Heavy, Light as specified)
- Bottom safe area: respect iPhone home indicator spacing

### Android
- Status bar: transparent, icons light (white)
- Navigation bar: transparent or matches Level 0
- Haptic: VibrationEffect.createOneShot for set completion
- Material You: ignore dynamic theming — this app owns its palette
- Edge-to-edge display: extend Level 0 behind system bars

---

## 11. Accessibility

- **Contrast ratios:** All text meets WCAG AA minimum (4.5:1 for body, 3:1 for large text). Primary text on Level 0/1 exceeds AAA (7:1).
- **Touch targets:** 44×44pt minimum everywhere. 48×48pt preferred on workout screen.
- **Screen reader:** All interactive elements have descriptive labels. Set rows announce: "Set 1, 40 kilograms, 7 reps, RPE 9, not completed". Completed sets announce "completed".
- **Reduce motion:** If device has reduce-motion enabled, skip all animations. Transitions become instant cuts. Timer still counts down but without pulse animation.
- **Color independence:** Never communicate information through color alone. RPE badges show the number + description, not just color. Set completion uses checkmark icon + color, not just color. PR uses trophy icon + gold color.
- **Font scaling:** Body text, labels, and headings scale with system Dynamic Type. Data inputs (weight, reps) stay fixed at specified sizes to maintain layout.

// =============================================================================
// Active-workout session store.
// In-memory mirror of the DB rows for the currently-open workout. Every
// mutating action writes through to SQLite immediately (crash recovery).
// =============================================================================

import { create } from "zustand";

import type {
  DayId,
  LoggedSet,
  PhaseId,
  WarmupSet,
  Workout,
} from "@/types";
import {
  createLoggedSet,
  createWarmupSet,
  createWorkout,
  deleteWarmupSet,
  getActiveWorkout,
  getLoggedSetsForWorkout,
  getWarmupSetsForWorkout,
  updateLoggedSet,
  updateWorkout,
} from "@/db/queries";
import { workoutVolume } from "@/utils/volumeCalc";

// --- Rest timer ------------------------------------------------------------

interface RestTimerState {
  active: boolean;
  exerciseId?: string;
  startedAt?: number; // epoch ms when the current run began
  durationSec?: number; // full duration of the current run
  paused: boolean;
  pausedRemaining?: number; // seconds left when paused
}

const initialTimer: RestTimerState = {
  active: false,
  paused: false,
};

// --- Store shape -----------------------------------------------------------

interface WorkoutSessionState {
  activeWorkout: Workout | null;
  loggedSets: LoggedSet[];
  warmupSets: WarmupSet[];
  restTimer: RestTimerState;

  hydrate: () => void;
  startWorkout: (
    dayId: DayId,
    weekNumber: number,
    phase: PhaseId,
    dayName: string,
  ) => Workout;
  logSet: (input: Omit<LoggedSet, "id" | "workoutId">) => void;
  updateSet: (id: string, patch: Partial<LoggedSet>) => void;
  addWarmup: (input: Omit<WarmupSet, "id" | "workoutId">) => void;
  removeWarmup: (id: string) => void;
  finishWorkout: () => { workoutId: string } | null;
  cancelWorkout: () => void;

  startRestTimer: (exerciseId: string, durationSec: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  adjustRestTimer: (deltaSec: number) => void;
  skipRestTimer: () => void;
}

// --- Helpers ---------------------------------------------------------------

/**
 * Load all logged + warmup sets for a workout; safe if DB layer isn't ready.
 */
function loadSetsFor(workoutId: string): {
  sets: LoggedSet[];
  warmups: WarmupSet[];
} {
  let sets: LoggedSet[] = [];
  let warmups: WarmupSet[] = [];
  try {
    sets = getLoggedSetsForWorkout(workoutId);
  } catch {
    sets = [];
  }
  try {
    warmups = getWarmupSetsForWorkout(workoutId, "");
  } catch {
    warmups = [];
  }
  return { sets, warmups };
}

/**
 * Compute remaining seconds for the current run of the rest timer.
 */
function computeRemaining(timer: RestTimerState): number {
  if (!timer.active) return 0;
  if (timer.paused) return timer.pausedRemaining ?? 0;
  if (!timer.startedAt || !timer.durationSec) return 0;
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, timer.durationSec - elapsed);
}

// --- Store -----------------------------------------------------------------

export const useWorkoutStore = create<WorkoutSessionState>((set, get) => ({
  activeWorkout: null,
  loggedSets: [],
  warmupSets: [],
  restTimer: { ...initialTimer },

  hydrate: () => {
    let active: Workout | null = null;
    try {
      active = getActiveWorkout();
    } catch {
      active = null;
    }
    if (!active) {
      set({ activeWorkout: null, loggedSets: [], warmupSets: [] });
      return;
    }
    const { sets, warmups } = loadSetsFor(active.id);
    set({
      activeWorkout: active,
      loggedSets: sets,
      warmupSets: warmups,
    });
  },

  startWorkout: (dayId, weekNumber, phase, dayName) => {
    const now = new Date().toISOString();
    const workout = createWorkout({
      dayId,
      dayName,
      weekNumber,
      phase,
      startedAt: now,
    });
    set({
      activeWorkout: workout,
      loggedSets: [],
      warmupSets: [],
      restTimer: { ...initialTimer },
    });
    return workout;
  },

  logSet: (input) => {
    const active = get().activeWorkout;
    if (!active) return;
    const row = createLoggedSet({ ...input, workoutId: active.id });
    set((state) => ({ loggedSets: [...state.loggedSets, row] }));
  },

  updateSet: (id, patch) => {
    updateLoggedSet(id, patch);
    set((state) => ({
      loggedSets: state.loggedSets.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
  },

  addWarmup: (input) => {
    const active = get().activeWorkout;
    if (!active) return;
    const row = createWarmupSet({ ...input, workoutId: active.id });
    set((state) => ({ warmupSets: [...state.warmupSets, row] }));
  },

  removeWarmup: (id) => {
    deleteWarmupSet(id);
    set((state) => ({
      warmupSets: state.warmupSets.filter((w) => w.id !== id),
    }));
  },

  finishWorkout: () => {
    const { activeWorkout, loggedSets } = get();
    if (!activeWorkout) return null;

    const completedAt = new Date().toISOString();
    const startedAt = new Date(activeWorkout.startedAt).getTime();
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - startedAt) / 1000),
    );
    const totalSets = loggedSets.filter((s) => s.setType !== "warmup").length;
    const completedSets = loggedSets.filter(
      (s) => s.setType !== "warmup" && s.completed,
    ).length;
    const totalVolume = workoutVolume(loggedSets);

    const patch = {
      completedAt,
      durationSeconds,
      totalSets,
      completedSets,
      totalVolume,
    };
    updateWorkout(activeWorkout.id, patch);

    const workoutId = activeWorkout.id;
    set({
      activeWorkout: null,
      loggedSets: [],
      warmupSets: [],
      restTimer: { ...initialTimer },
    });
    return { workoutId };
  },

  cancelWorkout: () => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      // Mark the workout as completed so it's no longer "active" per the
      // DB's notion of getActiveWorkout (completed_at IS NULL). We don't
      // delete it outright — preserves partial history if the user wants it.
      updateWorkout(activeWorkout.id, {
        completedAt: new Date().toISOString(),
        durationSeconds: Math.max(
          0,
          Math.round(
            (Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000,
          ),
        ),
      });
    }
    set({
      activeWorkout: null,
      loggedSets: [],
      warmupSets: [],
      restTimer: { ...initialTimer },
    });
  },

  // --- Rest timer --------------------------------------------------------

  startRestTimer: (exerciseId, durationSec) => {
    set({
      restTimer: {
        active: true,
        exerciseId,
        startedAt: Date.now(),
        durationSec,
        paused: false,
        pausedRemaining: undefined,
      },
    });
  },

  pauseRestTimer: () => {
    const timer = get().restTimer;
    if (!timer.active || timer.paused) return;
    const remaining = computeRemaining(timer);
    set({
      restTimer: {
        ...timer,
        paused: true,
        pausedRemaining: remaining,
      },
    });
  },

  resumeRestTimer: () => {
    const timer = get().restTimer;
    if (!timer.active || !timer.paused) return;
    const remaining = timer.pausedRemaining ?? 0;
    set({
      restTimer: {
        ...timer,
        paused: false,
        startedAt: Date.now(),
        durationSec: remaining,
        pausedRemaining: undefined,
      },
    });
  },

  adjustRestTimer: (deltaSec) => {
    const timer = get().restTimer;
    if (!timer.active) return;
    if (timer.paused) {
      const next = Math.max(0, (timer.pausedRemaining ?? 0) + deltaSec);
      set({ restTimer: { ...timer, pausedRemaining: next } });
      return;
    }
    const remaining = Math.max(0, computeRemaining(timer) + deltaSec);
    set({
      restTimer: {
        ...timer,
        startedAt: Date.now(),
        durationSec: remaining,
      },
    });
  },

  skipRestTimer: () => {
    set({ restTimer: { ...initialTimer } });
  },
}));

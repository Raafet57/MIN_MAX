// =============================================================================
// Settings store. Hydrates from SQLite; every update is written through.
// =============================================================================

import { create } from "zustand";

import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/constants/config";
import {
  getAllSettings,
  resetDatabase,
  setSetting,
} from "@/db/queries";

interface SettingsState {
  settings: AppSettings;
  hydrate: () => void;
  update: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },

  hydrate: () => {
    try {
      const loaded = getAllSettings();
      set({ settings: loaded });
    } catch {
      // DB not ready yet — fall back to defaults.
      set({ settings: { ...DEFAULT_SETTINGS } });
    }
  },

  update: (key, value) => {
    setSetting(key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value } as AppSettings,
    }));
  },

  reset: () => {
    resetDatabase();
    try {
      const loaded = getAllSettings();
      set({ settings: loaded });
    } catch {
      set({ settings: { ...DEFAULT_SETTINGS } });
    }
  },
}));

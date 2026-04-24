// =============================================================================
// Lightweight UI state: which exercise is expanded, RPE selector visibility.
// Pure runtime — not persisted. Resets on app relaunch.
// =============================================================================

import { create } from "zustand";

interface RpeSelectorState {
  visible: boolean;
  setId?: string;
}

interface UiState {
  expandedExerciseId: string | null;
  showRpeSelector: RpeSelectorState;
  setExpanded: (id: string | null) => void;
  toggleRpeSelector: (setId?: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  expandedExerciseId: null,
  showRpeSelector: { visible: false },

  setExpanded: (id) => set({ expandedExerciseId: id }),

  toggleRpeSelector: (setId) => {
    const current = get().showRpeSelector;
    // Close if called without a setId (explicit dismiss) or if tapping the
    // same row that's already open.
    if (setId === undefined) {
      set({ showRpeSelector: { visible: false } });
      return;
    }
    if (current.visible && current.setId === setId) {
      set({ showRpeSelector: { visible: false } });
      return;
    }
    set({ showRpeSelector: { visible: true, setId } });
  },
}));

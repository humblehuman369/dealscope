/**
 * UI Store — Application-level UI state.
 *
 * Mirrors frontend/src/stores/index.ts (useUIStore).
 *
 * Non-persisted — resets to defaults on each app launch.
 * Manages transient UI state like active strategy selection,
 * panel visibility, and view preferences.
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

interface UIStore {
  // Active strategy (used across analysis, worksheet, and verdict screens)
  activeStrategy: StrategyId;

  // Panel toggles
  showAssumptionsPanel: boolean;
  showDataProvenance: boolean;

  // Worksheet view mode
  worksheetViewMode: 'inputs' | 'results';

  // Bottom sheet state (for navigation sheet, filter sheet, etc.)
  activeBottomSheet: string | null;

  // Global snackbar / toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Actions
  setActiveStrategy: (strategy: StrategyId) => void;
  toggleAssumptionsPanel: () => void;
  toggleDataProvenance: () => void;
  setWorksheetViewMode: (mode: 'inputs' | 'results') => void;
  openBottomSheet: (sheetId: string) => void;
  closeBottomSheet: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set) => ({
  activeStrategy: 'ltr',
  showAssumptionsPanel: false,
  showDataProvenance: true,
  worksheetViewMode: 'inputs',
  activeBottomSheet: null,
  toast: null,

  setActiveStrategy: (strategy) =>
    set({ activeStrategy: strategy }),

  toggleAssumptionsPanel: () =>
    set((state) => ({ showAssumptionsPanel: !state.showAssumptionsPanel })),

  toggleDataProvenance: () =>
    set((state) => ({ showDataProvenance: !state.showDataProvenance })),

  setWorksheetViewMode: (mode) =>
    set({ worksheetViewMode: mode }),

  openBottomSheet: (sheetId) =>
    set({ activeBottomSheet: sheetId }),

  closeBottomSheet: () =>
    set({ activeBottomSheet: null }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    // Auto-dismiss after 3 seconds
    setTimeout(() => set({ toast: null }), 3000);
  },

  clearToast: () =>
    set({ toast: null }),
}));

// ─── Selectors ───────────────────────────────────────────────────────────────

export const useActiveStrategy = () =>
  useUIStore((state) => state.activeStrategy);

export const useToast = () =>
  useUIStore((state) => state.toast);

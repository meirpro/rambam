/**
 * Offline state store
 * Tracks network connectivity status for the app
 */

import { create } from "zustand";

export type OfflineState = "online" | "system-offline" | "user-offline";

interface OfflineStore {
  // Current connectivity state
  state: OfflineState;
  // Last time we were confirmed online
  lastOnline: string | null;
  // Flag for content updates available
  hasContentUpdate: boolean;

  // Actions
  setOnline: () => void;
  setSystemOffline: () => void;
  setUserOffline: () => void;
  setHasContentUpdate: (hasUpdate: boolean) => void;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  // Initial state: assume online, will be updated by hook
  state: "online",
  lastOnline: null,
  hasContentUpdate: false,

  setOnline: () =>
    set({
      state: "online",
      lastOnline: new Date().toISOString(),
    }),

  setSystemOffline: () =>
    set((state) => ({
      state: "system-offline",
      // Keep lastOnline as-is when going offline
      lastOnline: state.lastOnline,
    })),

  setUserOffline: () =>
    set((state) => ({
      state: "user-offline",
      lastOnline: state.lastOnline,
    })),

  setHasContentUpdate: (hasUpdate) =>
    set({
      hasContentUpdate: hasUpdate,
    }),
}));

/**
 * Helper to check if we're currently offline (either reason)
 */
export function isOffline(state: OfflineState): boolean {
  return state === "system-offline" || state === "user-offline";
}

/**
 * Get human-readable offline reason in Hebrew
 */
export function getOfflineReason(state: OfflineState): string | null {
  switch (state) {
    case "system-offline":
      return "אין חיבור לאינטרנט";
    case "user-offline":
      return "מצב לא מקוון";
    default:
      return null;
  }
}

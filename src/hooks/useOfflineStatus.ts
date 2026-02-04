/**
 * Hook to track and manage offline status
 * Listens to browser online/offline events and updates the store
 */

"use client";

import { useEffect } from "react";
import {
  useOfflineStore,
  isOffline as checkIsOffline,
  getOfflineReason,
} from "@/stores/offlineStore";

export interface OfflineStatus {
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Whether the app is online */
  isOnline: boolean;
  /** The reason for being offline (in Hebrew), or null if online */
  offlineReason: string | null;
  /** ISO timestamp of last confirmed online status */
  lastOnline: string | null;
  /** Whether there are content updates available */
  hasContentUpdate: boolean;
}

/**
 * Hook to monitor and respond to network connectivity changes
 * Automatically updates the offline store based on browser events
 */
export function useOfflineStatus(): OfflineStatus {
  const state = useOfflineStore((s) => s.state);
  const lastOnline = useOfflineStore((s) => s.lastOnline);
  const hasContentUpdate = useOfflineStore((s) => s.hasContentUpdate);
  const setOnline = useOfflineStore((s) => s.setOnline);
  const setSystemOffline = useOfflineStore((s) => s.setSystemOffline);

  useEffect(() => {
    // Set initial state based on navigator.onLine
    if (typeof navigator !== "undefined") {
      if (navigator.onLine) {
        setOnline();
      } else {
        setSystemOffline();
      }
    }

    const handleOnline = () => {
      setOnline();
    };

    const handleOffline = () => {
      setSystemOffline();
    };

    // Listen for connectivity changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline, setSystemOffline]);

  return {
    isOffline: checkIsOffline(state),
    isOnline: state === "online",
    offlineReason: getOfflineReason(state),
    lastOnline,
    hasContentUpdate,
  };
}

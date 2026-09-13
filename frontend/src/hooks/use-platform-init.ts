"use client";

import { useEffect, useRef } from "react";
import { useShelterStore } from "@/lib/store/use-shelter-store";

/**
 * Platform initialization and cross-device synchronization hook.
 * Syncs projects, materials, and benchmarks on initial mount and when returning to the tab.
 * Uses strict concurrency locking and cooldown throttling to prevent network flooding.
 */
export function usePlatformInit() {
  const loadAllInitialData = useShelterStore((state) => state.loadAllInitialData);
  const isLoadingApi = useShelterStore((state) => state.isLoadingApi);
  const hasInitialized = useRef(false);
  const isSyncing = useRef(false);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    const doSync = async (force: boolean = false) => {
      // Guard against concurrent execution
      if (isSyncing.current) return;

      const now = Date.now();
      // Throttle: minimum 60 seconds between syncs unless forced on mount
      if (!force && now - lastSyncTime.current < 60_000) {
        return;
      }

      if (typeof loadAllInitialData === "function") {
        isSyncing.current = true;
        try {
          await loadAllInitialData();
          lastSyncTime.current = Date.now();
        } catch (err: unknown) {
          console.debug("Background sync note:", err);
        } finally {
          isSyncing.current = false;
        }
      }
    };

    // 1. Initial mount sync (force = true)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      doSync(true);
    }

    // 2. Gentle background sync: every 3 minutes (180s), ONLY if tab is active/visible
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        doSync(false);
      }
    }, 180_000);

    // 3. Tab focus / visibility change sync (throttled by 60s cooldown)
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        doSync(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 4. Cross-tab synchronization on same device (when other tab writes to localStorage)
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("shelter_thermal_engineering_store")) {
        doSync(false);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadAllInitialData]);

  return { isLoadingApi: Boolean(isLoadingApi) };
}

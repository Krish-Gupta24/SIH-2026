"use client";

import { useEffect, useRef } from "react";
import { useShelterStore } from "@/lib/store/use-shelter-store";

/**
 * Platform initialization and real-time cross-device synchronization hook.
 * Keeps projects, materials, and weather configurations in sync across all devices and tabs.
 */
export function usePlatformInit() {
  const loadAllInitialData = useShelterStore((state) => state.loadAllInitialData);
  const isLoadingApi = useShelterStore((state) => state.isLoadingApi);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const doSync = () => {
      if (typeof loadAllInitialData === "function") {
        loadAllInitialData().catch((err: unknown) => {
          console.debug("Background sync note:", err);
        });
      }
    };

    // Initial mount sync
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      doSync();
    }

    // 1. Periodic background polling every 3.5 seconds across active sessions
    const intervalId = setInterval(doSync, 3500);

    // 2. Immediate sync when user focuses the window or switches back to tab
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        doSync();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 3. Cross-tab synchronization on same device
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("shelter_thermal_engineering_store")) {
        doSync();
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

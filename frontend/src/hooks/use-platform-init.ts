"use client";

import { useEffect, useRef } from "react";
import { useShelterStore } from "@/lib/store/use-shelter-store";

/**
 * Platform initialization hook.
 * Prepares the frontend store with projects, materials, and weather configurations.
 */
export function usePlatformInit() {
  const store = useShelterStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (typeof (store as any).loadAllInitialData === "function") {
        (store as any).loadAllInitialData().catch((err: unknown) => {
          console.warn("Backend synchronization warning (operating in offline mode):", err);
        });
      }
    }
  }, [store]);

  return { isLoadingApi: Boolean((store as any).isLoadingApi) };
}

"use client";

import { useEffect, useRef } from "react";
import { useShelterStore } from "@/lib/store/use-shelter-store";

/**
 * Initializes frontend store with real data from backend REST APIs:
 * - Syncs canonical shelter projects from /api/v1/shelters
 * - Syncs verified physical materials from /api/v1/materials
 * - Syncs weather datasets catalog from /api/v1/weather/datasets
 * - Syncs active and completed simulation jobs from /api/v1/simulations
 */
export function usePlatformInit() {
  const { loadAllInitialData, isLoadingApi } = useShelterStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadAllInitialData().catch((err) => {
        console.warn("Backend synchronization warning (operating in offline fallback mode):", err);
      });
    }
  }, [loadAllInitialData]);

  return { isLoadingApi };
}

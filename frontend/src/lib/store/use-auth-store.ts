"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserAccount {
  id: string;
  name: string;
  callsign: string;
  rank: string;
  unit: string;
  sector: string;
  role: string;
  clearanceLevel: string;
  avatarColor: "emerald" | "amber" | "sky" | "rose" | "indigo" | "purple";
  badge: string;
  isDemoDefault?: boolean;
}

// -----------------------------------------------------------------------------
// Hardcoded Demo Accounts for Frictionless Execution
// -----------------------------------------------------------------------------

export const DEMO_USER_ACCOUNT: UserAccount = {
  id: "MES-14CORPS-DEMO",
  name: "Major R. Sharma",
  callsign: "BRAVO-14",
  rank: "Executive Engineer (MES)",
  unit: "14 Corps Engineers · Northern Command",
  sector: "Leh - Siachen - Nyoma Sector",
  role: "Lead Defense Thermal Architect",
  clearanceLevel: "Level 4 (Operational Defense CAD)",
  avatarColor: "emerald",
  badge: "DEFENSE VERIFIED",
  isDemoDefault: true,
};

export const PRESET_USER_ACCOUNTS: UserAccount[] = [
  DEMO_USER_ACCOUNT,
  {
    id: "KARGIL-FIELD-02",
    name: "Captain Vikram S.",
    callsign: "DRAS-EAGLE",
    rank: "Field Post Commander",
    unit: "121 Indep Bde · Dras-Kargil",
    sector: "Dras - Zojila Cold Axis",
    role: "Site Commander",
    clearanceLevel: "Level 3 (Forward Outpost Command)",
    avatarColor: "amber",
    badge: "FIELD COMMAND",
  },
  {
    id: "SIACHEN-LOGISTICS-03",
    name: "Lt. Col. Ananya Verma",
    callsign: "GLACIER-DEPOT",
    rank: "Logistics Directorate",
    unit: "Siachen Base Camp Supply Depot",
    sector: "Nubra Valley / Siachen Glacier",
    role: "Alpine Logistics Officer",
    clearanceLevel: "Level 4 (Glacier High Altitude)",
    avatarColor: "sky",
    badge: "GLACIER LOGISTICS",
  },
  {
    id: "TAWANG-CORPS-04",
    name: "Subedar Major G. Singh",
    callsign: "TAWANG-NORTH",
    rank: "Frontier Infrastructure MES",
    unit: "4 Corps Engineers · Eastern Command",
    sector: "Tawang - Bum La Pass (3,050m)",
    role: "Mountain Barrack Specialist",
    clearanceLevel: "Level 3 (High-Altitude Eastern)",
    avatarColor: "purple",
    badge: "FRONTIER MES",
  },
];

export interface AuthState {
  currentUser: UserAccount;
  isAuthenticated: boolean;
  availableAccounts: UserAccount[];
  isAuthModalOpen: boolean;
  
  // Actions
  setAuthModalOpen: (open: boolean) => void;
  loginAs: (account: UserAccount) => void;
  loginWithCustomId: (customId: string, name?: string, unit?: string, sector?: string) => UserAccount;
  logout: () => void;
  resetToDemoAccount: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEMO_USER_ACCOUNT,
      isAuthenticated: true,
      availableAccounts: PRESET_USER_ACCOUNTS,
      isAuthModalOpen: false,

      setAuthModalOpen: (open: boolean) => {
        set({ isAuthModalOpen: open });
      },

      loginAs: (account: UserAccount) => {
        set({
          currentUser: account,
          isAuthenticated: true,
        });
      },

      loginWithCustomId: (customId: string, name?: string, unit?: string, sector?: string) => {
        const cleanId = customId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
        const formattedId = cleanId || `USER-${Date.now().toString().slice(-4)}`;
        
        // Check if existing
        const existing = get().availableAccounts.find((a) => a.id === formattedId);
        if (existing) {
          set({ currentUser: existing, isAuthenticated: true });
          return existing;
        }

        const newAccount: UserAccount = {
          id: formattedId,
          name: name?.trim() || `Officer ${formattedId}`,
          callsign: formattedId.slice(0, 10),
          rank: "Registered Engineer",
          unit: unit?.trim() || "Forward Defense Engineering Division",
          sector: sector?.trim() || "Himalayan Alpine Sector",
          role: "Defense Thermal Engineer",
          clearanceLevel: "Level 3 (Standard CAD Access)",
          avatarColor: "indigo",
          badge: "USER WORKSPACE",
          isDemoDefault: false,
        };

        set((state) => ({
          currentUser: newAccount,
          isAuthenticated: true,
          availableAccounts: [...state.availableAccounts, newAccount],
        }));

        return newAccount;
      },

      logout: () => {
        // Reset to guest or hardcoded demo account
        set({
          currentUser: DEMO_USER_ACCOUNT,
          isAuthenticated: true,
        });
      },

      resetToDemoAccount: () => {
        set({
          currentUser: DEMO_USER_ACCOUNT,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: "thermoshelter_auth_session",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage;
        }
        const mem = new Map<string, string>();
        return {
          getItem: (key: string) => mem.get(key) ?? null,
          setItem: (key: string, value: string) => {
            mem.set(key, value);
          },
          removeItem: (key: string) => {
            mem.delete(key);
          },
        };
      }),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        availableAccounts: state.availableAccounts,
      }),
    }
  )
);

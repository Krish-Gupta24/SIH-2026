"use client";

import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  User,
  Users,
  Key,
  LogOut,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  Flame,
  FolderLock,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAuthStore,
  UserAccount,
  PRESET_USER_ACCOUNTS,
  DEMO_USER_ACCOUNT,
} from "@/lib/store/use-auth-store";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { PulseBeacon, springs } from "@/components/motion/MotionWrappers";

interface AuthAccountModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function AuthAccountModal({ open, onClose }: AuthAccountModalProps = {}) {
  const {
    currentUser,
    loginAs,
    loginWithCustomId,
    resetToDemoAccount,
    isAuthModalOpen,
    setAuthModalOpen,
  } = useAuthStore();
  const { projects } = useShelterStore();

  const isOpen = open !== undefined ? open : isAuthModalOpen;
  const handleClose = onClose || (() => setAuthModalOpen(false));

  const [activeTab, setActiveTab] = useState<"profile" | "switch" | "custom">("profile");
  const [customIdInput, setCustomIdInput] = useState("");
  const [customNameInput, setCustomNameInput] = useState("");
  const [customSectorInput, setCustomSectorInput] = useState("Ladakh Forward Sector");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Count shelters owned by current user vs total
  const userOwnedShelters = projects.filter(
    (p) =>
      (p.project?.userId === currentUser.id || (p as any).userId === currentUser.id) &&
      !p.isSystemPreset &&
      !p.project?.isSystemPreset
  );

  const totalVisibleShelters = projects.filter((p) => {
    const isPreset =
      p.isSystemPreset ||
      p.project?.isSystemPreset ||
      p.id.startsWith("shelter-ladakh") ||
      p.id.startsWith("shelter-kargil") ||
      p.id.startsWith("shelter-spiti") ||
      p.id.startsWith("shelter-tawang") ||
      p.id === "shelter-baseline-tin";
    const isOwner = p.project?.userId === currentUser.id || (p as any).userId === currentUser.id;
    return isPreset || isOwner;
  });

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdInput.trim()) {
      setErrorMsg("Please enter an Officer Call Sign or User ID.");
      return;
    }
    setErrorMsg(null);
    loginWithCustomId(
      customIdInput,
      customNameInput || undefined,
      undefined,
      customSectorInput || undefined
    );
    setActiveTab("profile");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={springs.snappy}
        className="relative w-full max-w-2xl rounded-[2.5rem] border border-border bg-card p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.5)] text-foreground overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-6 right-6 h-8 w-8 rounded-full border border-border bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-start gap-4 pr-10 border-b border-border/70 pb-5">
          <div className="size-13 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/25 to-sky-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner shrink-0">
            <ShieldCheck className="size-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <PulseBeacon color="emerald" size="sm" />
                DEFENSE ACCESS CONTROL
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                ISOLATED SHELTER WORKSPACE
              </span>
            </div>
            <h3 className="font-editorial text-2xl font-medium tracking-tight text-foreground mt-1">
              Defense Identity & Shelter Access
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Shelters created in this session are isolated. Other users or field posts cannot access your custom shelter definitions.
            </p>
          </div>
        </div>

        {/* Demo Account Callout Badge */}
        <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="truncate">
              <strong className="text-emerald-800 dark:text-emerald-300 font-semibold">
                Hardcoded Demo Identity Active
              </strong>
              <p className="text-[11px] text-muted-foreground truncate">
                Pre-authenticated for immediate execution. No registration or login credentials needed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetToDemoAccount();
              setActiveTab("profile");
            }}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
          >
            Reset Demo
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 p-1 bg-secondary/50 rounded-2xl w-fit border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Session
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("switch")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "switch"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Switch Defense Post
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "custom"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom Officer ID
          </button>
        </div>

        {/* Tab 1: Active Session Profile */}
        {activeTab === "profile" && (
          <div className="mt-5 space-y-4 animate-in fade-in duration-150">
            {/* User Identity Card */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {currentUser.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentUser.rank} · {currentUser.unit}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Call Sign / ID
                  </div>
                  <div className="font-mono text-xs font-bold text-foreground">
                    {currentUser.id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="p-2.5 rounded-xl bg-card border border-border/70">
                  <span className="text-[10px] text-muted-foreground block">Assigned Sector</span>
                  <span className="font-semibold text-foreground truncate block">{currentUser.sector}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/70">
                  <span className="text-[10px] text-muted-foreground block">Clearance</span>
                  <span className="font-semibold text-foreground truncate block">{currentUser.clearanceLevel}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/70">
                  <span className="text-[10px] text-muted-foreground block">Personal Shelters</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                    {userOwnedShelters.length} custom / {totalVisibleShelters.length} accessible
                  </span>
                </div>
              </div>
            </div>

            {/* Isolation Guarantee Info */}
            <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-xs text-foreground flex items-start gap-2.5">
              <FolderLock className="size-4 text-sky-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px] text-muted-foreground">
                <strong className="text-foreground font-semibold">Shelter Privacy & Isolation:</strong> Any shelter you construct or clone in 2D Designer, 3D CAD, or AI Studio is bound strictly to <code className="font-mono text-foreground font-bold">{currentUser.id}</code>. Other defense posts or engineers cannot inspect your custom designs.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Fast Switch Defense Account (For Testing Isolation) */}
        {activeTab === "switch" && (
          <div className="mt-5 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs text-muted-foreground">
              Select another pre-configured defense post account to test that custom-created shelters remain isolated:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {PRESET_USER_ACCOUNTS.map((acc) => {
                const isSelected = acc.id === currentUser.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      loginAs(acc);
                      setActiveTab("profile");
                    }}
                    className={`text-left p-3 rounded-2xl border text-xs transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40"
                        : "border-border bg-secondary/30 hover:bg-secondary/70 hover:border-[#6E818F]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{acc.name}</span>
                      {isSelected ? (
                        <span className="size-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">{acc.badge}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {acc.rank} · {acc.unit}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                      {acc.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Officer ID Login */}
        {activeTab === "custom" && (
          <form onSubmit={handleCustomLogin} className="mt-5 space-y-3 animate-in fade-in duration-150 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Type any custom ID or Officer Call Sign to open an isolated personal workspace:
            </p>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground block text-[11px]">
                Officer Call Sign / Unique User ID
              </label>
              <input
                type="text"
                placeholder="e.g. OFFICER-NYOMA-09 or MY-CUSTOM-ID"
                value={customIdInput}
                onChange={(e) => setCustomIdInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block text-[11px]">
                  Officer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Captain Anirudh"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block text-[11px]">
                  Sector / Forward Base
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nyoma ALG (4,180m)"
                  value={customSectorInput}
                  onChange={(e) => setCustomSectorInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-foreground text-background font-bold text-xs hover:opacity-90 transition active:scale-95 shadow-sm"
              >
                Access Isolated Workspace &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            Session: {currentUser.id} (Verified Active)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-full border border-border bg-secondary/80 hover:bg-secondary font-semibold text-foreground transition active:scale-95"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

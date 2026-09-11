"use client";

import React, { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShelterModel } from "@/types/shelter";

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ShelterModel[];
  activeProjectId?: string;
  onSaveVersion: (sourceId: string, versionName: string, description: string) => void;
}

export function SaveVersionModal({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSaveVersion,
}: SaveVersionModalProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(activeProjectId || projects[0]?.id || "");
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;

    onSaveVersion(
      selectedSourceId || projects[0]?.id,
      versionName.trim(),
      description.trim()
    );

    setVersionName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      contentClassName="sm:max-w-lg rounded-[2rem] border border-border bg-card p-7 shadow-2xl text-foreground"
    >
      <form onSubmit={handleSave} className="space-y-5">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-foreground shrink-0">
              <Copy className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-editorial text-xl font-medium tracking-tight text-foreground">
                Save / Clone Design Version
              </DialogTitle>
              <DialogDescription className="text-xs text-[#536772] mt-0.5">
                Create an immutable version snapshot of an existing shelter design to compare performance trade-offs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 text-xs">
          {/* Source Project Selector */}
          <div className="space-y-1">
            <label className="micro-label block">Base Shelter Design to Clone:</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project.name} (v{p.project.version})
                </option>
              ))}
            </select>
          </div>

          {/* New Version Name */}
          <div className="space-y-1">
            <label className="micro-label block">New Version Name / Identifier:</label>
            <input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. v2.1 - Triple Glazing & Aerogel Roof"
              required
              className="w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-xs text-foreground placeholder:text-[#6E818F] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-[10px] text-[#6E818F]">
              Specifies the parametric modification or retrofit hypothesis.
            </span>
          </div>

          {/* Optional Engineering Description */}
          <div className="space-y-1">
            <label className="micro-label block">Design Description & Hypothesis:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Increased insulation thickness to 150mm EPS, reduced infiltration from 1.2 to 0.35 ACH with airtight seals."
              className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-xs text-foreground placeholder:text-[#6E818F] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/20 bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#CBDCE6]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!versionName.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles className="size-3.5 text-[#CBDCE6]" />
            <span>Save Version & Queue Simulation</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

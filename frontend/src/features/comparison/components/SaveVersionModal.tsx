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
  projects = [],
  activeProjectId,
  onSaveVersion,
}: SaveVersionModalProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(
    activeProjectId || projects?.[0]?.id || ""
  );
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;

    onSaveVersion(
      selectedSourceId || projects?.[0]?.id || "",
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
      contentClassName="sm:max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <DialogHeader>
          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Copy className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                Save & Clone Design Version
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Create an immutable snapshot of an existing shelter design to compare performance trade-offs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 text-xs">
          {/* Source Project Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground block">Base Shelter Design to Clone</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            >
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project?.name || p.name || p.id} (v{p.project?.version || "1.0"})
                </option>
              ))}
            </select>
          </div>

          {/* New Version Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground block">New Version Name / Identifier</label>
            <input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. v2.1 - Triple Glazing & Aerogel Roof"
              required
              className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            <span className="text-[10px] text-muted-foreground block">
              Specifies the parametric modification or retrofit hypothesis.
            </span>
          </div>

          {/* Optional Engineering Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground block">Design Description & Hypothesis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Increased insulation thickness to 150mm EPS, reduced infiltration from 1.2 to 0.35 ACH with airtight seals."
              className="w-full rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2.5 pt-3 border-t border-border flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!versionName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles className="size-3.5" />
            <span>Save Version & Queue Simulation</span>
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

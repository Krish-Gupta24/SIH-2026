"use client";

import React, { useState } from "react";
import { Copy, Sparkles, Layers, Tag, FileText, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <form onSubmit={handleSave} className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Copy className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Save / Clone as New Design Version
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Create an immutable version snapshot of an existing shelter design to compare performance trade-offs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          {/* Source Project Selector */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Base Shelter Design to Clone:</label>
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            <label className="font-semibold text-slate-300">New Version Name / Identifier:</label>
            <Input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. v2.1 - Triple Glazing & Aerogel Roof"
              required
              className="text-xs border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
            />
            <span className="text-[10px] text-slate-500">
              Specifies the parametric modification or retrofit hypothesis.
            </span>
          </div>

          {/* Optional Engineering Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Design Description & Hypothesis:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Increased insulation thickness to 150mm EPS, reduced infiltration from 1.2 to 0.35 ACH with airtight seals."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!versionName.trim()}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Save Version & Queue Simulation</span>
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

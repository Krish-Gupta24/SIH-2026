"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { ShelterModel } from "@/types/shelter";

interface DeleteProjectModalProps {
  isOpen: boolean;
  project: ShelterModel | null;
  onClose: () => void;
  onConfirm: (projectId: string) => Promise<void> | void;
}

export function DeleteProjectModal({
  isOpen,
  project,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  const projectName = project.project?.name || project.name || project.id;
  const projectRegion = project.location?.region || "High-Altitude";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(project.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        {/* Warning Icon and Header */}
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 border border-red-500/20">
            <Trash2 className="size-5" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">
              Permanent Destruction Warning
            </span>
            <h3 id="delete-project-title" className="text-lg font-semibold tracking-tight text-foreground">
              Delete Shelter Project?
            </h3>
          </div>
        </div>

        {/* Project Context Box */}
        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1">
          <div className="text-xs font-semibold text-foreground truncate">{projectName}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{projectRegion}</span>
            <span>·</span>
            <span className="font-mono text-[10px]">{project.id}</span>
          </div>
        </div>

        {/* Explanation */}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Are you sure you want to delete this shelter project? This action will permanently remove all associated envelope assemblies, thermal materials specifications, and external simulation runs from local and cloud storage.
        </p>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

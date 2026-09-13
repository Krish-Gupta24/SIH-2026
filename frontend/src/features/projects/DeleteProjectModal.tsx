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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Dialog Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-[0.98] duration-200 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <Trash2 className="size-5" />
          </div>

          <div className="space-y-1">
            <h3 id="delete-project-title" className="text-base font-bold tracking-tight text-foreground">
              Delete Shelter Project
            </h3>
            <p className="text-xs text-muted-foreground">
              This action is irreversible and will delete all stored configurations.
            </p>
          </div>
        </div>

        {/* Project Context Box */}
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 space-y-1">
          <div className="text-xs font-semibold text-foreground truncate">{projectName}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{projectRegion}</span>
            <span>·</span>
            <span className="font-mono text-[10px]">{project.id}</span>
          </div>
        </div>

        {/* Explanation */}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Are you sure you want to delete this project? All associated envelope assemblies, thermal materials specifications, and external simulation runs will be permanently removed.
        </p>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
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

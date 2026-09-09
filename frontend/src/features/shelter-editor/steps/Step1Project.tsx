import React, { useState } from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { X, Plus, FolderKanban } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step1Project({ form, advancedMode }: StepProps) {
  const { register, formState: { errors }, watch, setValue } = form;
  const tags = watch("project.tags") || [];
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue("project.tags", [...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue("project.tags", tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Project Identity & Metadata</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define organizational identification, version lineage, and taxonomy for this shelter design.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldWrapper
          label="Project Name"
          tooltip="Descriptive name of the shelter design project."
          error={errors.project?.name?.message}
        >
          <input
            {...register("project.name")}
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="E.g. Ladakh High-Altitude Outpost Shelter"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Shelter Model ID"
          tooltip="Unique canonical identification key for database mapping."
          error={errors.project?.id?.message}
        >
          <input
            {...register("project.id")}
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="shelter-ladakh-01"
          />
        </FieldWrapper>

        <div className="md:col-span-2">
          <FieldWrapper
            label="Design Description"
            tooltip="Detailed architectural context, intended application, and deployment objectives."
            error={errors.project?.description?.message}
          >
            <textarea
              {...register("project.description")}
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Provide technical context, climate resilience objectives, and operational constraints..."
            />
          </FieldWrapper>
        </div>

        <FieldWrapper
          label="Schema Version"
          tooltip="Canonical schema version ensuring data model provenance."
          error={errors.project?.version?.message}
          isAdvanced={!advancedMode}
        >
          <input
            {...register("project.version")}
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="1.0.0"
          />
        </FieldWrapper>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Taxonomy & Tags
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag (e.g. Passive-Solar)"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={addTag}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

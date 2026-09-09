import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { DoorOpen, Plus, Trash2, ShieldCheck } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step8Doors({ form, advancedMode }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const doors = watch("doors") || [];
  const length = watch("geometry.length") || 6.0;
  const width = watch("geometry.width") || 4.0;
  const height = watch("geometry.height") || 3.0;

  const addDoor = () => {
    const nextIdx = doors.length + 1;
    setValue("doors", [
      ...doors,
      {
        id: `door-${nextIdx}`,
        wall: "east",
        positionX: 1.0,
        width: 0.95,
        height: 2.1,
        construction: "Insulated Heavy Timber Door with Dual Weatherstrips",
        airTightness: "HighPerformance_Airtight",
      },
    ]);
  };

  const removeDoor = (index: number) => {
    setValue("doors", doors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <DoorOpen className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Doors & Exterior Ingress</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define entry doors, thermal break constructions, air leakage gaskets, and windbreak airlocks.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {doors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            <DoorOpen className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No doors currently added</p>
            <p className="text-[11px] text-slate-400">Every shelter requires at least one primary entrance door.</p>
            <button
              type="button"
              onClick={addDoor}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Primary Door
            </button>
          </div>
        ) : (
          doors.map((door, idx) => {
            const hostWallLen = (door.wall === "north" || door.wall === "south") ? length : width;
            const exceedsWall = (door.positionX + door.width) > hostWallLen;
            const exceedsHeight = door.height > height;

            return (
              <div
                key={door.id || idx}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                      Door #{idx + 1}
                    </span>
                    <input
                      {...register(`doors.${idx}.id`)}
                      type="text"
                      className="rounded border border-transparent px-2 py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-300 focus:border-red-500 focus:outline-none dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoor(idx)}
                    className="text-slate-400 hover:text-rose-600"
                    title="Remove door"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <FieldWrapper label="Host Wall" tooltip="Cardinal wall hosting this entrance.">
                    <select
                      {...register(`doors.${idx}.wall`)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="east">East (Protected Morning Entry)</option>
                      <option value="south">South (Sunny Entry)</option>
                      <option value="west">West (Afternoon Entry)</option>
                      <option value="north">North (Windward Exposure)</option>
                    </select>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Position Along Wall"
                    unit="m"
                    tooltip="Distance from the left wall corner in meters."
                    warning={exceedsWall ? `Door exceeds host wall length (${hostWallLen}m)` : undefined}
                  >
                    <input
                      {...register(`doors.${idx}.positionX`, { valueAsNumber: true })}
                      type="number"
                      step="0.1"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Width" unit="m" tooltip="Clear door leaf opening width.">
                    <input
                      {...register(`doors.${idx}.width`, { valueAsNumber: true })}
                      type="number"
                      step="0.05"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="Height"
                    unit="m"
                    tooltip="Door vertical height."
                    warning={exceedsHeight ? `Door height exceeds wall height (${height}m)` : undefined}
                  >
                    <input
                      {...register(`doors.${idx}.height`, { valueAsNumber: true })}
                      type="number"
                      step="0.05"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <div className="col-span-2">
                    <FieldWrapper label="Door Construction & Core" tooltip="Insulated core material and thermal transmittance rating.">
                      <input
                        {...register(`doors.${idx}.construction`)}
                        type="text"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </FieldWrapper>
                  </div>

                  <div className="col-span-2">
                    <FieldWrapper label="Airtightness Rating" tooltip="Weatherstrip gaskets and perimeter threshold sealing.">
                      <select
                        {...register(`doors.${idx}.airTightness`)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="HighPerformance_Airtight">High-Performance Airtight (Dual EPDM Compression Gaskets)</option>
                        <option value="Standard">Standard Latch Door (Mild Air Leakage)</option>
                      </select>
                    </FieldWrapper>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {doors.length > 0 && (
          <button
            type="button"
            onClick={addDoor}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Door
          </button>
        )}
      </div>
    </div>
  );
}

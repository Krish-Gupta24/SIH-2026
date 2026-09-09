import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Box, Compass, Triangle } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step3Geometry({ form, advancedMode }: StepProps) {
  const { register, formState: { errors }, watch } = form;

  const length = watch("geometry.length") || 0;
  const width = watch("geometry.width") || 0;
  const height = watch("geometry.height") || 0;
  const orientation = watch("geometry.orientation") || 0;
  const roofType = watch("geometry.roofType");
  const roofAngle = watch("geometry.roofAngle") || 0;

  // Computed geometric values
  const floorArea = (length * width).toFixed(2);
  const baseWallArea = (2 * length * height + 2 * width * height).toFixed(2);
  const volume = (length * width * height).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">3D Geometry & Spatial Dimensions</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define canonical external dimensions, orientation azimuth, roof profile, and structural form.
          </p>
        </div>
      </div>

      {/* Live Calculated Geometric Summary Card */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3.5 sm:grid-cols-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Floor Area</span>
          <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">{floorArea} m²</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gross Wall Area</span>
          <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">{baseWallArea} m²</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Enclosed Air Volume</span>
          <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">{volume} m³</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Aspect Ratio (L/W)</span>
          <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">
            {width > 0 ? (length / width).toFixed(2) : "1.00"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldWrapper
          label="Length (East-West axis when orientation = 0°)"
          unit="m"
          tooltip="Primary longitudinal exterior wall dimension in meters."
          error={errors.geometry?.length?.message}
          warning={length < 2.0 ? "Very small length (<2m) may restrict occupant space." : undefined}
        >
          <input
            {...register("geometry.length", { valueAsNumber: true })}
            type="number"
            step="0.1"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Width (North-South axis when orientation = 0°)"
          unit="m"
          tooltip="Transverse exterior wall dimension in meters."
          error={errors.geometry?.width?.message}
        >
          <input
            {...register("geometry.width", { valueAsNumber: true })}
            type="number"
            step="0.1"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Clear Wall Height"
          unit="m"
          tooltip="Floor to eaves ceiling height in meters."
          error={errors.geometry?.height?.message}
        >
          <input
            {...register("geometry.height", { valueAsNumber: true })}
            type="number"
            step="0.1"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Orientation Azimuth Angle"
          unit="°"
          tooltip="Rotation angle from True North. 0° = North, 90° = East, 180° = South. High passive solar gain is typically achieved facing 180° South in the Northern Hemisphere."
          error={errors.geometry?.orientation?.message}
          warning={orientation >= 45 && orientation <= 135 ? "East-facing shelters receive morning solar peaks and cold afternoons." : undefined}
        >
          <div className="space-y-1">
            <input
              {...register("geometry.orientation", { valueAsNumber: true })}
              type="number"
              min="0"
              max="359"
              step="1"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="range"
              min="0"
              max="359"
              value={orientation}
              onChange={(e) => form.setValue("geometry.orientation", Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
            />
          </div>
        </FieldWrapper>

        <FieldWrapper
          label="Roof Topology"
          tooltip="Flat (horizontal), Shed (monopitch slope), or Gable (symmetric dual pitch)."
          error={errors.geometry?.roofType?.message}
        >
          <select
            {...register("geometry.roofType")}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="Flat">Flat Roof (0° pitch)</option>
            <option value="Shed">Shed Roof (Monopitch)</option>
            <option value="Gable">Gable Roof (Dual Pitch)</option>
          </select>
        </FieldWrapper>

        <FieldWrapper
          label="Roof Pitch Angle"
          unit="°"
          tooltip="Slope angle in degrees. In snowy high-altitude zones, 25°–40° sheds snow accumulation."
          error={errors.geometry?.roofAngle?.message}
          warning={roofType !== "Flat" && roofAngle < 15 ? "Low slope (<15°) in heavy snow regions risks structural snow loading." : undefined}
        >
          <input
            {...register("geometry.roofAngle", { valueAsNumber: true })}
            type="number"
            step="1"
            min="0"
            max="80"
            disabled={roofType === "Flat"}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
          />
        </FieldWrapper>

        {advancedMode && (
          <FieldWrapper
            label="Floor Elevation Above Grade"
            unit="m"
            tooltip="Distance from native ground grade to finished floor surface. Elevated stilt designs mitigate permafrost thaw."
            isAdvanced={true}
          >
            <input
              {...register("geometry.floorElevation", { valueAsNumber: true })}
              type="number"
              step="0.05"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </FieldWrapper>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import type { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";
import { calculateAssemblyUValue } from "@/features/shelter-3d/thermal-physics";
import {
  Printer,
  Compass,
  MapPin,
  ShieldCheck,
  Layers,
  ChevronDown,
  Maximize2,
  Minimize2,
  Sparkles,
  FileText,
  Sliders,
  Sun,
  Grid,
} from "lucide-react";

interface ArchitecturalPlanSheetProps {
  model: ShelterModel;
  onSelectView?: (view: string) => void;
  compactMode?: boolean;
}

export type SheetViewMode =
  | "consolidated"
  | "plan"
  | "front"
  | "rear"
  | "side"
  | "section"
  | "schedule";

export function ArchitecturalPlanSheet({
  model,
  onSelectView,
  compactMode = false,
}: ArchitecturalPlanSheetProps) {
  const [activeView, setActiveView] = useState<SheetViewMode>("consolidated");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Geometry dimensions in meters
  const L = Math.max(2.0, model.geometry?.length || 8.0);
  const W = Math.max(2.0, model.geometry?.width || 4.8);
  const H = Math.max(2.0, model.geometry?.height || 2.4);
  const roofType = model.geometry?.roofType || "Flat";
  const roofAngle = Math.max(0, model.geometry?.roofAngle || 0);
  const overhang = typeof model.envelope?.roof?.overhang === "number" ? model.envelope.roof.overhang : 0.4;
  const orientation = model.geometry?.orientation || 0;

  // Roof pitch delta height calculation
  const rad = (roofAngle * Math.PI) / 180;
  const shedRise = roofType === "Shed" && roofAngle > 0 ? W * Math.tan(rad) : 0;
  const gableRise = roofType === "Gable" && roofAngle > 0 ? 0.5 * W * Math.tan(rad) : 0;
  const peakHeight = roofType === "Shed" ? H + shedRise : roofType === "Gable" ? H + gableRise : H + 0.35;

  // Real envelope U-values
  const southWallRes = useMemo(
    () => calculateAssemblyUValue(model.envelope?.walls?.south?.layers, "wall"),
    [model.envelope?.walls?.south?.layers]
  );
  const northWallRes = useMemo(
    () => calculateAssemblyUValue(model.envelope?.walls?.north?.layers, "wall"),
    [model.envelope?.walls?.north?.layers]
  );
  const roofRes = useMemo(
    () => calculateAssemblyUValue(model.envelope?.roof?.layers, "roof"),
    [model.envelope?.roof?.layers]
  );
  const floorRes = useMemo(
    () => calculateAssemblyUValue(model.envelope?.floor?.layers, "floor"),
    [model.envelope?.floor?.layers]
  );

  // Apertures & Openings
  const windows = model.windows || [];
  const doors = model.doors || [];
  const northWindows = windows.filter((w) => w.wall === "north");
  const southWindows = windows.filter((w) => w.wall === "south");
  const eastWindows = windows.filter((w) => w.wall === "east");
  const westWindows = windows.filter((w) => w.wall === "west");

  const northDoors = doors.filter((d) => d.wall === "north");
  const southDoors = doors.filter((d) => d.wall === "south");
  const eastDoors = doors.filter((d) => d.wall === "east");
  const westDoors = doors.filter((d) => d.wall === "west");

  const totalGlazingArea = windows.reduce(
    (acc, w) => acc + (w.width || 1.2) * (w.height || 1.2),
    0
  );
  const grossWallArea = 2 * (L * H) + 2 * (W * H);
  const wwr = grossWallArea > 0 ? ((totalGlazingArea / grossWallArea) * 100).toFixed(1) : "0.0";

  // Winter solstice solar angle for site latitude
  const lat = model.location?.latitude || 34.2;
  const winterSolsticeSunAngle = Math.max(18, Math.min(48, Math.round(90 - lat - 23.45)));

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 font-sans print:p-0 print:m-0 print:border-none print:shadow-none ${
        isFullscreen
          ? "fixed inset-0 z-50 overflow-y-auto bg-slate-900/95 p-4 sm:p-6 backdrop-blur-md"
          : "relative"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          SCREEN ONLY: Toolbar & Interactive Controls
          ──────────────────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/80 p-2 text-xs shadow-xs backdrop-blur-sm">
        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => { setActiveView("consolidated"); onSelectView?.("consolidated"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "consolidated"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Consolidated (1:100)
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("plan"); onSelectView?.("plan"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "plan"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Floor Plan (1:50)
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("front"); onSelectView?.("front"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "front"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Front (North)
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("rear"); onSelectView?.("rear"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "rear"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Rear (South Solar)
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("side"); onSelectView?.("side"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "side"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Side Elevations
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("section"); onSelectView?.("section"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "section"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Cross-Section
          </button>
          <button
            type="button"
            onClick={() => { setActiveView("schedule"); onSelectView?.("schedule"); }}
            className={`rounded-xl px-3 py-1.5 font-semibold transition ${
              activeView === "schedule"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Materials & U-Values
          </button>
        </div>

        {/* Live Telemetry Chips & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground">
            <Compass className="size-3 text-sky-500" />
            <span>{orientation}° Azimuth</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3" />
            <span>U-Wall: {southWallRes.uValue} W/m²K</span>
          </span>

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Sun className="size-3" />
            <span>WWR {wwr}%</span>
          </span>

          {/* Print All Views Action Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-bold text-background transition hover:opacity-90 shadow-xs"
            title="Print complete multi-view architectural drawing set"
          >
            <Printer className="size-3.5" />
            <span>Print Sheet (All Views)</span>
          </button>

          {/* Fullscreen Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Studio Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SCREEN VIEW: Interactive Architectural Drafting Plate
          ──────────────────────────────────────────────────────────── */}
      <div className="no-print relative overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-2 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="min-w-[760px] max-w-[1240px] mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 sm:p-6 shadow-sm text-slate-800 dark:text-slate-100">
          {/* Inner Engineering Drafting Border */}
          <div className="border border-slate-400 dark:border-slate-600 p-4 sm:p-6 rounded-lg space-y-6">
            {/* View 1: Consolidated Master Sheet */}
            {activeView === "consolidated" && (
              <div className="space-y-6">
                {/* Upper Grid: Front Elevation (North) & Material Specifications */}
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-8 space-y-2">
                    <SheetSubHeader
                      title="FRONT ELEVATION — NORTH WINDWARD FACADE"
                      sheet="CIV-EL-001"
                      scale="1:100"
                    />
                    <NorthElevationSvg
                      length={L}
                      height={H}
                      roofType={roofType}
                      roofAngle={roofAngle}
                      overhang={overhang}
                      windows={northWindows}
                      doors={northDoors}
                    />
                  </div>

                  <div className="col-span-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[10px] dark:border-slate-800 dark:bg-slate-950/60">
                    <MaterialReferenceSchedule
                      southWallU={southWallRes.uValue}
                      northWallU={northWallRes.uValue}
                      roofU={roofRes.uValue}
                      floorU={floorRes.uValue}
                      windows={windows}
                    />
                  </div>
                </div>

                {/* Middle Grid: Rear Elevation (South Passive Solar Facade) */}
                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <SheetSubHeader
                    title="REAR ELEVATION — SOUTH FACING (PASSIVE SOLAR GAIN APERTURE)"
                    sheet="CIV-EL-002"
                    scale="1:100"
                  />
                  <SouthElevationSvg
                    length={L}
                    height={H}
                    roofType={roofType}
                    roofAngle={roofAngle}
                    overhang={overhang}
                    solarAngle={winterSolsticeSunAngle}
                    windows={southWindows}
                    doors={southDoors}
                  />
                </div>

                {/* Lower Grid: Side Elevations (East & West) */}
                <div className="grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="space-y-2">
                    <SheetSubHeader
                      title="SIDE ELEVATION — EAST ORIENTATION"
                      sheet="CIV-EL-003"
                      scale="1:100"
                    />
                    <SideElevationSvg
                      width={W}
                      height={H}
                      roofType={roofType}
                      roofAngle={roofAngle}
                      overhang={overhang}
                      orientation="East"
                      windows={eastWindows}
                      doors={eastDoors}
                    />
                  </div>

                  <div className="space-y-2">
                    <SheetSubHeader
                      title="SIDE ELEVATION — WEST ORIENTATION"
                      sheet="CIV-EL-004"
                      scale="1:100"
                    />
                    <SideElevationSvg
                      width={W}
                      height={H}
                      roofType={roofType}
                      roofAngle={roofAngle}
                      overhang={overhang}
                      orientation="West"
                      windows={westWindows}
                      doors={westDoors}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Floor Plan */}
            {activeView === "plan" && (
              <div className="space-y-4">
                <SheetSubHeader
                  title="ARCHITECTURAL GROUND FLOOR PLAN (1:50) — HABITABLE LIVING CORE"
                  sheet="CIV-PL-001"
                  scale="1:50"
                />
                <FloorPlanSvg
                  length={L}
                  width={W}
                  height={H}
                  windows={windows}
                  doors={doors}
                  hasThermalMass={Boolean(model.thermalMass && model.thermalMass.length > 0)}
                />
              </div>
            )}

            {/* View 3: North Elevation */}
            {activeView === "front" && (
              <div className="space-y-4">
                <SheetSubHeader
                  title="NORTH ELEVATION — WINDWARD AIRTIGHT DEFENCE APERTURE"
                  sheet="CIV-EL-001"
                  scale="1:50"
                />
                <NorthElevationSvg
                  length={L}
                  height={H}
                  roofType={roofType}
                  roofAngle={roofAngle}
                  overhang={overhang}
                  windows={northWindows}
                  doors={northDoors}
                  scaleFactor={1.3}
                />
              </div>
            )}

            {/* View 4: South Elevation */}
            {activeView === "rear" && (
              <div className="space-y-4">
                <SheetSubHeader
                  title="SOUTH ELEVATION — PASSIVE SOLAR HEATING & CLERESTORY"
                  sheet="CIV-EL-002"
                  scale="1:50"
                />
                <SouthElevationSvg
                  length={L}
                  height={H}
                  roofType={roofType}
                  roofAngle={roofAngle}
                  overhang={overhang}
                  solarAngle={winterSolsticeSunAngle}
                  windows={southWindows}
                  doors={southDoors}
                  scaleFactor={1.3}
                />
              </div>
            )}

            {/* View 5: Side Elevations */}
            {activeView === "side" && (
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <SheetSubHeader
                    title="EAST ELEVATION (CIV-EL-003)"
                    sheet="CIV-EL-003"
                    scale="1:50"
                  />
                  <SideElevationSvg
                    width={W}
                    height={H}
                    roofType={roofType}
                    roofAngle={roofAngle}
                    overhang={overhang}
                    orientation="East"
                    windows={eastWindows}
                    doors={eastDoors}
                    scaleFactor={1.25}
                  />
                </div>
                <div className="space-y-2">
                  <SheetSubHeader
                    title="WEST ELEVATION (CIV-EL-004)"
                    sheet="CIV-EL-004"
                    scale="1:50"
                  />
                  <SideElevationSvg
                    width={W}
                    height={H}
                    roofType={roofType}
                    roofAngle={roofAngle}
                    overhang={overhang}
                    orientation="West"
                    windows={westWindows}
                    doors={westDoors}
                    scaleFactor={1.25}
                  />
                </div>
              </div>
            )}

            {/* View 6: Technical Cross-Section */}
            {activeView === "section" && (
              <div className="space-y-4">
                <SheetSubHeader
                  title="TRANSVERSE BUILDING SECTION (1:50) — COMPOSITE THERMAL ENVELOPE"
                  sheet="CIV-SEC-001"
                  scale="1:50"
                />
                <TechnicalSectionSvg
                  length={L}
                  width={W}
                  height={H}
                  roofType={roofType}
                  roofAngle={roofAngle}
                  uWall={southWallRes.uValue}
                  uRoof={roofRes.uValue}
                  uFloor={floorRes.uValue}
                />
              </div>
            )}

            {/* View 7: Materials & Thermal Schedule */}
            {activeView === "schedule" && (
              <div className="space-y-6">
                <SheetSubHeader
                  title="MATERIAL REFERENCE SCHEDULE & ENVELOPE PERFORMANCE MATRIX"
                  sheet="CIV-SCH-001"
                  scale="N.T.S."
                />
                <MaterialReferenceSchedule
                  southWallU={southWallRes.uValue}
                  northWallU={northWallRes.uValue}
                  roofU={roofRes.uValue}
                  floorU={floorRes.uValue}
                  windows={windows}
                  detailedMode={true}
                />
              </div>
            )}

            {/* Modernist Engineering Title Block */}
            <ModernArchitecturalTitleBlock
              model={model}
              length={L}
              width={W}
              height={H}
              peakHeight={peakHeight}
              roofType={roofType}
              roofAngle={roofAngle}
              orientation={orientation}
              winterSolsticeSunAngle={winterSolsticeSunAngle}
              southWallU={southWallRes.uValue}
              roofU={roofRes.uValue}
              floorU={floorRes.uValue}
              totalGlazingArea={totalGlazingArea}
              wwr={wwr}
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRINT ONLY: Complete Multi-View Architectural Drawing Set
          Prints ALL views across formatted sheets with clean page breaks!
          ──────────────────────────────────────────────────────────── */}
      <div className="hidden print:block print:w-full font-mono text-slate-900 bg-white">
        {/* PRINT SHEET 1: Architectural Floor Plan (1:50) + Site Telemetry */}
        <div className="print-page border-2 border-slate-900 p-6 min-h-[95vh] flex flex-col justify-between" style={{ breakAfter: "page", pageBreakAfter: "always" }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm tracking-widest uppercase">
                SHEET 01 / 05 — ARCHITECTURAL GROUND FLOOR PLAN (1:50)
              </span>
              <span className="text-xs font-semibold">DRAWING NO: CIV-PL-001</span>
            </div>
            <FloorPlanSvg
              length={L}
              width={W}
              height={H}
              windows={windows}
              doors={doors}
              hasThermalMass={Boolean(model.thermalMass && model.thermalMass.length > 0)}
              scaleFactor={1.3}
            />
          </div>
          <ModernArchitecturalTitleBlock
            model={model}
            length={L}
            width={W}
            height={H}
            peakHeight={peakHeight}
            roofType={roofType}
            roofAngle={roofAngle}
            orientation={orientation}
            winterSolsticeSunAngle={winterSolsticeSunAngle}
            southWallU={southWallRes.uValue}
            roofU={roofRes.uValue}
            floorU={floorRes.uValue}
            totalGlazingArea={totalGlazingArea}
            wwr={wwr}
            sheetNo="A-101"
            sheetTitle="GROUND FLOOR PLAN & ORIENTATION"
          />
        </div>

        {/* PRINT SHEET 2: North & South Elevations */}
        <div className="print-page border-2 border-slate-900 p-6 min-h-[95vh] flex flex-col justify-between" style={{ breakAfter: "page", pageBreakAfter: "always" }}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm tracking-widest uppercase">
                SHEET 02 / 05 — LONGITUDINAL ELEVATIONS (NORTH & SOUTH)
              </span>
              <span className="text-xs font-semibold">DRAWING NO: CIV-EL-001 / 002</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider block">FRONT ELEVATION (NORTH FACADE · WINDWARD BUFFER)</span>
              <NorthElevationSvg
                length={L}
                height={H}
                roofType={roofType}
                roofAngle={roofAngle}
                overhang={overhang}
                windows={northWindows}
                doors={northDoors}
                scaleFactor={1.15}
              />
            </div>

            <div className="space-y-2 border-t border-slate-400 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider block">REAR ELEVATION (SOUTH FACADE · PASSIVE SOLAR APERTURE)</span>
              <SouthElevationSvg
                length={L}
                height={H}
                roofType={roofType}
                roofAngle={roofAngle}
                overhang={overhang}
                solarAngle={winterSolsticeSunAngle}
                windows={southWindows}
                doors={southDoors}
                scaleFactor={1.15}
              />
            </div>
          </div>
          <ModernArchitecturalTitleBlock
            model={model}
            length={L}
            width={W}
            height={H}
            peakHeight={peakHeight}
            roofType={roofType}
            roofAngle={roofAngle}
            orientation={orientation}
            winterSolsticeSunAngle={winterSolsticeSunAngle}
            southWallU={southWallRes.uValue}
            roofU={roofRes.uValue}
            floorU={floorRes.uValue}
            totalGlazingArea={totalGlazingArea}
            wwr={wwr}
            sheetNo="A-102"
            sheetTitle="NORTH & SOUTH ELEVATIONS"
          />
        </div>

        {/* PRINT SHEET 3: East & West Side Elevations */}
        <div className="print-page border-2 border-slate-900 p-6 min-h-[95vh] flex flex-col justify-between" style={{ breakAfter: "page", pageBreakAfter: "always" }}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm tracking-widest uppercase">
                SHEET 03 / 05 — TRANSVERSE SIDE ELEVATIONS (EAST & WEST)
              </span>
              <span className="text-xs font-semibold">DRAWING NO: CIV-EL-003 / 004</span>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider block text-center">EAST ELEVATION</span>
                <SideElevationSvg
                  width={W}
                  height={H}
                  roofType={roofType}
                  roofAngle={roofAngle}
                  overhang={overhang}
                  orientation="East"
                  windows={eastWindows}
                  doors={eastDoors}
                  scaleFactor={1.3}
                />
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider block text-center">WEST ELEVATION</span>
                <SideElevationSvg
                  width={W}
                  height={H}
                  roofType={roofType}
                  roofAngle={roofAngle}
                  overhang={overhang}
                  orientation="West"
                  windows={westWindows}
                  doors={westDoors}
                  scaleFactor={1.3}
                />
              </div>
            </div>
          </div>
          <ModernArchitecturalTitleBlock
            model={model}
            length={L}
            width={W}
            height={H}
            peakHeight={peakHeight}
            roofType={roofType}
            roofAngle={roofAngle}
            orientation={orientation}
            winterSolsticeSunAngle={winterSolsticeSunAngle}
            southWallU={southWallRes.uValue}
            roofU={roofRes.uValue}
            floorU={floorRes.uValue}
            totalGlazingArea={totalGlazingArea}
            wwr={wwr}
            sheetNo="A-103"
            sheetTitle="EAST & WEST SIDE ELEVATIONS"
          />
        </div>

        {/* PRINT SHEET 4: Transverse Technical Cross-Section */}
        <div className="print-page border-2 border-slate-900 p-6 min-h-[95vh] flex flex-col justify-between" style={{ breakAfter: "page", pageBreakAfter: "always" }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm tracking-widest uppercase">
                SHEET 04 / 05 — TRANSVERSE TECHNICAL CROSS-SECTION (1:50)
              </span>
              <span className="text-xs font-semibold">DRAWING NO: CIV-SEC-001</span>
            </div>

            <TechnicalSectionSvg
              length={L}
              width={W}
              height={H}
              roofType={roofType}
              roofAngle={roofAngle}
              uWall={southWallRes.uValue}
              uRoof={roofRes.uValue}
              uFloor={floorRes.uValue}
              scaleFactor={1.15}
            />
          </div>
          <ModernArchitecturalTitleBlock
            model={model}
            length={L}
            width={W}
            height={H}
            peakHeight={peakHeight}
            roofType={roofType}
            roofAngle={roofAngle}
            orientation={orientation}
            winterSolsticeSunAngle={winterSolsticeSunAngle}
            southWallU={southWallRes.uValue}
            roofU={roofRes.uValue}
            floorU={floorRes.uValue}
            totalGlazingArea={totalGlazingArea}
            wwr={wwr}
            sheetNo="A-104"
            sheetTitle="TRANSVERSE ENVELOPE SECTION"
          />
        </div>

        {/* PRINT SHEET 5: Materials Reference Schedule & Performance Matrix */}
        <div className="print-page border-2 border-slate-900 p-6 min-h-[95vh] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm tracking-widest uppercase">
                SHEET 05 / 05 — MATERIAL REFERENCE SCHEDULE & SPECIFICATIONS
              </span>
              <span className="text-xs font-semibold">DRAWING NO: CIV-SCH-001</span>
            </div>

            <MaterialReferenceSchedule
              southWallU={southWallRes.uValue}
              northWallU={northWallRes.uValue}
              roofU={roofRes.uValue}
              floorU={floorRes.uValue}
              windows={windows}
              detailedMode={true}
            />
          </div>
          <ModernArchitecturalTitleBlock
            model={model}
            length={L}
            width={W}
            height={H}
            peakHeight={peakHeight}
            roofType={roofType}
            roofAngle={roofAngle}
            orientation={orientation}
            winterSolsticeSunAngle={winterSolsticeSunAngle}
            southWallU={southWallRes.uValue}
            roofU={roofRes.uValue}
            floorU={floorRes.uValue}
            totalGlazingArea={totalGlazingArea}
            wwr={wwr}
            sheetNo="A-105"
            sheetTitle="MATERIAL SPECIFICATIONS & SCHEDULE"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sheet Sub-Header Bar (Minimalist Architectural CAD Style)
   ──────────────────────────────────────────────────────────── */
function SheetSubHeader({
  title,
  sheet,
  scale,
}: {
  title: string;
  sheet: string;
  scale: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-300 dark:border-slate-700 pb-1.5 mb-2">
      <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
        {title}
      </span>
      <span className="text-slate-500 text-[10px]">
        {sheet} · SCALE {scale}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Modernist Architectural Title Block
   Clean, contemporary engineering format (Foster/BIG modernist BIM style)
   ──────────────────────────────────────────────────────────── */
function ModernArchitecturalTitleBlock({
  model,
  length,
  width,
  height,
  peakHeight,
  roofType,
  roofAngle,
  orientation,
  winterSolsticeSunAngle,
  southWallU,
  roofU,
  floorU,
  totalGlazingArea,
  wwr,
  sheetNo = "A-100",
  sheetTitle = "CONSOLIDATED ARCHITECTURAL CAD PLATE",
}: {
  model: ShelterModel;
  length: number;
  width: number;
  height: number;
  peakHeight: number;
  roofType: string;
  roofAngle: number;
  orientation: number;
  winterSolsticeSunAngle: number;
  southWallU: number;
  roofU: number;
  floorU: number;
  totalGlazingArea: number;
  wwr: string;
  sheetNo?: string;
  sheetTitle?: string;
}) {
  const floorArea = (length * width).toFixed(1);
  const volume = (length * width * height).toFixed(1);
  const region = model.location?.region || "Siachen Sector, Ladakh";
  const elevation = model.location?.elevation || 3500;

  return (
    <div className="grid grid-cols-12 border-t-2 border-slate-800 dark:border-slate-200 pt-3 text-[10px] font-mono gap-2 text-slate-800 dark:text-slate-200">
      {/* Col 1: Project Identity & Typology */}
      <div className="col-span-4 border-r border-slate-300 dark:border-slate-700 pr-3 space-y-1">
        <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">PROJECT</p>
        <p className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100 truncate">
          {model.project?.name || "HIMALAYAN DEFENCE SHELTER"}
        </p>
        <p className="text-[9px] text-slate-600 dark:text-slate-400">
          AERODYNAMIC HIGH-ALTITUDE PASSIVE CLIMATIC ENVELOPE
        </p>
        <div className="pt-1.5 flex flex-wrap gap-2 text-[9px] text-slate-500">
          <span>LOC: {region} ({elevation}m AMSL)</span>
          <span>LAT: {model.location?.latitude || 34.2}°N</span>
        </div>
      </div>

      {/* Col 2: Drawing Title & Sheet Metadata */}
      <div className="col-span-3 border-r border-slate-300 dark:border-slate-700 px-3 space-y-1">
        <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">DRAWING TITLE</p>
        <p className="font-bold text-[11px] text-slate-900 dark:text-slate-100 uppercase">
          {sheetTitle}
        </p>
        <div className="flex items-center justify-between text-[9px] text-slate-600 dark:text-slate-400 pt-1">
          <span>SHEET: <strong className="text-slate-900 dark:text-slate-100">{sheetNo}</strong></span>
          <span>REV: <strong>P3.0</strong></span>
          <span>DATE: <strong>2026-09-24</strong></span>
        </div>
        <p className="text-[8px] text-blue-600 dark:text-blue-400 font-bold pt-0.5">
          CAD ENGINE: THERMOSHELTER CAD STUDIO
        </p>
      </div>

      {/* Col 3: Orientation Compass & Solar Angle */}
      <div className="col-span-2 border-r border-slate-300 dark:border-slate-700 px-2 flex flex-col items-center justify-center text-center">
        <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-1">ORIENTATION</p>
        <svg className="size-9" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="3 2" />
          <polygon points="50,12 44,50 50,45 56,50" fill="currentColor" />
          <polygon points="50,88 44,50 50,45 56,50" fill="#94a3b8" />
          <text x="50" y="10" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor">N</text>
          <text x="50" y="99" textAnchor="middle" fontSize="9" fill="currentColor">S</text>
        </svg>
        <span className="text-[8px] font-bold mt-0.5">{orientation}° S · SOLAR {winterSolsticeSunAngle}°</span>
      </div>

      {/* Col 4: Key Envelope Metrics */}
      <div className="col-span-3 pl-2 space-y-0.5 text-[8px] text-slate-600 dark:text-slate-400">
        <p className="font-bold text-slate-900 dark:text-slate-100 text-[9px] uppercase">
          PERFORMANCE TARGETS
        </p>
        <div className="flex justify-between">
          <span>Habitable Area / Vol:</span>
          <strong>{floorArea} m² / {volume} m³</strong>
        </div>
        <div className="flex justify-between">
          <span>Roof Geometry:</span>
          <strong>{roofType} ({roofAngle}° pitch · {peakHeight.toFixed(2)}m)</strong>
        </div>
        <div className="flex justify-between">
          <span>U-Wall / U-Roof:</span>
          <strong>{southWallU} / {roofU} W/m²K</strong>
        </div>
        <div className="flex justify-between">
          <span>Solar Glazing (WWR):</span>
          <strong>{totalGlazingArea.toFixed(1)} m² ({wwr}%)</strong>
        </div>
        <p className="text-[7.5px] text-emerald-600 dark:text-emerald-400 font-bold pt-0.5">
          STANDARD: IS 3792 / NBC 2016 PASSIVE COLD CLIMATE
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   North Elevation SVG Component
   Accurately renders Gable / Shed / Flat roof and parametric openings
   ──────────────────────────────────────────────────────────── */
function NorthElevationSvg({
  length,
  height,
  roofType,
  roofAngle,
  overhang,
  windows,
  doors,
  scaleFactor = 1.0,
}: {
  length: number;
  height: number;
  roofType: string;
  roofAngle: number;
  overhang: number;
  windows: WindowModel[];
  doors: DoorModel[];
  scaleFactor?: number;
}) {
  const svgW = 600 * scaleFactor;
  const svgH = 220 * scaleFactor;
  const groundY = 175 * scaleFactor;

  // Scale: 1 meter = 45px * scaleFactor
  const pxPerMeter = (360 / 8.0) * scaleFactor;
  const wallW = length * pxPerMeter;
  const wallH = height * pxPerMeter;
  const startX = (svgW - wallW) / 2;
  const topWallY = groundY - wallH;

  // Roof profile calculations
  const rad = (roofAngle * Math.PI) / 180;
  const eavePx = overhang * pxPerMeter;

  // Roof geometry path
  let roofPoints = "";
  if (roofType === "Flat") {
    // Parapet trim
    roofPoints = `M ${startX - eavePx} ${topWallY - 14 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY - 14 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY} L ${startX - eavePx} ${topWallY} Z`;
  } else if (roofType === "Shed") {
    // Monopitch: low side at North eaves (or horizontal eave cut)
    roofPoints = `M ${startX - eavePx} ${topWallY - 8 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY - 8 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY} L ${startX - eavePx} ${topWallY} Z`;
  } else if (roofType === "Gable") {
    // Gable longitudinal view: horizontal eaves line with eaves fascia
    roofPoints = `M ${startX - eavePx} ${topWallY - 10 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY - 10 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY} L ${startX - eavePx} ${topWallY} Z`;
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-mono">
      <defs>
        {/* Subtle architectural hatching */}
        <pattern id="north-panel-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="glass-glare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* Ground line datum */}
      <line x1="15" y1={groundY} x2={svgW - 15} y2={groundY} stroke="#334155" strokeWidth="1.8" />
      <text x={svgW - 85} y={groundY - 5} fontSize="7" fill="#64748b" fontWeight="bold">±0.00m FFL</text>

      {/* Eaves datum line */}
      <line x1="15" y1={topWallY} x2={svgW - 15} y2={topWallY} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.8" />
      <text x={svgW - 85} y={topWallY - 4} fontSize="7" fill="#64748b">+{height.toFixed(2)}m EAVES</text>

      {/* Main North Wall Body */}
      <rect
        x={startX}
        y={topWallY}
        width={wallW}
        height={wallH}
        fill="#f8fafc"
        stroke="#1e293b"
        strokeWidth="1.6"
      />
      <rect
        x={startX}
        y={topWallY}
        width={wallW}
        height={wallH}
        fill="url(#north-panel-grid)"
      />

      {/* Roof Fascia & Overhang */}
      <path d={roofPoints} fill="#334155" stroke="#0f172a" strokeWidth="1.4" />

      {/* Wall Vertical Panel Joint Lines */}
      {[0.25, 0.5, 0.75].map((pct, idx) => (
        <line
          key={`joint-${idx}`}
          x1={startX + wallW * pct}
          y1={topWallY}
          x2={startX + wallW * pct}
          y2={groundY}
          stroke="#cbd5e1"
          strokeWidth="0.6"
          strokeDasharray="4 2"
        />
      ))}

      {/* Dynamic Doors on North Facade */}
      {doors.map((door, idx) => {
        const dW = (door.width || 0.95) * pxPerMeter;
        const dH = (door.height || 2.1) * pxPerMeter;
        const dX = startX + (door.positionX || 1.0) * pxPerMeter;
        const dY = groundY - dH;

        return (
          <g key={`door-${door.id || idx}`}>
            {/* Door Frame */}
            <rect
              x={dX}
              y={dY}
              width={dW}
              height={dH}
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="1.2"
            />
            {/* Door Panel Inset */}
            <rect
              x={dX + 3}
              y={dY + 3}
              width={dW - 6}
              height={dH - 4}
              fill="#92400e"
              stroke="#451a03"
              strokeWidth="0.8"
            />
            {/* Airtight Seal Kickplate */}
            <rect
              x={dX + 3}
              y={groundY - 10}
              width={dW - 6}
              height="8"
              fill="#d97706"
            />
            {/* Door Handle */}
            <circle cx={dX + dW - 8} cy={dY + dH * 0.52} r="2.2" fill="#fde047" stroke="#451a03" strokeWidth="0.5" />
            <text x={dX + dW / 2} y={dY - 4} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#78350f">
              DOOR {door.width}x{door.height}m
            </text>
          </g>
        );
      })}

      {/* Dynamic Windows on North Facade */}
      {windows.map((win, idx) => {
        const wW = (win.width || 1.2) * pxPerMeter;
        const wH = (win.height || 1.2) * pxPerMeter;
        const wSill = (win.sillHeight || 0.9) * pxPerMeter;
        const wX = startX + (win.positionX || 2.0) * pxPerMeter;
        const wY = groundY - wSill - wH;

        return (
          <g key={`win-${win.id || idx}`}>
            {/* Window Outer Insulated Frame */}
            <rect
              x={wX - 2}
              y={wY - 2}
              width={wW + 4}
              height={wH + 4}
              fill="#1e293b"
              stroke="#0f172a"
              strokeWidth="1"
            />
            {/* Glazing Pane */}
            <rect
              x={wX}
              y={wY}
              width={wW}
              height={wH}
              fill="url(#glass-glare)"
              stroke="#0284c7"
              strokeWidth="1"
            />
            {/* Center Mullion if wide */}
            {wW > 25 && (
              <line x1={wX + wW / 2} y1={wY} x2={wX + wW / 2} y2={wY + wH} stroke="#1e293b" strokeWidth="0.8" />
            )}
            <text x={wX + wW / 2} y={wY - 4} textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0369a1">
              W-{idx + 1} ({win.width}x{win.height}m)
            </text>
          </g>
        );
      })}

      {/* Dimension Line across Base */}
      <ArchitecturalDimension
        x1={startX}
        y1={groundY + 18}
        x2={startX + wallW}
        y2={groundY + 18}
        text={`${length.toFixed(2)}m OVERALL LENGTH`}
      />

      {/* Human Silhouette for Scale (1.8m) */}
      <HumanScaleSilhouette x={startX - 18} y={groundY} scale={0.3} />

      {/* Architectural Scale Bar */}
      <ScaleBar x={startX + wallW / 2 - 35} y={groundY + 34} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   South Elevation SVG Component
   Accurately renders passive solar apertures and winter solstice sun ray
   ──────────────────────────────────────────────────────────── */
function SouthElevationSvg({
  length,
  height,
  roofType,
  roofAngle,
  overhang,
  solarAngle,
  windows,
  doors,
  scaleFactor = 1.0,
}: {
  length: number;
  height: number;
  roofType: string;
  roofAngle: number;
  overhang: number;
  solarAngle: number;
  windows: WindowModel[];
  doors: DoorModel[];
  scaleFactor?: number;
}) {
  const svgW = 600 * scaleFactor;
  const svgH = 230 * scaleFactor;
  const groundY = 175 * scaleFactor;

  const pxPerMeter = (360 / 8.0) * scaleFactor;
  const wallW = length * pxPerMeter;
  const rad = (roofAngle * Math.PI) / 180;

  // On South wall: if Shed roof, it is the high clerestory wall!
  const shedExtraH = roofType === "Shed" ? length * 0.4 * Math.tan(rad) : 0;
  const wallH = (height + (roofType === "Shed" ? shedExtraH : 0)) * pxPerMeter;
  const startX = (svgW - wallW) / 2;
  const topWallY = groundY - wallH;
  const eavePx = overhang * pxPerMeter;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-mono">
      <defs>
        <pattern id="south-panel-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="south-glaze-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#dbeafe" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Ground Datum Line */}
      <line x1="15" y1={groundY} x2={svgW - 15} y2={groundY} stroke="#334155" strokeWidth="1.8" />
      <text x={svgW - 85} y={groundY - 5} fontSize="7" fill="#64748b" fontWeight="bold">±0.00m FFL</text>

      {/* Ceiling / Eaves Datum */}
      <line x1="15" y1={topWallY} x2={svgW - 15} y2={topWallY} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.8" />
      <text x={svgW - 85} y={topWallY - 4} fontSize="7" fill="#64748b">
        +{((groundY - topWallY) / pxPerMeter).toFixed(2)}m {roofType === "Shed" ? "CLERESTORY" : "CEILING"}
      </text>

      {/* South Wall Main Rect */}
      <rect
        x={startX}
        y={topWallY}
        width={wallW}
        height={wallH}
        fill="#f8fafc"
        stroke="#1e293b"
        strokeWidth="1.6"
      />
      <rect
        x={startX}
        y={topWallY}
        width={wallW}
        height={wallH}
        fill="url(#south-panel-grid)"
      />

      {/* Roof Solar Overhang Eave */}
      <rect
        x={startX - eavePx}
        y={topWallY - 10 * scaleFactor}
        width={wallW + eavePx * 2}
        height={10 * scaleFactor}
        fill="#334155"
        stroke="#0f172a"
        strokeWidth="1.4"
      />

      {/* Dynamic Doors on South Facade */}
      {doors.map((door, idx) => {
        const dW = (door.width || 0.95) * pxPerMeter;
        const dH = (door.height || 2.1) * pxPerMeter;
        const dX = startX + (door.positionX || 0.5) * pxPerMeter;
        const dY = groundY - dH;

        return (
          <g key={`s-door-${door.id || idx}`}>
            <rect x={dX} y={dY} width={dW} height={dH} fill="#78350f" stroke="#451a03" strokeWidth="1.2" />
            <rect x={dX + 3} y={dY + 3} width={dW - 6} height={dH - 4} fill="#92400e" />
            <circle cx={dX + dW - 6} cy={dY + dH * 0.52} r="2" fill="#fde047" />
          </g>
        );
      })}

      {/* Dynamic Windows on South Facade (Passive Solar Collectors) */}
      {windows.length > 0 ? (
        windows.map((win, idx) => {
          const wW = (win.width || 1.4) * pxPerMeter;
          const wH = (win.height || 1.2) * pxPerMeter;
          const wSill = (win.sillHeight || 0.8) * pxPerMeter;
          const wX = startX + (win.positionX || 1.5) * pxPerMeter;
          const wY = groundY - wSill - wH;

          return (
            <g key={`s-win-${win.id || idx}`}>
              {/* Outer Low-E Thermal Break Frame */}
              <rect
                x={wX - 2}
                y={wY - 2}
                width={wW + 4}
                height={wH + 4}
                fill="#0f172a"
                stroke="#0369a1"
                strokeWidth="1.2"
              />
              {/* Passive Glazing Pane */}
              <rect
                x={wX}
                y={wY}
                width={wW}
                height={wH}
                fill="url(#south-glaze-grad)"
                stroke="#0284c7"
                strokeWidth="1"
              />
              {/* Internal Mullions */}
              {wW > 35 && (
                <>
                  <line x1={wX + wW * 0.33} y1={wY} x2={wX + wW * 0.33} y2={wY + wH} stroke="#0369a1" strokeWidth="0.8" />
                  <line x1={wX + wW * 0.66} y1={wY} x2={wX + wW * 0.66} y2={wY + wH} stroke="#0369a1" strokeWidth="0.8" />
                </>
              )}
              <text x={wX + wW / 2} y={wY + wH / 2 + 3} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0c4a6e">
                SOLAR {win.width}x{win.height}m
              </text>
            </g>
          );
        })
      ) : (
        /* If no windows configured on South, display default passive solar collector band */
        <g>
          <rect
            x={startX + wallW * 0.15}
            y={groundY - wallH * 0.75}
            width={wallW * 0.7}
            height={wallH * 0.65}
            fill="url(#south-glaze-grad)"
            stroke="#0284c7"
            strokeWidth="1.4"
          />
          <text
            x={startX + wallW / 2}
            y={groundY - wallH * 0.42}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#0369a1"
          >
            HIGH-PERFORMANCE PASSIVE SOLAR APERTURE
          </text>
        </g>
      )}

      {/* Winter Solstice Sun Angle Diagram & Ray */}
      <g transform={`translate(${startX + wallW - 10}, ${topWallY - 8})`}>
        {/* Sun Symbol */}
        <circle cx="0" cy="0" r="9" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="13" fill="none" stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="2 2" />

        {/* Ray projecting at exact solstice angle */}
        <line
          x1="0"
          y1="0"
          x2="-50"
          y2={50 * Math.tan((solarAngle * Math.PI) / 180)}
          stroke="#ea580c"
          strokeWidth="1.4"
          strokeDasharray="4 2"
        />
        <text x="-65" y="-6" fontSize="7" fontWeight="bold" fill="#d97706">
          {solarAngle}° WINTER SOLSTICE
        </text>
      </g>

      {/* Dimension Line across Base */}
      <ArchitecturalDimension
        x1={startX}
        y1={groundY + 18}
        x2={startX + wallW}
        y2={groundY + 18}
        text={`${length.toFixed(2)}m OVERALL (SOUTH FACING)`}
      />

      <ScaleBar x={startX + wallW / 2 - 35} y={groundY + 34} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Side Elevation SVG Component (East / West)
   Accurately renders Gable triangular roof or Shed mono-pitch slope
   ──────────────────────────────────────────────────────────── */
function SideElevationSvg({
  width,
  height,
  roofType,
  roofAngle,
  overhang,
  orientation,
  windows,
  doors,
  scaleFactor = 1.0,
}: {
  width: number;
  height: number;
  roofType: string;
  roofAngle: number;
  overhang: number;
  orientation: "East" | "West";
  windows: WindowModel[];
  doors: DoorModel[];
  scaleFactor?: number;
}) {
  const svgW = 340 * scaleFactor;
  const svgH = 210 * scaleFactor;
  const groundY = 160 * scaleFactor;

  const pxPerMeter = (180 / 4.8) * scaleFactor;
  const wallW = width * pxPerMeter;
  const wallH = height * pxPerMeter;
  const startX = (svgW - wallW) / 2;
  const topWallY = groundY - wallH;

  const rad = (roofAngle * Math.PI) / 180;
  const eavePx = overhang * pxPerMeter;

  // Build wall polygon depending on roof type
  let wallPath = "";
  let roofOutline = "";
  let ridgeY = topWallY;

  if (roofType === "Flat") {
    // Standard rectangle with top parapet
    wallPath = `M ${startX} ${groundY} L ${startX} ${topWallY} L ${startX + wallW} ${topWallY} L ${startX + wallW} ${groundY} Z`;
    roofOutline = `M ${startX - eavePx} ${topWallY - 10 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY - 10 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY} L ${startX - eavePx} ${topWallY} Z`;
  } else if (roofType === "Gable") {
    // Triangular gable end! Peak is in the center
    const gableRisePx = (width / 2) * Math.tan(rad) * pxPerMeter;
    ridgeY = topWallY - gableRisePx;
    const midX = startX + wallW / 2;

    wallPath = `M ${startX} ${groundY} L ${startX} ${topWallY} L ${midX} ${ridgeY} L ${startX + wallW} ${topWallY} L ${startX + wallW} ${groundY} Z`;
    // Rafter eaves overhanging
    roofOutline = `M ${startX - eavePx} ${topWallY + 4} L ${midX} ${ridgeY - 6 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY + 4} L ${startX + wallW + eavePx} ${topWallY} L ${midX} ${ridgeY} L ${startX - eavePx} ${topWallY} Z`;
  } else if (roofType === "Shed") {
    // Mono-pitch slope!
    // Orientation: East view has South to the left, North to the right. West view has North to left, South to right.
    const shedRisePx = width * Math.tan(rad) * pxPerMeter;
    const highY = topWallY - shedRisePx;
    ridgeY = highY;

    if (orientation === "East") {
      // High on Left (South), Low on Right (North)
      wallPath = `M ${startX} ${groundY} L ${startX} ${highY} L ${startX + wallW} ${topWallY} L ${startX + wallW} ${groundY} Z`;
      roofOutline = `M ${startX - eavePx} ${highY - 6 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY - 6 * scaleFactor} L ${startX + wallW + eavePx} ${topWallY} L ${startX - eavePx} ${highY} Z`;
    } else {
      // High on Right (South), Low on Left (North)
      wallPath = `M ${startX} ${groundY} L ${startX} ${topWallY} L ${startX + wallW} ${highY} L ${startX + wallW} ${groundY} Z`;
      roofOutline = `M ${startX - eavePx} ${topWallY - 6 * scaleFactor} L ${startX + wallW + eavePx} ${highY - 6 * scaleFactor} L ${startX + wallW + eavePx} ${highY} L ${startX - eavePx} ${topWallY} Z`;
    }
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-mono">
      {/* Ground Line */}
      <line x1="10" y1={groundY} x2={svgW - 10} y2={groundY} stroke="#334155" strokeWidth="1.6" />
      <text x={svgW - 70} y={groundY - 4} fontSize="6.5" fill="#64748b">±0.00 FFL</text>

      {/* Wall Body with Roof Geometry */}
      <path d={wallPath} fill="#f8fafc" stroke="#1e293b" strokeWidth="1.6" />

      {/* Roof Fascia & Eaves Profile */}
      <path d={roofOutline} fill="#334155" stroke="#0f172a" strokeWidth="1.2" />

      {/* Dynamic Doors on Side Wall */}
      {doors.map((door, idx) => {
        const dW = (door.width || 0.95) * pxPerMeter;
        const dH = (door.height || 2.1) * pxPerMeter;
        const dX = startX + (door.positionX || 0.8) * pxPerMeter;
        const dY = groundY - dH;

        return (
          <g key={`side-door-${door.id || idx}`}>
            <rect x={dX} y={dY} width={dW} height={dH} fill="#78350f" stroke="#451a03" strokeWidth="1" />
            <circle cx={dX + dW - 5} cy={dY + dH * 0.5} r="1.8" fill="#fde047" />
          </g>
        );
      })}

      {/* Dynamic Windows on Side Wall */}
      {windows.map((win, idx) => {
        const wW = (win.width || 1.0) * pxPerMeter;
        const wH = (win.height || 1.0) * pxPerMeter;
        const wSill = (win.sillHeight || 0.9) * pxPerMeter;
        const wX = startX + (win.positionX || 1.2) * pxPerMeter;
        const wY = groundY - wSill - wH;

        return (
          <rect
            key={`side-win-${win.id || idx}`}
            x={wX}
            y={wY}
            width={wW}
            height={wH}
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="1"
          />
        );
      })}

      {/* Roof Pitch Callout if pitched */}
      {roofAngle > 0 && roofType !== "Flat" && (
        <text
          x={startX + wallW / 2}
          y={ridgeY - 10 * scaleFactor}
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill="#0284c7"
        >
          {roofAngle}° {roofType.toUpperCase()} PITCH
        </text>
      )}

      {/* Dimension Line across Base */}
      <ArchitecturalDimension
        x1={startX}
        y1={groundY + 16}
        x2={startX + wallW}
        y2={groundY + 16}
        text={`${width.toFixed(2)}m DEPTH`}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Floor Plan SVG Component (Top-Down Architectural View 1:50)
   Dynamic openings on all 4 walls, door swing arcs, and thermal mass core
   ──────────────────────────────────────────────────────────── */
function FloorPlanSvg({
  length,
  width,
  height,
  windows,
  doors,
  hasThermalMass,
  scaleFactor = 1.0,
}: {
  length: number;
  width: number;
  height: number;
  windows: WindowModel[];
  doors: DoorModel[];
  hasThermalMass: boolean;
  scaleFactor?: number;
}) {
  const svgW = 600 * scaleFactor;
  const svgH = 340 * scaleFactor;

  // Scale: 1 meter = 42px * scaleFactor
  const pxPerMeter = (360 / 8.0) * scaleFactor;
  const planW = length * pxPerMeter;
  const planH = width * pxPerMeter;
  const startX = (svgW - planW) / 2;
  const startY = (svgH - planH) / 2;
  const wallThickPx = 14 * scaleFactor; // Represents ~350mm thick composite wall

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-mono">
      <defs>
        <pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
        </pattern>
        <pattern id="thermal-mass-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 0 8 L 8 0 M 0 0 L 8 8" fill="none" stroke="#64748b" strokeWidth="0.8" />
        </pattern>
      </defs>

      {/* Outer Envelope Wall Mass */}
      <rect
        x={startX}
        y={startY}
        width={planW}
        height={planH}
        fill="#cbd5e1"
        stroke="#0f172a"
        strokeWidth="2"
      />

      {/* Inner Habitable Living Space */}
      <rect
        x={startX + wallThickPx}
        y={startY + wallThickPx}
        width={planW - wallThickPx * 2}
        height={planH - wallThickPx * 2}
        fill="#ffffff"
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* Internal Flywheel Thermal Mass Wall if present */}
      {hasThermalMass && (
        <g>
          <rect
            x={startX + planW * 0.45}
            y={startY + wallThickPx}
            width={wallThickPx * 1.2}
            height={planH * 0.65}
            fill="url(#thermal-mass-hatch)"
            stroke="#1e293b"
            strokeWidth="1.2"
          />
          <text
            x={startX + planW * 0.45 + wallThickPx * 0.6}
            y={startY + planH * 0.75}
            textAnchor="middle"
            fontSize="6"
            fontWeight="bold"
            fill="#475569"
          >
            FLYWHEEL THERMAL MASS
          </text>
        </g>
      )}

      {/* Window Cuts on Walls */}
      {windows.map((win, idx) => {
        const wLen = (win.width || 1.2) * pxPerMeter;
        let wx = 0;
        let wy = 0;
        let ww = 0;
        let wh = 0;

        if (win.wall === "north") {
          wx = startX + (win.positionX || 1.5) * pxPerMeter;
          wy = startY;
          ww = wLen;
          wh = wallThickPx;
        } else if (win.wall === "south") {
          wx = startX + (win.positionX || 1.5) * pxPerMeter;
          wy = startY + planH - wallThickPx;
          ww = wLen;
          wh = wallThickPx;
        } else if (win.wall === "east") {
          wx = startX + planW - wallThickPx;
          wy = startY + (win.positionX || 1.0) * pxPerMeter;
          ww = wallThickPx;
          wh = wLen;
        } else if (win.wall === "west") {
          wx = startX;
          wy = startY + (win.positionX || 1.0) * pxPerMeter;
          ww = wallThickPx;
          wh = wLen;
        }

        return (
          <g key={`fp-win-${win.id || idx}`}>
            {/* Opening Cutout */}
            <rect x={wx} y={wy} width={ww} height={wh} fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
            {/* Glazing Double Lines */}
            {win.wall === "north" || win.wall === "south" ? (
              <>
                <line x1={wx} y1={wy + wh * 0.35} x2={wx + ww} y2={wy + wh * 0.35} stroke="#0284c7" strokeWidth="1" />
                <line x1={wx} y1={wy + wh * 0.65} x2={wx + ww} y2={wy + wh * 0.65} stroke="#0284c7" strokeWidth="1" />
              </>
            ) : (
              <>
                <line x1={wx + ww * 0.35} y1={wy} x2={wx + ww * 0.35} y2={wy + wh} stroke="#0284c7" strokeWidth="1" />
                <line x1={wx + ww * 0.65} y1={wy} x2={wx + ww * 0.65} y2={wy + wh} stroke="#0284c7" strokeWidth="1" />
              </>
            )}
          </g>
        );
      })}

      {/* Door Openings & Swing Arcs */}
      {doors.map((door, idx) => {
        const dLen = (door.width || 0.95) * pxPerMeter;
        let dx = 0;
        let dy = 0;
        let arcPath = "";
        let leafX2 = 0;
        let leafY2 = 0;

        if (door.wall === "north") {
          dx = startX + (door.positionX || 2.0) * pxPerMeter;
          dy = startY;
          arcPath = `M ${dx} ${dy + wallThickPx} A ${dLen} ${dLen} 0 0 0 ${dx + dLen} ${dy + wallThickPx + dLen}`;
          leafX2 = dx;
          leafY2 = dy + wallThickPx + dLen;
        } else if (door.wall === "south") {
          dx = startX + (door.positionX || 2.0) * pxPerMeter;
          dy = startY + planH - wallThickPx;
          arcPath = `M ${dx} ${dy} A ${dLen} ${dLen} 0 0 1 ${dx + dLen} ${dy - dLen}`;
          leafX2 = dx;
          leafY2 = dy - dLen;
        } else if (door.wall === "east") {
          dx = startX + planW - wallThickPx;
          dy = startY + (door.positionX || 1.2) * pxPerMeter;
          arcPath = `M ${dx} ${dy} A ${dLen} ${dLen} 0 0 0 ${dx - dLen} ${dy + dLen}`;
          leafX2 = dx - dLen;
          leafY2 = dy;
        } else {
          dx = startX;
          dy = startY + (door.positionX || 1.2) * pxPerMeter;
          arcPath = `M ${dx + wallThickPx} ${dy} A ${dLen} ${dLen} 0 0 1 ${dx + wallThickPx + dLen} ${dy + dLen}`;
          leafX2 = dx + wallThickPx + dLen;
          leafY2 = dy;
        }

        return (
          <g key={`fp-door-${door.id || idx}`}>
            {/* Cut Wall */}
            <rect
              x={dx}
              y={dy}
              width={door.wall === "north" || door.wall === "south" ? dLen : wallThickPx}
              height={door.wall === "north" || door.wall === "south" ? wallThickPx : dLen}
              fill="#ffffff"
            />
            {/* Door Swing Arc */}
            <path d={arcPath} fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2 2" />
            {/* Door Leaf */}
            <line
              x1={dx}
              y1={dy + (door.wall === "north" ? wallThickPx : 0)}
              x2={leafX2}
              y2={leafY2}
              stroke="#92400e"
              strokeWidth="1.5"
            />
          </g>
        );
      })}

      {/* Primary Dimensions Strings */}
      <ArchitecturalDimension
        x1={startX}
        y1={startY - 16}
        x2={startX + planW}
        y2={startY - 16}
        text={`${length.toFixed(2)}m (EXTERIOR LENGTH)`}
      />
      <ArchitecturalDimension
        x1={startX - 16}
        y1={startY + planH}
        x2={startX - 16}
        y2={startY}
        text={`${width.toFixed(2)}m (EXTERIOR DEPTH)`}
        isVertical={true}
      />

      {/* Living Zone Center Typography */}
      <g transform={`translate(${startX + planW / 2}, ${startY + planH / 2})`}>
        <text x="0" y="-8" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">
          HABITABLE LIVING ZONE
        </text>
        <text x="0" y="6" textAnchor="middle" fontSize="7.5" fill="#475569">
          FLOOR AREA: {(length * width).toFixed(1)} m² · CEILING: {height.toFixed(2)}m
        </text>
        <text x="0" y="18" textAnchor="middle" fontSize="6.5" fill="#64748b">
          ENCLOSED VOLUME: {(length * width * height).toFixed(1)} m³
        </text>
      </g>

      <ScaleBar x={startX + planW / 2 - 35} y={startY + planH + 24} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Technical Cross-Section SVG Component (1:50)
   Layer build-up: North windward wall, Plinth slab, Roof rafters & Solar
   ──────────────────────────────────────────────────────────── */
function TechnicalSectionSvg({
  length,
  width,
  height,
  roofType,
  roofAngle,
  uWall,
  uRoof,
  uFloor,
  scaleFactor = 1.0,
}: {
  length: number;
  width: number;
  height: number;
  roofType: string;
  roofAngle: number;
  uWall: number;
  uRoof: number;
  uFloor: number;
  scaleFactor?: number;
}) {
  const svgW = 680 * scaleFactor;
  const svgH = 310 * scaleFactor;
  const groundY = 225 * scaleFactor;
  const wallH = 135 * scaleFactor;
  const wallW = 380 * scaleFactor;
  const startX = (svgW - wallW) / 2;
  const topWallY = groundY - wallH;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none font-mono">
      <defs>
        <pattern id="gravel-sub" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#94a3b8" />
          <circle cx="7" cy="7" r="1.2" fill="#94a3b8" />
        </pattern>
        <pattern id="insul-layer" width="8" height="12" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 8 6 L 0 12" fill="none" stroke="#f59e0b" strokeWidth="0.8" />
        </pattern>
      </defs>

      {/* Subgrade Earth & Gravel Drainage Bed */}
      <rect x={startX - 25} y={groundY + 12} width={wallW + 50} height="45" fill="url(#gravel-sub)" />
      <line x1="25" y1={groundY + 12} x2={svgW - 25} y2={groundY + 12} stroke="#334155" strokeWidth="1.6" />
      <text x="35" y={groundY + 28} fontSize="6.5" fill="#64748b">SUBGRADE GRAVEL DRAINAGE BED (COMPACTED 250MM)</text>

      {/* Insulated Plinth Slab Foundation */}
      <rect
        x={startX}
        y={groundY}
        width={wallW}
        height="12"
        fill="#f8fafc"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <rect x={startX} y={groundY + 2} width={wallW} height="8" fill="url(#insul-layer)" />
      <text
        x={startX + wallW / 2}
        y={groundY + 9}
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="bold"
        fill="#0f172a"
      >
        INSULATED GROUND SLAB (U={uFloor} W/m²K · DAMP-PROOF MEMBRANE)
      </text>

      {/* Left Wall Build-Up (North Wall - 350mm Multi-layer) */}
      <rect
        x={startX}
        y={topWallY}
        width="28"
        height={wallH}
        fill="#f1f5f9"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      <rect
        x={startX + 10}
        y={topWallY}
        width="14"
        height={wallH}
        fill="url(#insul-layer)"
        stroke="#f59e0b"
        strokeWidth="0.6"
      />

      {/* Right Wall Build-Up (South Wall with Passive Solar Glazing) */}
      <rect
        x={startX + wallW - 28}
        y={topWallY}
        width="28"
        height={wallH}
        fill="#f1f5f9"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      <rect
        x={startX + wallW - 20}
        y={topWallY}
        width="14"
        height={wallH}
        fill="url(#insul-layer)"
        stroke="#f59e0b"
        strokeWidth="0.6"
      />

      {/* South Solar Glazing Cutout */}
      <rect
        x={startX + wallW - 29}
        y={topWallY + 25}
        width="30"
        height="85"
        fill="#bae6fd"
        stroke="#0284c7"
        strokeWidth="1.2"
      />

      {/* Roof Deck & Joists Structure */}
      <rect
        x={startX - 10}
        y={topWallY - 16}
        width={wallW + 20}
        height="16"
        fill="#334155"
        stroke="#0f172a"
        strokeWidth="1.4"
      />
      <rect
        x={startX - 6}
        y={topWallY - 12}
        width={wallW + 12}
        height="8"
        fill="url(#insul-layer)"
      />
      <text
        x={startX + wallW / 2}
        y={topWallY - 6}
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="bold"
        fill="#fef08a"
      >
        INSULATED ROOF DECK (U={uRoof} W/m²K · AEROGEL CORE)
      </text>

      {/* Interior Air Zone - Comfort Node */}
      <g transform={`translate(${startX + wallW / 2}, ${topWallY + wallH / 2})`}>
        <circle cx="0" cy="0" r="28" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
        <text x="0" y="-3" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#d97706">
          INTERIOR AIR NODE
        </text>
        <text x="0" y="8" textAnchor="middle" fontSize="6" fill="#64748b">
          STABILIZED COMFORT ZONE
        </text>
      </g>

      {/* Callouts */}
      <text x={startX - 14} y={topWallY + 45} textAnchor="end" fontSize="6.5" fontWeight="bold" fill="#0f172a">
        NORTH ENVELOPE (U={uWall})
      </text>
      <text x={startX + wallW + 14} y={topWallY + 65} fontSize="6.5" fontWeight="bold" fill="#0284c7">
        PASSIVE TROMBE GLAZING
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Material Reference Schedule Component
   Clean, modern tabular schedule of envelope layers and thermal metrics
   ──────────────────────────────────────────────────────────── */
function MaterialReferenceSchedule({
  southWallU,
  northWallU,
  roofU,
  floorU,
  windows,
  detailedMode = false,
}: {
  southWallU: number;
  northWallU: number;
  roofU: number;
  floorU: number;
  windows: WindowModel[];
  detailedMode?: boolean;
}) {
  const primaryWindow = windows[0];

  return (
    <div className="space-y-3 font-mono">
      <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700 pb-1 text-[11px] flex items-center justify-between">
        <span>MATERIAL & FABRIC SCHEDULE</span>
        <span className="text-[9px] text-slate-500">CIV-SCH-001</span>
      </div>

      <div className="space-y-2 text-[10px]">
        {/* Ext-01: Walls */}
        <div className="flex items-start gap-2.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="size-4 shrink-0 rounded bg-slate-200 dark:bg-slate-700 border border-slate-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
              <span>EXT-01: HIGH-ALTITUDE WALL PANELS</span>
              <span className="text-emerald-600 dark:text-emerald-400">U={southWallU} W/m²K</span>
            </div>
            <p className="text-[9px] text-slate-500">
              Galvanized steel skin + PIR/Aerogel Core (120mm, k=0.022 W/mK) + timber lining.
            </p>
          </div>
        </div>

        {/* Ext-02: Roof */}
        <div className="flex items-start gap-2.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="size-4 shrink-0 rounded bg-amber-100 dark:bg-amber-950/50 border border-amber-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
              <span>EXT-02: AEROGEL ROOF DECK</span>
              <span className="text-emerald-600 dark:text-emerald-400">U={roofU} W/m²K</span>
            </div>
            <p className="text-[9px] text-slate-500">
              Standing seam structural metal deck + high-density blanket insulation (160mm).
            </p>
          </div>
        </div>

        {/* Ext-03: Ground Floor */}
        <div className="flex items-start gap-2.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="size-4 shrink-0 rounded bg-stone-200 dark:bg-stone-800 border border-stone-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
              <span>EXT-03: PERMAFROST FOUNDATION SLAB</span>
              <span className="text-emerald-600 dark:text-emerald-400">U={floorU} W/m²K</span>
            </div>
            <p className="text-[9px] text-slate-500">
              Reinforced concrete plinth + high-load XPS under-slab insulation (100mm, R=3.2).
            </p>
          </div>
        </div>

        {/* Ext-04: Glazing */}
        <div className="flex items-start gap-2.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="size-4 shrink-0 rounded bg-sky-100 dark:bg-sky-950/50 border border-sky-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
              <span>EXT-04: SOLAR GLAZING APERTURES</span>
              <span className="text-sky-600 dark:text-sky-400">
                U={primaryWindow?.glazingType === "Triple_LowE_Krypton" ? "0.75" : "1.40"} W/m²K
              </span>
            </div>
            <p className="text-[9px] text-slate-500">
              Low-E Argon/Krypton insulated glazing (SHGC=0.55) + thermal break UPVC/wood composite.
            </p>
          </div>
        </div>

        {/* Ext-05: Airtight Ingress Doors */}
        <div className="flex items-start gap-2.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="size-4 shrink-0 rounded bg-amber-800 text-white border border-amber-900 mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
              <span>EXT-05: AIRTIGHT VESTIBULE DOOR</span>
              <span className="text-emerald-600 dark:text-emerald-400">U=1.10 W/m²K</span>
            </div>
            <p className="text-[9px] text-slate-500">
              Heavy timber core + dual EPDM compression seals for sub-zero wind-pressure resistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Architectural Dimension String SVG
   Features true architectural 45° diagonal slash ticks!
   ──────────────────────────────────────────────────────────── */
function ArchitecturalDimension({
  x1,
  y1,
  x2,
  y2,
  text,
  isVertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  isVertical?: boolean;
}) {
  const tickSize = 4;

  if (isVertical) {
    const midY = (y1 + y2) / 2;
    return (
      <g>
        {/* Main Dimension Line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="0.8" />
        {/* 45° Ticks */}
        <line x1={x1 - tickSize} y1={y1 + tickSize} x2={x1 + tickSize} y2={y1 - tickSize} stroke="#1e293b" strokeWidth="1.2" />
        <line x1={x2 - tickSize} y1={y2 + tickSize} x2={x2 + tickSize} y2={y2 - tickSize} stroke="#1e293b" strokeWidth="1.2" />
        {/* Text rotated vertically */}
        <text
          x={x1 - 6}
          y={midY}
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill="#334155"
          transform={`rotate(-90 ${x1 - 6} ${midY})`}
        >
          {text}
        </text>
      </g>
    );
  }

  const midX = (x1 + x2) / 2;
  return (
    <g>
      {/* Main Dimension Line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="0.8" />
      {/* 45° Ticks */}
      <line x1={x1 - tickSize} y1={y1 + tickSize} x2={x1 + tickSize} y2={y1 - tickSize} stroke="#1e293b" strokeWidth="1.2" />
      <line x1={x2 - tickSize} y1={y2 + tickSize} x2={x2 + tickSize} y2={y2 - tickSize} stroke="#1e293b" strokeWidth="1.2" />
      {/* Text centered horizontally */}
      <text x={midX} y={y1 - 4} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#334155">
        {text}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────
   Architectural Scale Bar (0, 1m, 2m, 4m)
   ──────────────────────────────────────────────────────────── */
function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="70" height="3" fill="#0f172a" />
      <rect x="17.5" y="0" width="17.5" height="3" fill="#ffffff" stroke="#0f172a" strokeWidth="0.4" />
      <rect x="52.5" y="0" width="17.5" height="3" fill="#ffffff" stroke="#0f172a" strokeWidth="0.4" />
      <text x="0" y="-2" fontSize="5.5" fill="#64748b">0</text>
      <text x="35" y="-2" fontSize="5.5" fill="#64748b">2m</text>
      <text x="70" y="-2" fontSize="5.5" fill="#64748b">4m</text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────
   Human Scale Silhouette (1.8m tall)
   ──────────────────────────────────────────────────────────── */
function HumanScaleSilhouette({ x, y, scale = 0.3 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y - 55 * (scale / 0.3)}) scale(${scale})`}>
      <circle cx="10" cy="10" r="7.5" fill="#475569" />
      <rect x="5" y="19" width="10" height="35" rx="3" fill="#475569" />
      <rect x="6" y="54" width="3.5" height="42" fill="#475569" />
      <rect x="11.5" y="54" width="3.5" height="42" fill="#475569" />
    </g>
  );
}

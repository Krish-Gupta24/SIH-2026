"use client";

import React from "react";
import {
  Sparkles,
  Layers,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Feather,
  Compass,
  ArrowRight,
  CheckCircle2,
  Cpu,
  BrainCircuit,
  Eye,
  Box,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AICandidate } from "../types";

interface CandidateDesignCardProps {
  candidate: AICandidate;
  onVerify: (candidate: AICandidate) => void;
  onExplain: (candidate: AICandidate) => void;
  onApplyToDesigner: (candidate: AICandidate) => void;
  isVerifying: boolean;
  isExplaining: boolean;
}

export function CandidateDesignCard({
  candidate,
  onVerify,
  onExplain,
  onApplyToDesigner,
  isVerifying,
  isExplaining,
}: CandidateDesignCardProps) {
  const p = candidate.parameters;
  const pred = candidate.surrogate_predictions;

  const wallThickMm = Math.round((p.wall_insulation_thickness_m || 0.1) * 1000);
  const roofThickMm = Math.round((p.roof_insulation_thickness_m || 0.15) * 1000);
  const floorThickMm = Math.round((p.floor_insulation_thickness_m || 0.1) * 1000);

  const orientationDeg = Math.round(p.orientation_deg || 0);
  const orientationLabel =
    orientationDeg >= 337.5 || orientationDeg < 22.5
      ? "North (0°)"
      : orientationDeg >= 22.5 && orientationDeg < 67.5
      ? "Northeast (45°)"
      : orientationDeg >= 67.5 && orientationDeg < 112.5
      ? "East (90°)"
      : orientationDeg >= 112.5 && orientationDeg < 157.5
      ? "Southeast (135°)"
      : orientationDeg >= 157.5 && orientationDeg < 202.5
      ? "South (180° - Optimal Solar)"
      : orientationDeg >= 202.5 && orientationDeg < 247.5
      ? "Southwest (225°)"
      : orientationDeg >= 247.5 && orientationDeg < 292.5
      ? "West (270°)"
      : "Northwest (315°)";

  return (
    <Card className="rounded-[2rem] border border-border bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
              <Box className="size-4" />
            </span>
            <h3 className="text-lg font-bold tracking-tight">
              Selected Blueprint: #{candidate.candidate_id.slice(-8)}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pareto-optimal inverse design matching high-altitude thermal comfort and transport objectives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {candidate.is_physics_verified ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 text-xs">
              <CheckCircle2 className="size-3.5" />
              ThermoShelter Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-blue-500 border-blue-500/30 gap-1.5 py-1 text-xs">
              <Cpu className="size-3.5" />
              Surrogate ML Prediction
            </Badge>
          )}

          {candidate.is_high_uncertainty && (
            <Badge variant="destructive" className="gap-1.5 py-1 text-xs">
              <AlertTriangle className="size-3.5" />
              Boundary Design (±{candidate.uncertainty_margin_c.toFixed(1)}°C)
            </Badge>
          )}
        </div>
      </div>

      {/* 4-Stat Metric Summary */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Winter Min Temp</span>
            <Thermometer className="size-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono">
            {pred.winter_indoor_min_c?.toFixed(1) ?? "12.0"}°C
          </div>
          <span className="text-[10px] text-muted-foreground">
            Uncertainty: ±{candidate.uncertainty_margin_c.toFixed(1)}°C
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Annual Heating</span>
            <Flame className="size-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono">
            {pred.heating_demand_kwh_m2?.toFixed(1) ?? "0.0"} kWh/m²·a
          </div>
          <span className="text-[10px] text-muted-foreground">
            Peak: {pred.peak_heating_load_w?.toFixed(0) ?? "1500"} W
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Discomfort Hours</span>
            <Sparkles className="size-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono">
            {pred.annual_discomfort_hours_pct?.toFixed(1) ?? "8.0"}%
          </div>
          <span className="text-[10px] text-muted-foreground">
            Annual Comfort: {(100 - (pred.annual_discomfort_hours_pct || 8)).toFixed(1)}%
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Envelope Mass</span>
            <Feather className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono">
            {Math.round(pred.envelope_mass_kg || p.envelope_mass_kg || 4200).toLocaleString()} kg
          </div>
          <span className="text-[10px] text-muted-foreground">
            Helicopter Lift: {((pred.envelope_mass_kg || 4200) < 5000) ? "Feasible (CH-47/Mi-17)" : "Heavy Logistics"}
          </span>
        </div>
      </div>

      {/* Physical Architecture Details */}
      <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="size-3.5" />
          Engineering Envelope Specification
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Footprint Geometry</span>
            <span className="font-semibold text-foreground">
              {(p.length_m || 6).toFixed(1)}m × {(p.width_m || 4).toFixed(1)}m × {(p.height_m || 2.8).toFixed(1)}m
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Floor Area: {((p.length_m || 6) * (p.width_m || 4)).toFixed(1)} m²
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Solar Orientation</span>
            <span className="font-semibold text-foreground">{orientationLabel}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Azimuth Angle: {orientationDeg}°
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">South Window Aperture</span>
            <span className="font-semibold text-foreground">
              {((p.window_wall_ratio_south || 0.25) * 100).toFixed(0)}% WWR ({p.glazing_type?.replace(/_/g, " ") || "Triple Low-E"})
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Overhang: {((p.shading_overhang_depth_m || 0.5) * 100).toFixed(0)} cm
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Wall Insulation</span>
            <span className="font-semibold text-foreground">
              {wallThickMm} mm ({p.wall_construction_type?.replace(/_/g, " ") || "Polyurethane / Aerogel"})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Roof Thermal Cap</span>
            <span className="font-semibold text-foreground">
              {roofThickMm} mm ({p.roof_construction_type?.replace(/_/g, " ") || "VIP / Mineral Wool"})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Floor Ground Buffer</span>
            <span className="font-semibold text-foreground">
              {floorThickMm} mm ({p.floor_construction_type?.replace(/_/g, " ") || "Extruded Polystyrene"})
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          {/* Verify with ThermoShelter Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onVerify(candidate)}
            disabled={isVerifying || candidate.is_physics_verified}
            className="rounded-xl border-border hover:bg-secondary text-xs gap-1.5"
          >
            {isVerifying ? (
              <>
                <span className="size-3 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                Running ThermoShelter...
              </>
            ) : candidate.is_physics_verified ? (
              <>
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Physics Verified
              </>
            ) : (
              <>
                <ShieldCheck className="size-3.5 text-blue-500" />
                Verify with ThermoShelter
              </>
            )}
          </Button>

          {/* Explain AI Decisions Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onExplain(candidate)}
            disabled={isExplaining}
            className="rounded-xl border-border hover:bg-secondary text-xs gap-1.5"
          >
            {isExplaining ? (
              <>
                <span className="size-3 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                Computing SHAP...
              </>
            ) : (
              <>
                <BrainCircuit className="size-3.5 text-purple-500" />
                Explain AI Decisions
              </>
            )}
          </Button>
        </div>

        {/* Load into 3D CAD Designer Button */}
        <Button
          type="button"
          size="sm"
          onClick={() => onApplyToDesigner(candidate)}
          className="rounded-xl bg-foreground text-background font-semibold text-xs shadow-md hover:opacity-90 gap-2 px-4 py-2"
        >
          <span>Load into 3D CAD Designer</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}

"use client";

import React, { useState } from "react";
import {
  Flame,
  Sun,
  Wind,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import type { VisualizationMode } from "../types";
import type { ShelterModel } from "@/types/shelter";
import {
  calculateThermalMetrics,
  type DynamicThermalCalculations,
  type HourlyThermalStep,
} from "../thermal-physics";

interface Props {
  mode: VisualizationMode;
  model?: ShelterModel;
  hourlyStep?: HourlyThermalStep | null;
  hasSimResults?: boolean;
}

export function ThermalScaleLegend({ mode, model, hourlyStep, hasSimResults }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (mode === "model") return null;

  const metrics = model ? calculateThermalMetrics(model) : null;

  const modeConfig = {
    thermal: {
      icon: <Flame className="size-3.5" />,
      label: "Thermal Analysis",
      title: "Surface Thermography",
      iconBg: "rgba(217, 119, 6, 0.15)",
      iconColor: "#d97706",
    },
    solar: {
      icon: <Sun className="size-3.5" />,
      label: "Solar Irradiance",
      title: "Winter Solar Noon · 34°N",
      iconBg: "rgba(245, 158, 11, 0.15)",
      iconColor: "#f59e0b",
    },
    "heat-flow": {
      icon: <Wind className="size-3.5" />,
      label: "Heat Flow Analysis",
      title: "Envelope Conduction Map",
      iconBg: "rgba(20, 184, 166, 0.15)",
      iconColor: "#14b8a6",
    },
  };

  const config = modeConfig[mode];

  return (
    <div className="cad-thermal-legend-panel">
      <div className="cad-hud-card">
        {/* ── Header ───────────────────────────── */}
        <div className="cad-hud-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className="cad-hud-icon"
              style={{ background: config.iconBg, color: config.iconColor }}
            >
              {config.icon}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    color: "#6e818f",
                    lineHeight: 1.4,
                  }}
                >
                  {config.label}
                </span>
                {hourlyStep && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: hasSimResults
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(59, 130, 246, 0.12)",
                      color: hasSimResults ? "#059669" : "#2563eb",
                      border: `1px solid ${
                        hasSimResults ? "rgba(16, 185, 129, 0.3)" : "rgba(59, 130, 246, 0.25)"
                      }`,
                    }}
                  >
                    {hasSimResults ? "⚡ ThermoShelter 24h" : "ISO 6946"}
                  </span>
                )}
              </div>
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 650,
                  color: "inherit",
                  letterSpacing: "-0.02em",
                }}
              >
                {hourlyStep ? `${config.title} · ${hourlyStep.timeLabel}` : config.title}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
            onClick={() => setCollapsed(!collapsed)}
            className="cad-hud-toggle"
          >
            {collapsed ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>

        {/* ── Expandable Content ────────────────── */}
        {!collapsed && (
          <div style={{ marginTop: "10px" }}>
            {mode === "thermal" && <ThermalContent metrics={metrics} hourlyStep={hourlyStep} />}
            {mode === "solar" && <SolarContent metrics={metrics} hourlyStep={hourlyStep} />}
            {mode === "heat-flow" && <HeatFlowContent metrics={metrics} hourlyStep={hourlyStep} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ThermalContent({
  metrics,
  hourlyStep,
}: {
  metrics?: DynamicThermalCalculations | null;
  hourlyStep?: HourlyThermalStep | null;
}) {
  const southTemp = hourlyStep ? hourlyStep.tSurfaceSouth : (metrics?.tSurfaceSouth ?? 21.5);
  const northTemp = hourlyStep ? hourlyStep.tSurfaceNorth : (metrics?.tSurfaceNorth ?? -12.0);
  const glazingTemp = hourlyStep ? hourlyStep.tGlazing : (metrics?.tGlazing ?? 26.5);
  const floorTemp = hourlyStep ? hourlyStep.tFloorMass : (metrics?.tFloorMass ?? 19.0);
  const outdoorTemp = hourlyStep ? hourlyStep.outdoorTemp : (metrics?.tOutdoor ?? -15.0);

  const southSign = southTemp >= 0 ? "+" : "";
  const northSign = northTemp >= 0 ? "+" : "";
  const glazingSign = glazingTemp >= 0 ? "+" : "";
  const floorSign = floorTemp >= 0 ? "+" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Temperature gradient bar */}
      <div>
        <div
          style={{
            height: "8px",
            width: "100%",
            borderRadius: "4px",
            background:
              "linear-gradient(90deg, #3b82f6, #06b6d4, #eab308, #f97316, #ef4444)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "5px",
            fontSize: "9px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "#6e818f",
          }}
        >
          <span>{`${outdoorTemp}°C`}</span>
          <span>0°C</span>
          <span>+10°C</span>
          <span>+25°C</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(110,129,143,0.15)",
        }}
      >
        <MetricCell
          icon={<ArrowUpRight className="size-3" style={{ color: "#ef4444" }} />}
          label="South Wall"
          value={`${southSign}${southTemp.toFixed(1)}°C`}
          sub={
            hourlyStep
              ? `${hourlyStep.qSouthFlux >= 0 ? "+" : ""}${hourlyStep.qSouthFlux} W/m² sol-air`
              : `+${metrics?.iSouthIncident ?? 410} W/m²`
          }
          color="#ef4444"
        />
        <MetricCell
          icon={<ArrowDownRight className="size-3" style={{ color: "#3b82f6" }} />}
          label="North Wall"
          value={`${northSign}${northTemp.toFixed(1)}°C`}
          sub={
            hourlyStep
              ? `${hourlyStep.qNorthFlux} W/m² loss`
              : `${metrics?.qNorthFlux ?? -88} W/m² loss`
          }
          color="#3b82f6"
        />
        <MetricCell
          icon={<Zap className="size-3" style={{ color: "#ea580c" }} />}
          label="Glazing Peak"
          value={`${glazingSign}${glazingTemp.toFixed(1)}°C`}
          sub={
            hourlyStep
              ? `${hourlyStep.solarGainW} W solar harvest`
              : `${metrics?.qGlazingTransmitted ?? 480} W/m²`
          }
          color="#ea580c"
        />
        <MetricCell
          icon={<Thermometer className="size-3" style={{ color: "#d97706" }} />}
          label="Floor Mass"
          value={`${floorSign}${floorTemp.toFixed(1)}°C`}
          sub={
            hourlyStep
              ? hourlyStep.hour >= 19 || hourlyStep.hour <= 5
                ? "Discharging heat"
                : "Absorbing radiation"
              : "Thermal storage"
          }
          color="#d97706"
        />
      </div>
    </div>
  );
}

function SolarContent({
  metrics,
  hourlyStep,
}: {
  metrics?: DynamicThermalCalculations | null;
  hourlyStep?: HourlyThermalStep | null;
}) {
  const dniVal = hourlyStep ? hourlyStep.dni : (metrics?.dniNoon ?? 950);
  const gainVal =
    hourlyStep && hourlyStep.solarGainW !== undefined
      ? `${hourlyStep.solarGainW} W instantaneous`
      : `${metrics?.estDailySolarKwh ?? 8.0} kWh/d harvest`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Irradiance gradient bar */}
      <div>
        <div
          style={{
            height: "8px",
            width: "100%",
            borderRadius: "4px",
            background:
              "linear-gradient(90deg, #334155, #d97706, #fbbf24)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
            fontSize: "9px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "#6e818f",
          }}
        >
          <span>{hourlyStep && hourlyStep.hour < 6 ? "0 W/m²" : "65 W/m²"}</span>
          <span>{Math.round(dniVal * 0.5)} W/m²</span>
          <span>{dniVal} W/m²</span>
        </div>
      </div>

      {/* Solar data */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(110,129,143,0.18)",
        }}
      >
        <DataRow
          label="Direct Normal Irradiance"
          value={`${dniVal} W/m² DNI`}
        />
        <DataRow
          label="Solar Altitude"
          value={
            hourlyStep
              ? hourlyStep.hour >= 7 && hourlyStep.hour <= 17
                ? `${((metrics?.solarAltitudeDeg ?? 32.0) * Math.sin(Math.PI * ((hourlyStep.hour - 7) / 10))).toFixed(1)}° elevation`
                : "0.0° (Below horizon)"
              : `${(metrics?.solarAltitudeDeg ?? 32.0).toFixed(1)}° @ winter noon`
          }
        />
        <DataRow
          label="Aperture Solar Harvest"
          value={gainVal}
          highlight
        />
        <DataRow
          label="North Facade"
          value={`Diffuse only (${hourlyStep && (hourlyStep.hour < 7 || hourlyStep.hour > 17) ? "0" : (metrics?.iNorthIncident ?? 65)} W/m²)`}
        />
      </div>
    </div>
  );
}

function HeatFlowContent({
  metrics,
  hourlyStep,
}: {
  metrics?: DynamicThermalCalculations | null;
  hourlyStep?: HourlyThermalStep | null;
}) {
  const southFlux = hourlyStep ? hourlyStep.qSouthFlux : (metrics?.iSouthIncident ?? 410);
  const northFlux = hourlyStep ? hourlyStep.qNorthFlux : (metrics?.qNorthFlux ?? -88);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Legend items */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingTop: "2px",
        }}
      >
        <LegendRow
          color="#dc2626"
          label="South sol-air flux"
          arrow={`${southFlux >= 0 ? "+" : ""}${southFlux} W/m²`}
        />
        <LegendRow
          color="#2563eb"
          label="North conduction loss"
          arrow={`${northFlux} W/m²`}
        />
        <LegendRow
          color="#a855f7"
          label="Roof stack & sky loss"
          arrow={`U ${metrics?.uRoof.toFixed(2) ?? "0.32"}`}
        />
        <LegendRow color="#14b8a6" label="Internal convection" arrow="↻ Loop" />
        <LegendRow
          color="#38bdf8"
          label="Air infiltration"
          arrow={`❄ ${metrics?.infiltrationACH.toFixed(2) ?? "0.35"} ACH`}
        />
        <LegendRow
          color="#ef4444"
          label="Corner thermal bridges"
          arrow={`● Ψ ${(hourlyStep?.psiBridge ?? metrics?.psiBridge ?? 0.15).toFixed(2)}`}
        />
      </div>

      {/* Key values */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(110,129,143,0.18)",
        }}
      >
        <DataRow
          label="Infiltration Rate"
          value={`${metrics?.infiltrationACH.toFixed(2) ?? "0.35"} ACH (~${Math.round(metrics?.qInfiltrationLossW ?? 290)} W loss)`}
        />
        <DataRow
          label="Thermal Bridges"
          value={`Ψ = ${(hourlyStep?.psiBridge ?? metrics?.psiBridge ?? 0.15).toFixed(2)} W/(m·K)`}
          highlight
        />
        <DataRow
          label="Envelope Conduction"
          value={`U_wall ${metrics?.uSouth.toFixed(2) ?? "0.28"} / U_roof ${metrics?.uRoof.toFixed(2) ?? "0.32"} W/m²K`}
        />
      </div>
    </div>
  );
}

/* ── Reusable small components ──────────────────────────────── */

function MetricCell({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "7px 9px",
        borderRadius: "8px",
        background: "rgba(110,129,143,0.07)",
        border: "1px solid rgba(110,129,143,0.12)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
        <span
          style={{
            fontSize: "10px",
            color: "#6e818f",
            fontWeight: 650,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {icon}
      </div>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 750,
          fontFamily: "var(--font-geist-mono), monospace",
          color,
          lineHeight: 1.2,
          marginTop: "1px",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "9px",
          fontFamily: "var(--font-geist-mono), monospace",
          color: "#94a3b8",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {sub}
      </span>
    </div>
  );
}

function DataRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          color: "#6e818f",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "var(--font-geist-mono), monospace",
          color: highlight ? "#d97706" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function LegendRow({
  color,
  label,
  arrow,
}: {
  color: string;
  label: string;
  arrow: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "2px",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: "10px",
          fontWeight: 600,
          color: "inherit",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "9px",
          fontFamily: "var(--font-geist-mono), monospace",
          color: "#6e818f",
          fontWeight: 600,
        }}
      >
        {arrow}
      </span>
    </div>
  );
}

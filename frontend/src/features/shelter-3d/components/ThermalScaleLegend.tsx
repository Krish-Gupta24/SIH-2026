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

interface Props {
  mode: VisualizationMode;
}

export function ThermalScaleLegend({ mode }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (mode === "model") return null;

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
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 650,
                  color: "#101820",
                  letterSpacing: "-0.02em",
                }}
              >
                {config.title}
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
            {mode === "thermal" && <ThermalContent />}
            {mode === "solar" && <SolarContent />}
            {mode === "heat-flow" && <HeatFlowContent />}
          </div>
        )}
      </div>
    </div>
  );
}

function ThermalContent() {
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
              "linear-gradient(90deg, #1e3a5f, #334155, #6b7280, #d97706, #ea580c)",
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
          <span>-15°C</span>
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
          gap: "6px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(110,129,143,0.18)",
        }}
      >
        <MetricCell
          icon={<ArrowUpRight className="size-3" style={{ color: "#d97706" }} />}
          label="South Absorber"
          value="+21.5°C"
          sub="410 W/m²"
          color="#d97706"
        />
        <MetricCell
          icon={<ArrowDownRight className="size-3" style={{ color: "#3b82f6" }} />}
          label="North Shaded"
          value="-12.0°C"
          sub="-88 W/m²"
          color="#3b82f6"
        />
        <MetricCell
          icon={<Zap className="size-3" style={{ color: "#ea580c" }} />}
          label="Glazing Peak"
          value="+26.5°C"
          sub="480 W/m²"
          color="#ea580c"
        />
        <MetricCell
          icon={<Thermometer className="size-3" style={{ color: "#b45309" }} />}
          label="Floor Mass"
          value="+19.0°C"
          sub="Storage"
          color="#b45309"
        />
      </div>
    </div>
  );
}

function SolarContent() {
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
          <span>65 W/m²</span>
          <span>450 W/m²</span>
          <span>950 W/m²</span>
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
        <DataRow label="Solar Altitude" value="32.0° @ noon" />
        <DataRow label="Azimuth" value="180° (due South)" />
        <DataRow label="Aperture Gain" value="Deep floor harvest" highlight />
        <DataRow label="North Facade" value="Diffuse only (65 W/m²)" />
      </div>
    </div>
  );
}

function HeatFlowContent() {
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
        <LegendRow color="#dc2626" label="Heat gain (South)" arrow="→ Interior" />
        <LegendRow color="#2563eb" label="Heat loss (North)" arrow="→ Exterior" />
        <LegendRow color="#a855f7" label="Roof stack loss" arrow="↑ Sky" />
        <LegendRow color="#14b8a6" label="Internal convection" arrow="↻ Loop" />
        <LegendRow color="#38bdf8" label="Air infiltration" arrow="❄ Draft" />
        <LegendRow color="#ef4444" label="Thermal bridges" arrow="● Corners" />
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
        <DataRow label="Infiltration Rate" value="0.35 ACH" />
        <DataRow label="Thermal Bridges" value="Ψ = 0.15 W/(m·K)" highlight />
        <DataRow label="Convection" value="South → Mass loop" />
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
        alignItems: "center",
        gap: "6px",
        padding: "6px 8px",
        borderRadius: "6px",
        background: "rgba(110,129,143,0.06)",
      }}
    >
      {icon}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: "9px",
            color: "#6e818f",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-geist-mono), monospace",
            color,
            lineHeight: 1.3,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "#94a3b8",
            lineHeight: 1.3,
          }}
        >
          {sub}
        </span>
      </div>
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
          color: highlight ? "#d97706" : "#101820",
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
          color: "#101820",
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

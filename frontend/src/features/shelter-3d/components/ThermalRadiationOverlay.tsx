"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { VisualizationMode } from "../types";
import type { Shelter3DRepresentation } from "../geometry-math";
import {
  calculateThermalMetrics,
  type DynamicThermalCalculations,
  type HourlyThermalStep,
} from "../thermal-physics";

interface Props {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  mode: VisualizationMode;
  hourlyStep?: HourlyThermalStep | null;
}

/* ─────────────────────────────────────────────────────────────
   Minimal, Human-Designed Architectural Pill Callout
   Matches website design system: sleek dark blur, subtle border,
   monospaced telemetry, glowing indicator dot.
   ──────────────────────────────────────────────────────────── */
function PillCallout({
  value,
  label,
  sub,
  status = "hot",
}: {
  value: string;
  label: string;
  sub?: string;
  status?: "hot" | "cold" | "warm" | "neutral" | "solar";
}) {
  const dotColor: Record<string, string> = {
    hot: "#ef4444",
    cold: "#3b82f6",
    warm: "#f59e0b",
    neutral: "#94a3b8",
    solar: "#fbbf24",
  };

  const badgeBg: Record<string, string> = {
    hot: "rgba(239, 68, 68, 0.18)",
    cold: "rgba(59, 130, 246, 0.18)",
    warm: "rgba(245, 158, 11, 0.18)",
    neutral: "rgba(148, 163, 184, 0.18)",
    solar: "rgba(251, 191, 36, 0.18)",
  };

  const borderColor: Record<string, string> = {
    hot: "rgba(239, 68, 68, 0.5)",
    cold: "rgba(59, 130, 246, 0.5)",
    warm: "rgba(245, 158, 11, 0.5)",
    neutral: "rgba(148, 163, 184, 0.4)",
    solar: "rgba(251, 191, 36, 0.5)",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 9px",
        borderRadius: "9999px",
        background: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${borderColor[status]}`,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35), 0 0 10px " + badgeBg[status],
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Pulsing Status Dot */}
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: dotColor[status],
          boxShadow: `0 0 6px ${dotColor[status]}`,
          flexShrink: 0,
        }}
      />

      {/* Main Metric Value */}
      <span
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "11px",
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>

      {/* Separator */}
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px" }}>·</span>

      {/* Label and Flux */}
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#e2e8f0",
          lineHeight: 1,
        }}
      >
        {label}
        {sub && (
          <span
            style={{
              marginLeft: "4px",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "9px",
              fontWeight: 500,
              color: "#94a3b8",
            }}
          >
            ({sub})
          </span>
        )}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   1. Thermal Radiation & Infrared Surface Temperatures
   Clean, separated callouts with non-colliding coordinates.
   ──────────────────────────────────────────────────────────── */
function ThermalAnnotations({
  model,
  geom,
  metrics,
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  metrics: DynamicThermalCalculations;
}) {
  const H = model.geometry.height;
  const halfL = model.geometry.length / 2;
  const halfW = model.geometry.width / 2;

  const southSign = metrics.tSurfaceSouth >= 0 ? "+" : "";
  const northSign = metrics.tSurfaceNorth >= 0 ? "+" : "";
  const roofSign = metrics.tSurfaceRoof >= 0 ? "+" : "";
  const glazingSign = metrics.tGlazing >= 0 ? "+" : "";

  // Locate primary window on south wall
  const southWindow = geom.windows.find((w) => w.wall === "south") || geom.windows[0];

  // Separate South Wall Opaque callout safely to the LEFT side
  const southWallX = -halfL * 0.52;
  const southWallY = H * 0.65;
  const southWallZ = halfW + 0.05;

  return (
    <group>
      {/* Radiating thermal emission waves from South wall (Stefan-Boltzmann radiation) */}
      {[0.25, 0.6, 0.95].map((dist, i) => (
        <Line
          key={`rad-wave-${i}`}
          points={[
            [-halfL * 0.75, H * 0.5, halfW + dist],
            [0, H * 0.5 + 0.15, halfW + dist + 0.12],
            [halfL * 0.75, H * 0.5, halfW + dist],
          ]}
          color="#ef4444"
          lineWidth={2}
          transparent
          opacity={0.45 - i * 0.12}
        />
      ))}

      {/* Radiating thermal cooling waves from Roof */}
      {[0.3, 0.65].map((lift, i) => (
        <Line
          key={`roof-rad-${i}`}
          points={[
            [-halfL * 0.7, H + 0.2 + lift, 0],
            [0, H + 0.35 + lift, 0],
            [halfL * 0.7, H + 0.2 + lift, 0],
          ]}
          color="#f97316"
          lineWidth={1.8}
          transparent
          opacity={0.4 - i * 0.15}
        />
      ))}

      {/* 1. South Facade Callout — positioned safely on LEFT half of facade */}
      <group position={[southWallX, southWallY, southWallZ]}>
        <Line
          points={[
            [0, 0, 0],
            [-0.3, 0.45, 0.4],
          ]}
          color="#ef4444"
          lineWidth={1.2}
          transparent
          opacity={0.7}
        />
        <Html
          position={[-0.35, 0.52, 0.45]}
          center
          distanceFactor={18}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout
            value={`${southSign}${metrics.tSurfaceSouth.toFixed(1)}°C`}
            label="South Wall"
            sub={`+${metrics.iSouthIncident} W/m² sol-air`}
            status={metrics.tSurfaceSouth > 15 ? "hot" : "warm"}
          />
        </Html>
      </group>

      {/* 2. Peak Window Glazing Callout — angled to the RIGHT, cleanly away from south wall callout */}
      {southWindow && (
        <group
          position={[
            southWindow.worldPosition[0],
            southWindow.worldPosition[1] + southWindow.dimensions[1] / 2 + 0.05,
            southWindow.worldPosition[2],
          ]}
        >
          <Line
            points={[
              [0, 0, 0],
              [0.3, 0.45, 0.4],
            ]}
            color="#ef4444"
            lineWidth={1.2}
            transparent
            opacity={0.7}
          />
          <Html
            position={[0.35, 0.52, 0.45]}
            center
            distanceFactor={18}
            occlude
            style={{ pointerEvents: "none" }}
          >
            <PillCallout
              value={`${glazingSign}${metrics.tGlazing.toFixed(1)}°C`}
              label="Glazing Hotspot"
              sub={`${metrics.qGlazingTransmitted} W/m² trans`}
              status="hot"
            />
          </Html>
        </group>
      )}

      {/* 3. Roof Deck Callout — elevated high above ridge, offset horizontally to avoid overlap */}
      <group position={[halfL * 0.25, H + 0.35, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.7, 0],
          ]}
          color="#f97316"
          lineWidth={1.2}
          transparent
          opacity={0.7}
        />
        <Html
          position={[0, 0.78, 0]}
          center
          distanceFactor={18}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout
            value={`${roofSign}${metrics.tSurfaceRoof.toFixed(1)}°C`}
            label="Roof Deck"
            sub={`U ${metrics.uRoof.toFixed(2)} W/m²K`}
            status={metrics.tSurfaceRoof > 10 ? "warm" : "cold"}
          />
        </Html>
      </group>

      {/* 4. North Facade Callout — positioned on north side, occluded from south view */}
      <group position={[0, H * 0.55, -halfW - 0.05]}>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.45, -0.45],
          ]}
          color="#3b82f6"
          lineWidth={1.2}
          transparent
          opacity={0.7}
        />
        <Html
          position={[0, 0.52, -0.5]}
          center
          distanceFactor={18}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout
            value={`${northSign}${metrics.tSurfaceNorth.toFixed(1)}°C`}
            label="North Shaded"
            sub={`${metrics.qNorthFlux} W/m² loss`}
            status="cold"
          />
        </Html>
      </group>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. Heat Flow & Convective Dynamics
   Thermal bridge indicators, heat conduction streamlines,
   in-situ callouts with occlusion to keep the viewport clean.
   ──────────────────────────────────────────────────────────── */
function HeatFlowAnnotations({
  model,
  geom,
  metrics,
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  metrics: DynamicThermalCalculations;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const halfL = L / 2;
  const halfW = W / 2;

  return (
    <group>
      {/* ── 4 Structural Corner Thermal Bridge Nodes ── */}
      {(
        [
          [-halfL, H, halfW],
          [halfL, H, halfW],
          [-halfL, H, -halfW],
          [halfL, H, -halfW],
        ] as [number, number, number][]
      ).map((corner, idx) => (
        <group key={`bridge-${idx}`}>
          <mesh position={[corner[0] * 0.98, corner[1], corner[2] * 0.98]}>
            <sphereGeometry args={[0.07, 14, 14]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* One single elegant Thermal Bridge Callout on top corner */}
      <group position={[halfL, H, halfW]}>
        <Line
          points={[
            [0, 0, 0],
            [0.3, 0.35, 0.3],
          ]}
          color="#ef4444"
          lineWidth={1.5}
          transparent
          opacity={0.7}
        />
        <Html
          position={[0.35, 0.42, 0.35]}
          center
          distanceFactor={16}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout
            value={`Ψ ${metrics.psiBridge.toFixed(2)}`}
            label="Thermal Bridge"
            sub="W/(m·K)"
            status={metrics.psiBridge > 0.2 ? "hot" : "warm"}
          />
        </Html>
      </group>

      {/* ── South Wall Heat Gain Conduction Arrows ── */}
      {[-halfL * 0.45, 0, halfL * 0.45].map((xOff, i) => (
        <group key={`south-flow-${i}`}>
          <Line
            points={[
              [xOff, H * 0.5, halfW + 0.45],
              [xOff, H * 0.5, halfW - 0.1],
            ]}
            color="#f97316"
            lineWidth={2.8}
            transparent
            opacity={0.75}
          />
          <mesh position={[xOff, H * 0.5, halfW - 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.065, 0.16, 10]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* South Flow Callout */}
      <Html
        position={[0, H * 0.82, halfW + 0.4]}
        center
        distanceFactor={16}
        occlude
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`+${metrics.iSouthIncident}`}
          label="South Solar Gain →"
          sub="W/m² incident"
          status="hot"
        />
      </Html>

      {/* ── North Wall Heat Loss Streamlines ── */}
      {[-halfL * 0.45, 0, halfL * 0.45].map((xOff, i) => (
        <group key={`north-flow-${i}`}>
          <Line
            points={[
              [xOff, H * 0.5, -halfW + 0.1],
              [xOff, H * 0.5, -halfW - 0.45],
            ]}
            color="#3b82f6"
            lineWidth={2.8}
            transparent
            opacity={0.75}
          />
          <mesh position={[xOff, H * 0.5, -halfW - 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.065, 0.16, 10]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* North Loss Callout — occluded from south */}
      <Html
        position={[0, H * 0.35, -halfW - 0.4]}
        center
        distanceFactor={16}
        occlude
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${metrics.qNorthFlux}`}
          label="← North Heat Loss"
          sub={`U ${metrics.uNorth.toFixed(2)} W/m²K`}
          status="cold"
        />
      </Html>

      {/* ── Internal Convection Loop ── */}
      <Line
        points={[
          [0, 0.3, halfW * 0.6],
          [0, H * 0.85, halfW * 0.6],
          [0, H * 0.85, -halfW * 0.6],
          [0, 0.3, -halfW * 0.6],
        ]}
        color="#14b8a6"
        lineWidth={2}
        transparent
        opacity={0.5}
        dashed
        dashSize={0.25}
        gapSize={0.15}
      />

      {/* ── Cold Infiltration at Entry Doors ── */}
      {geom.doors.map((door) => (
        <group key={`draft-${door.id}`}>
          <Line
            points={[
              [door.exteriorPosition[0], 0.05, door.exteriorPosition[2]],
              [door.worldPosition[0], 0.05, door.worldPosition[2]],
            ]}
            color="#38bdf8"
            lineWidth={2.5}
            transparent
            opacity={0.8}
          />
          <Html
            position={[door.worldPosition[0] + 0.35, 0.3, door.worldPosition[2]]}
            center
            distanceFactor={16}
            occlude
            style={{ pointerEvents: "none" }}
          >
            <PillCallout
              value={`${metrics.infiltrationACH.toFixed(2)} ACH`}
              label="Door Infiltration"
              sub={`-${metrics.qInfiltrationLossW} W`}
              status="cold"
            />
          </Html>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. Solar Irradiance & Winter Sun Vector
   Sun position for Leh Ladakh (34°N winter noon altitude 32°),
   solar penetration beams through glazing onto the floor.
   ──────────────────────────────────────────────────────────── */
function SolarAnnotations({
  model,
  geom,
  metrics,
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  metrics: DynamicThermalCalculations;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const halfL = L / 2;
  const halfW = W / 2;

  const sunAltitudeRad = THREE.MathUtils.degToRad(metrics.solarAltitudeDeg);
  const sunAzimuthRad = THREE.MathUtils.degToRad(180 - model.geometry.orientation);
  const sunDistance = 22;
  const sunX = sunDistance * Math.cos(sunAltitudeRad) * Math.sin(sunAzimuthRad);
  const sunY = sunDistance * Math.sin(sunAltitudeRad);
  const sunZ = sunDistance * Math.cos(sunAltitudeRad) * Math.cos(sunAzimuthRad);
  const sunPosition: [number, number, number] = [sunX, sunY, sunZ];

  return (
    <group>
      {/* ── Sun Sphere ── */}
      <group position={sunPosition}>
        <mesh>
          <sphereGeometry args={[0.85, 24, 24]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.25, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
        </mesh>
        <Html center distanceFactor={22} style={{ pointerEvents: "none" }}>
          <PillCallout
            value={`${metrics.dniNoon} W/m²`}
            label="Winter Sun DNI"
            sub={`Alt ${metrics.solarAltitudeDeg}° · ${model.location?.region?.split(",")[0] || "34°N"}`}
            status="solar"
          />
        </Html>
      </group>

      {/* ── Solar Incident Rays onto South Facade ── */}
      {[-halfL * 0.65, 0, halfL * 0.65].map((xOffset, i) => (
        <Line
          key={`ray-${i}`}
          points={[sunPosition, [xOffset, H * 0.55, halfW + 0.05]]}
          color="#f59e0b"
          lineWidth={1.2}
          transparent
          opacity={0.3}
        />
      ))}

      {/* ── Solar Rays Entering Through Windows & Warming Floor ── */}
      {geom.windows.map((win, idx) => (
        <group key={`solar-ray-${win.id}`}>
          <Line
            points={[sunPosition, win.exteriorPosition]}
            color="#f59e0b"
            lineWidth={1.8}
            transparent
            opacity={0.5}
          />
          <Line
            points={[
              win.worldPosition,
              [win.worldPosition[0] * 0.85, 0.05, win.worldPosition[2] - 1.5],
            ]}
            color="#ea580c"
            lineWidth={1.5}
            transparent
            opacity={0.45}
          />
          {/* Floor Solar Absorption Patch */}
          <mesh
            position={[win.worldPosition[0] * 0.85, 0.02, win.worldPosition[2] - 1.5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.55, 20]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
          </mesh>

          {/* Only annotate the first window to prevent visual clutter */}
          {idx === 0 && (
            <Html
              position={[
                win.worldPosition[0],
                win.worldPosition[1] + win.dimensions[1] / 2 + 0.2,
                win.worldPosition[2] + 0.1,
              ]}
              center
              distanceFactor={16}
              occlude
              style={{ pointerEvents: "none" }}
            >
              <PillCallout
                value={`${metrics.estDailySolarKwh} kWh/d`}
                label="Solar Harvest"
                sub={`${metrics.qGlazingTransmitted} W/m² trans`}
                status="solar"
              />
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

/* ── Main Overlay Component ─────────────────────────────────── */
export function ThermalRadiationOverlay({ model, geom, mode, hourlyStep }: Props) {
  const modelMetrics = useMemo(() => calculateThermalMetrics(model), [model]);

  const effectiveMetrics: DynamicThermalCalculations = useMemo(() => {
    if (!hourlyStep) return modelMetrics;
    return {
      ...modelMetrics,
      tOutdoor: hourlyStep.outdoorTemp,
      tIndoor: hourlyStep.indoorTemp,
      tSurfaceSouth: hourlyStep.tSurfaceSouth,
      tSurfaceNorth: hourlyStep.tSurfaceNorth,
      tSurfaceEast: hourlyStep.tSurfaceEast,
      tSurfaceWest: hourlyStep.tSurfaceWest,
      tSurfaceRoof: hourlyStep.tSurfaceRoof,
      tFloorMass: hourlyStep.tFloorMass,
      tGlazing: hourlyStep.tGlazing,
      qSouthFlux: hourlyStep.qSouthFlux,
      qNorthFlux: hourlyStep.qNorthFlux,
      qWindowTotalW: hourlyStep.solarGainW,
      psiBridge: hourlyStep.psiBridge,
    };
  }, [modelMetrics, hourlyStep]);

  if (mode === "thermal") return <ThermalAnnotations model={model} geom={geom} metrics={effectiveMetrics} />;
  if (mode === "heat-flow") return <HeatFlowAnnotations model={model} geom={geom} metrics={effectiveMetrics} />;
  if (mode === "solar") return <SolarAnnotations model={model} geom={geom} metrics={effectiveMetrics} />;
  return null;
}

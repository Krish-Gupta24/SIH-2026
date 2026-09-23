"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { VisualizationMode } from "../types";
import type { Shelter3DRepresentation } from "../geometry-math";
import {
  calculateThermalMetrics,
  GLAZING_PROPERTIES,
  type DynamicThermalCalculations,
  type HourlyThermalStep,
} from "../thermal-physics";
import {
  computeSunAngles,
  dayOfYearFromIsoDate,
  sunPositionGeographic,
  type SolarSite,
} from "../sun-geometry";

interface Props {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  mode: VisualizationMode;
  hourlyStep?: HourlyThermalStep | null;
  exploded?: boolean;
  sunHour?: number;
  solarDate?: string;
  suppressHtmlLabels?: boolean;
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
          zIndexRange={[15, 0]}
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
            zIndexRange={[15, 0]}
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
          zIndexRange={[15, 0]}
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
          zIndexRange={[15, 0]}
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
  hourlyStep,
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  metrics: DynamicThermalCalculations;
  hourlyStep?: HourlyThermalStep | null;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const halfL = L / 2;
  const halfW = W / 2;

  const southArea = L * H;
  const northArea = L * H;
  const eastArea = W * H;
  const westArea = W * H;
  const roofSlopeRad = ((model.geometry.roofAngle || 15) * Math.PI) / 180;
  const roofArea = L * W * (1.0 / Math.cos(roofSlopeRad));
  const floorArea = L * W;

  // Face heat fluxes calculated from real boundary physics
  const qSouth = metrics.qSouthFlux;
  const qNorth = metrics.qNorthFlux;
  const qEast = metrics.qEastFlux ?? -Math.round(metrics.uEast * metrics.deltaT);
  const qWest = metrics.qWestFlux ?? -Math.round(metrics.uWest * metrics.deltaT);
  const qRoof = metrics.qRoofFlux ?? -Math.round(metrics.uRoof * metrics.deltaT);
  const calculatedFloorFlux = Math.round(
    metrics.uFloor * (Math.max(2.0, metrics.tOutdoor * 0.25 + 4.5) - metrics.tIndoor)
  );
  const qFloor = typeof metrics.qFloorFlux === "number" ? metrics.qFloorFlux : calculatedFloorFlux;

  const isSouthGain = qSouth >= 0;
  const isEastGain = qEast >= 0;
  const isWestGain = qWest >= 0;
  const isRoofGain = qRoof >= 0;

  const southWatts = Math.round(qSouth * southArea);
  const northWatts = Math.round(qNorth * northArea);
  const eastWatts = Math.round(qEast * eastArea);
  const westWatts = Math.round(qWest * westArea);
  const roofWatts = Math.round(qRoof * roofArea);
  const floorWatts = Math.round(qFloor * floorArea);

  const roofApexY =
    model.geometry.roofType === "Gable"
      ? H + 0.5 * W * Math.tan(roofSlopeRad)
      : model.geometry.roofType === "Shed"
      ? H + W * Math.tan(roofSlopeRad)
      : H;

  return (
    <group>
      {/* ── 1. Structural Corner Thermal Bridge Nodes (ISO 10211) ── */}
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
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Subtle thermal bridging dissipation ring */}
          <mesh
            position={[corner[0] * 0.98, corner[1] - 0.2, corner[2] * 0.98]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.09, 0.18, 20]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Top Corner Thermal Bridge Callout */}
      <group position={[halfL, H, halfW]}>
        <Line
          points={[
            [0, 0, 0],
            [0.35, 0.38, 0.35],
          ]}
          color="#ef4444"
          lineWidth={1.6}
          transparent
          opacity={0.8}
        />
        <Html
          position={[0.42, 0.45, 0.42]}
          center
          distanceFactor={15}
          occlude
          zIndexRange={[15, 0]}
          style={{ pointerEvents: "none" }}
        >
          <PillCallout
            value={`Ψ ${metrics.psiBridge.toFixed(2)}`}
            label="Corner Thermal Bridge"
            sub="ISO 10211 Linear Ψ W/(m·K)"
            status={metrics.psiBridge > 0.2 ? "hot" : "warm"}
          />
        </Html>
      </group>

      {/* ── 2. South Wall Conduction & Sol-Air Flux Vectors ── */}
      {[-halfL * 0.42, 0, halfL * 0.42].map((xOff, i) => {
        const arrowStart: [number, number, number] = isSouthGain
          ? [xOff, H * 0.5, halfW + 0.48]
          : [xOff, H * 0.5, halfW - 0.08];
        const arrowEnd: [number, number, number] = isSouthGain
          ? [xOff, H * 0.5, halfW - 0.08]
          : [xOff, H * 0.5, halfW + 0.48];
        const coneRot: [number, number, number] = isSouthGain
          ? [Math.PI / 2, 0, 0]
          : [-Math.PI / 2, 0, 0];
        const flowColor = isSouthGain ? "#f97316" : "#2563eb";

        return (
          <group key={`south-flow-${i}`}>
            <Line
              points={[arrowStart, arrowEnd]}
              color={flowColor}
              lineWidth={3}
              transparent
              opacity={0.85}
            />
            <mesh position={arrowEnd} rotation={coneRot}>
              <coneGeometry args={[0.065, 0.16, 12]} />
              <meshBasicMaterial color={flowColor} />
            </mesh>
          </group>
        );
      })}

      {/* South Wall Heat Flux Callout */}
      <Html
        position={[0, H * 0.85, halfW + 0.42]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${isSouthGain ? "+" : ""}${qSouth} W/m²`}
          label={isSouthGain ? "South Sol-Air Gain →" : "← South Heat Loss"}
          sub={`${isSouthGain ? "+" : ""}${southWatts} W · U ${metrics.uSouth.toFixed(2)}`}
          status={isSouthGain ? "hot" : "cold"}
        />
      </Html>

      {/* ── 3. North Wall Conduction Heat Loss Vectors ── */}
      {[-halfL * 0.42, 0, halfL * 0.42].map((xOff, i) => (
        <group key={`north-flow-${i}`}>
          <Line
            points={[
              [xOff, H * 0.5, -halfW + 0.08],
              [xOff, H * 0.5, -halfW - 0.48],
            ]}
            color="#2563eb"
            lineWidth={3}
            transparent
            opacity={0.85}
          />
          <mesh position={[xOff, H * 0.5, -halfW - 0.48]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.065, 0.16, 12]} />
            <meshBasicMaterial color="#2563eb" />
          </mesh>
        </group>
      ))}

      {/* North Wall Heat Loss Callout */}
      <Html
        position={[0, H * 0.35, -halfW - 0.42]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${qNorth} W/m²`}
          label="← North Conduction Loss"
          sub={`${northWatts} W · U ${metrics.uNorth.toFixed(2)} W/m²K`}
          status="cold"
        />
      </Html>

      {/* ── 4. East Wall Flux Vectors ── */}
      {[-halfW * 0.35, halfW * 0.35].map((zOff, i) => {
        const arrowStart: [number, number, number] = isEastGain
          ? [halfL + 0.45, H * 0.5, zOff]
          : [halfL - 0.08, H * 0.5, zOff];
        const arrowEnd: [number, number, number] = isEastGain
          ? [halfL - 0.08, H * 0.5, zOff]
          : [halfL + 0.45, H * 0.5, zOff];
        const coneRot: [number, number, number] = isEastGain
          ? [0, 0, -Math.PI / 2]
          : [0, 0, Math.PI / 2];
        const flowColor = isEastGain ? "#f59e0b" : "#3b82f6";

        return (
          <group key={`east-flow-${i}`}>
            <Line
              points={[arrowStart, arrowEnd]}
              color={flowColor}
              lineWidth={2.8}
              transparent
              opacity={0.8}
            />
            <mesh position={arrowEnd} rotation={coneRot}>
              <coneGeometry args={[0.06, 0.15, 10]} />
              <meshBasicMaterial color={flowColor} />
            </mesh>
          </group>
        );
      })}

      {/* East Wall Callout */}
      <Html
        position={[halfL + 0.42, H * 0.72, 0]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${isEastGain ? "+" : ""}${qEast} W/m²`}
          label={isEastGain ? "East Morning Solar →" : "← East Conduction Loss"}
          sub={`${isEastGain ? "+" : ""}${eastWatts} W · U ${metrics.uEast.toFixed(2)}`}
          status={isEastGain ? "warm" : "cold"}
        />
      </Html>

      {/* ── 5. West Wall Flux Vectors ── */}
      {[-halfW * 0.35, halfW * 0.35].map((zOff, i) => {
        const arrowStart: [number, number, number] = isWestGain
          ? [-halfL - 0.45, H * 0.5, zOff]
          : [-halfL + 0.08, H * 0.5, zOff];
        const arrowEnd: [number, number, number] = isWestGain
          ? [-halfL + 0.08, H * 0.5, zOff]
          : [-halfL - 0.45, H * 0.5, zOff];
        const coneRot: [number, number, number] = isWestGain
          ? [0, 0, Math.PI / 2]
          : [0, 0, -Math.PI / 2];
        const flowColor = isWestGain ? "#f59e0b" : "#3b82f6";

        return (
          <group key={`west-flow-${i}`}>
            <Line
              points={[arrowStart, arrowEnd]}
              color={flowColor}
              lineWidth={2.8}
              transparent
              opacity={0.8}
            />
            <mesh position={arrowEnd} rotation={coneRot}>
              <coneGeometry args={[0.06, 0.15, 10]} />
              <meshBasicMaterial color={flowColor} />
            </mesh>
          </group>
        );
      })}

      {/* West Wall Callout */}
      <Html
        position={[-halfL - 0.42, H * 0.72, 0]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${isWestGain ? "+" : ""}${qWest} W/m²`}
          label={isWestGain ? "West Afternoon Solar →" : "← West Conduction Loss"}
          sub={`${isWestGain ? "+" : ""}${westWatts} W · U ${metrics.uWest.toFixed(2)}`}
          status={isWestGain ? "warm" : "cold"}
        />
      </Html>

      {/* ── 6. Roof Conduction & Sky Radiative Flux Vectors ── */}
      {[-halfL * 0.35, 0, halfL * 0.35].map((xOff, i) => {
        const roofBaseY = H + 0.12;
        const arrowStart: [number, number, number] = isRoofGain
          ? [xOff, roofBaseY + 0.52, 0]
          : [xOff, roofBaseY, 0];
        const arrowEnd: [number, number, number] = isRoofGain
          ? [xOff, roofBaseY, 0]
          : [xOff, roofBaseY + 0.52, 0];
        const coneRot: [number, number, number] = isRoofGain
          ? [Math.PI, 0, 0]
          : [0, 0, 0];
        const flowColor = isRoofGain ? "#f97316" : "#818cf8";

        return (
          <group key={`roof-flow-${i}`}>
            <Line
              points={[arrowStart, arrowEnd]}
              color={flowColor}
              lineWidth={2.8}
              transparent
              opacity={0.85}
            />
            <mesh position={arrowEnd} rotation={coneRot}>
              <coneGeometry args={[0.065, 0.16, 12]} />
              <meshBasicMaterial color={flowColor} />
            </mesh>
          </group>
        );
      })}

      {/* Roof Heat Loss Callout */}
      <Html
        position={[0, roofApexY + 0.65, 0]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${isRoofGain ? "+" : ""}${qRoof} W/m²`}
          label={isRoofGain ? "↓ Roof Solar Inward Flux" : "↑ Roof Conduction & Sky Loss"}
          sub={`${isRoofGain ? "+" : ""}${roofWatts} W · U ${metrics.uRoof.toFixed(2)} W/m²K`}
          status={isRoofGain ? "hot" : "cold"}
        />
      </Html>

      {/* ── 7. Ground Foundation Coupling Loss (ISO 13370) ── */}
      {[-halfL * 0.35, halfL * 0.35].map((xOff, i) => (
        <group key={`floor-flow-${i}`}>
          <Line
            points={[
              [xOff, 0.05, 0],
              [xOff, -0.42, 0],
            ]}
            color="#0284c7"
            lineWidth={2.5}
            transparent
            opacity={0.75}
          />
          <mesh position={[xOff, -0.42, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.055, 0.14, 10]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
        </group>
      ))}

      <Html
        position={[0, -0.35, halfW * 0.7]}
        center
        distanceFactor={15}
        occlude
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <PillCallout
          value={`${qFloor} W/m²`}
          label="↓ Ground Contact Loss"
          sub={`${floorWatts} W · ISO 13370`}
          status="cold"
        />
      </Html>

      {geom.windows.map((win) => {
        const winModel = model.windows?.find((w) => w.id === win.id) || model.windows?.[0];
        const gProps =
          GLAZING_PROPERTIES[winModel?.glazingType || "double_low_e_argon"] ||
          GLAZING_PROPERTIES.double_low_e_argon;
        const physSolar = Math.round(metrics.iSouthIncident * gProps.shgc);
        const physCond = -Math.round(gProps.uValue * metrics.deltaT);

        const qWinSolar = typeof metrics.qWindowSolarFlux === "number" ? metrics.qWindowSolarFlux : physSolar;
        const qWinCond = typeof metrics.qWindowCondFlux === "number" ? metrics.qWindowCondFlux : physCond;
        const qWinNet = typeof metrics.qWindowNetFlux === "number" ? metrics.qWindowNetFlux : (qWinSolar + qWinCond);
        const [wX, wY, wZ] = win.worldPosition;
        const [normX, , normZ] = win.normal;

        return (
          <group key={`win-heat-flow-${win.id}`}>
            {/* Entering Solar Flux Vector */}
            {qWinSolar > 0 && (
              <group>
                <Line
                  points={[
                    [wX + normX * 0.45, wY, wZ + normZ * 0.45],
                    [wX - normX * 0.15, wY, wZ - normZ * 0.15],
                  ]}
                  color="#fbbf24"
                  lineWidth={3}
                  transparent
                  opacity={0.88}
                />
                <mesh
                  position={[wX - normX * 0.15, wY, wZ - normZ * 0.15]}
                  rotation={[0, Math.atan2(-normX, -normZ), 0]}
                >
                  <coneGeometry args={[0.055, 0.14, 10]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
              </group>
            )}

            {/* Exiting Conductive Heat Loss Vector */}
            <Line
              points={[
                [wX - normX * 0.05, wY - 0.22, wZ - normZ * 0.05],
                [wX + normX * 0.42, wY - 0.22, wZ + normZ * 0.42],
              ]}
              color="#38bdf8"
              lineWidth={2.2}
              transparent
              opacity={0.8}
            />
            <mesh
              position={[wX + normX * 0.42, wY - 0.22, wZ + normZ * 0.42]}
              rotation={[0, Math.atan2(normX, normZ), 0]}
            >
              <coneGeometry args={[0.045, 0.12, 10]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>

            {/* Window Net Energy Balance Callout */}
            <Html
              position={[wX + normX * 0.45, wY + 0.35, wZ + normZ * 0.45]}
              center
              distanceFactor={14}
              occlude
              zIndexRange={[15, 0]}
              style={{ pointerEvents: "none" }}
            >
              <PillCallout
                value={`Net ${qWinNet >= 0 ? "+" : ""}${qWinNet} W/m²`}
                label={qWinNet >= 0 ? "Aperture Net Solar Gain" : "Aperture Net Heat Loss"}
                sub={`+${qWinSolar} solar · ${qWinCond} cond`}
                status={qWinNet >= 0 ? "solar" : "cold"}
              />
            </Html>
          </group>
        );
      })}

      {/* ── 9. Internal Natural Convective Circulation Loop ── */}
      <group>
        <Line
          points={[
            [0, 0.35, halfW * 0.65],
            [0, H * 0.88, halfW * 0.65],
            [0, H * 0.88, -halfW * 0.65],
            [0, 0.35, -halfW * 0.65],
            [0, 0.35, halfW * 0.65],
          ]}
          color="#14b8a6"
          lineWidth={2.2}
          transparent
          opacity={0.65}
          dashed
          dashSize={0.25}
          gapSize={0.12}
        />
        {/* Convective loop apex indicators */}
        <mesh position={[0, H * 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.045, 0.12, 8]} />
          <meshBasicMaterial color="#14b8a6" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* ── 10. Cold Air Infiltration at Entry Doors ── */}
      {geom.doors.map((door) => (
        <group key={`draft-${door.id}`}>
          <Line
            points={[
              [door.exteriorPosition[0], 0.05, door.exteriorPosition[2]],
              [door.worldPosition[0], 0.05, door.worldPosition[2]],
            ]}
            color="#38bdf8"
            lineWidth={2.8}
            transparent
            opacity={0.85}
          />
          <Html
            position={[door.worldPosition[0] + 0.35, 0.32, door.worldPosition[2]]}
            center
            distanceFactor={15}
            occlude
            zIndexRange={[15, 0]}
            style={{ pointerEvents: "none" }}
          >
            <PillCallout
              value={`${metrics.infiltrationACH.toFixed(2)} ACH`}
              label="Door Infiltration Draft"
              sub={`-${metrics.qInfiltrationLossW} W sensible`}
              status="cold"
            />
          </Html>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. Real-Time Dynamic Solar Ray Tracing & Envelope Interaction
   - Linked directly in real time to the moving celestial sun (SunLighting.tsx)
   - Real-time rays reacting to Windows, Doors, Walls, and Roof
   - Incident rays stop on solid exterior walls (absorbing heat)
   - Penetrating rays enter through glazing & door openings
   - Floor/wall solar absorption patches move dynamically across interior
   - Zero duplicate/fixed sun: only the true moving celestial sun!
   ──────────────────────────────────────────────────────────── */
function SolarAnnotations({
  model,
  geom,
  metrics,
  sunHour = 12,
  solarDate = "2026-06-21",
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  metrics: DynamicThermalCalculations;
  sunHour?: number;
  solarDate?: string;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const halfL = L / 2;
  const halfW = W / 2;

  // Real-time Solar Site Position (matches celestial sun in SunLighting.tsx)
  const lat = model.location?.latitude ?? 34.15;
  const lon = model.location?.longitude ?? 77.58;
  const dayOfYear = dayOfYearFromIsoDate(solarDate);
  const solarSite: SolarSite = {
    latitudeDeg: lat,
    longitudeDeg: lon,
    dayOfYear,
  };

  const effectiveHour = typeof sunHour === "number" ? sunHour : 12;
  const { altitudeDeg } = computeSunAngles(solarSite, effectiveHour);
  const isDay = altitudeDeg > 0;

  // Real-time 3D coordinates of the celestial sun disc (distance = 48m, identical to SunLighting)
  const sunPos = sunPositionGeographic(solarSite, effectiveHour, 48);
  const sunDist = Math.hypot(sunPos[0], sunPos[1], sunPos[2]) || 1;

  // Normalized direction pointing from sun into the shelter scene
  const rayDir: [number, number, number] = [
    -sunPos[0] / sunDist,
    -sunPos[1] / sunDist,
    -sunPos[2] / sunDist,
  ];

  // Normalized direction pointing from shelter toward the sun
  const toSunDir: [number, number, number] = [
    sunPos[0] / sunDist,
    sunPos[1] / sunDist,
    sunPos[2] / sunDist,
  ];

  // 1. Ray-trace through Window Glazing (entering into shelter interior)
  const windowBeams = useMemo(() => {
    if (!isDay) return [];

    return geom.windows.map((win) => {
      // Normal dot product with incoming sun vector
      const cosIncidence =
        win.normal[0] * toSunDir[0] +
        win.normal[1] * toSunDir[1] +
        win.normal[2] * toSunDir[2];

      if (cosIncidence < 0.04) {
        return { win, isIlluminated: false, cosIncidence: 0, hitPoint: [0, 0, 0] as [number, number, number], hitType: "floor" as const, patchRadius: 0.5 };
      }

      const [wx, wy, wz] = win.worldPosition;
      const [dx, dy, dz] = rayDir;

      // Interior floor intersection: dy is negative (sun is shining downward)
      const tFloor = (0.02 - wy) / (dy || -0.001);
      const rawFloorX = wx + tFloor * dx;
      const rawFloorZ = wz + tFloor * dz;

      // Interior boundary limits
      const boundX = halfL - 0.12;
      const boundZ = halfW - 0.12;
      let tHit = tFloor;
      let hitType: "floor" | "wall" = "floor";

      if (rawFloorX > boundX) {
        const t = (boundX - wx) / (dx || 0.001);
        if (t > 0 && t < tHit) { tHit = t; hitType = "wall"; }
      } else if (rawFloorX < -boundX) {
        const t = (-boundX - wx) / (dx || -0.001);
        if (t > 0 && t < tHit) { tHit = t; hitType = "wall"; }
      }

      if (rawFloorZ > boundZ) {
        const t = (boundZ - wz) / (dz || 0.001);
        if (t > 0 && t < tHit) { tHit = t; hitType = "wall"; }
      } else if (rawFloorZ < -boundZ) {
        const t = (-boundZ - wz) / (dz || -0.001);
        if (t > 0 && t < tHit) { tHit = t; hitType = "wall"; }
      }

      const hitPoint: [number, number, number] = [
        wx + tHit * dx,
        Math.max(0.02, wy + tHit * dy),
        wz + tHit * dz,
      ];

      return {
        win,
        isIlluminated: true,
        cosIncidence,
        hitPoint,
        hitType,
        patchRadius: Math.max(0.35, Math.min(1.2, (win.dimensions[0] * 0.55) / Math.max(0.2, -dy))),
      };
    });
  }, [geom.windows, rayDir, toSunDir, halfL, halfW, isDay]);

  // 2. Ray-trace through Door Openings (entering into shelter)
  const doorBeams = useMemo(() => {
    if (!isDay) return [];

    return geom.doors.map((door) => {
      const cosIncidence =
        door.normal[0] * toSunDir[0] +
        door.normal[1] * toSunDir[1] +
        door.normal[2] * toSunDir[2];

      if (cosIncidence < 0.04) {
        return { door, isIlluminated: false, cosIncidence: 0, hitPoint: [0, 0, 0] as [number, number, number], patchRadius: 0.5 };
      }

      const [dx, dy, dz] = rayDir;
      const [wx, wy, wz] = door.worldPosition;
      const tFloor = (0.02 - wy) / (dy || -0.001);
      const hitPoint: [number, number, number] = [
        Math.max(-halfL + 0.1, Math.min(halfL - 0.1, wx + tFloor * dx)),
        0.02,
        Math.max(-halfW + 0.1, Math.min(halfW - 0.1, wz + tFloor * dz)),
      ];

      return {
        door,
        isIlluminated: true,
        cosIncidence,
        hitPoint,
        patchRadius: Math.max(0.4, door.dimensions[0] * 0.5),
      };
    });
  }, [geom.doors, rayDir, toSunDir, halfL, halfW, isDay]);

  // 3. Incident Solar Rays on Opaque Exterior Walls (stopping at wall surface)
  const wallRays = useMemo(() => {
    if (!isDay) return [];

    const list: Array<{
      side: "north" | "south" | "east" | "west";
      cosIncidence: number;
      surfacePoints: [number, number, number][];
    }> = [];

    (["south", "east", "west", "north"] as const).forEach((side) => {
      const wall = geom.walls[side];
      const cosIncidence =
        wall.normal[0] * toSunDir[0] +
        wall.normal[1] * toSunDir[1] +
        wall.normal[2] * toSunDir[2];

      if (cosIncidence > 0.05) {
        const pts: [number, number, number][] = [];
        const isSouthOrNorth = side === "south" || side === "north";
        const sign = side === "south" || side === "east" ? 1 : -1;
        const normDist = isSouthOrNorth ? (halfW + 0.02) * sign : (halfL + 0.02) * sign;

        [-0.35, 0, 0.35].forEach((offsetFrac) => {
          if (isSouthOrNorth) {
            pts.push([halfL * offsetFrac, H * 0.55, normDist]);
          } else {
            pts.push([normDist, H * 0.55, halfW * offsetFrac]);
          }
        });

        list.push({ side, cosIncidence, surfacePoints: pts });
      }
    });

    return list;
  }, [geom.walls, toSunDir, halfL, halfW, H, isDay]);

  // 4. Roof Insolation Rays
  const roofRays = useMemo(() => {
    if (!isDay || altitudeDeg <= 2) return [];
    return [
      [-halfL * 0.32, geom.roof.center[1] + 0.04, 0] as [number, number, number],
      [0, geom.roof.center[1] + 0.04, 0] as [number, number, number],
      [halfL * 0.32, geom.roof.center[1] + 0.04, 0] as [number, number, number],
    ];
  }, [isDay, altitudeDeg, geom.roof.center, halfL]);

  if (!isDay) return null;

  return (
    <group>
      {/* ── 1. Exterior Walls Solar Irradiation (Terminating on solid wall surfaces) ── */}
      {wallRays.map(({ side, cosIncidence, surfacePoints }) => (
        <group key={`wall-rays-${side}`}>
          {surfacePoints.map((target, idx) => (
            <group key={`wray-${side}-${idx}`}>
              {/* Incident ray straight from the real celestial moving sun */}
              <Line
                points={[sunPos, target]}
                color="#f59e0b"
                lineWidth={1.2}
                transparent
                opacity={0.28 * cosIncidence}
              />
              {/* Solar Absorption Hotspot Ring on Exterior Wall Face */}
              <mesh position={target}>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.6 * cosIncidence} />
              </mesh>
            </group>
          ))}
          {/* Surface Solar Irradiance Pill on the most illuminated wall */}
          {cosIncidence > 0.4 && surfacePoints[1] && (
            <Html
              position={[surfacePoints[1][0], surfacePoints[1][1] + 0.35, surfacePoints[1][2]]}
              center
              distanceFactor={18}
              zIndexRange={[15, 0]}
              style={{ pointerEvents: "none" }}
            >
              <PillCallout
                value={`${Math.round(metrics.qSouthFlux * cosIncidence)} W/m²`}
                label={`${side.toUpperCase()} Wall Insolation`}
                sub={`Direct Solar Absorption`}
                status="warm"
              />
            </Html>
          )}
        </group>
      ))}

      {/* ── 2. Roof Solar Irradiation (Terminating on Roof Surface) ── */}
      {roofRays.map((rTarget, idx) => (
        <group key={`roof-ray-${idx}`}>
          <Line
            points={[sunPos, rTarget]}
            color="#f59e0b"
            lineWidth={1.2}
            transparent
            opacity={0.3}
          />
          <mesh position={rTarget}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      {/* ── 3. Solar Rays Entering Through Windows & Warming Interior Floor ── */}
      {windowBeams.map(({ win, isIlluminated, cosIncidence, hitPoint, hitType, patchRadius }, idx) => {
        if (!isIlluminated) return null;

        return (
          <group key={`win-solar-${win.id}`}>
            {/* Direct Sun Ray from Celestial Sun to Window Glazing */}
            <Line
              points={[sunPos, win.exteriorPosition]}
              color="#fbbf24"
              lineWidth={2.0}
              transparent
              opacity={0.55}
            />

            {/* Transmitted Light Beam Entering into Shelter Interior */}
            <Line
              points={[win.worldPosition, hitPoint]}
              color="#ea580c"
              lineWidth={2.4}
              transparent
              opacity={0.7}
            />

            {/* Glowing Floor / Wall Solar Absorption Patch */}
            <group position={hitPoint}>
              <mesh rotation={hitType === "floor" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
                <circleGeometry args={[patchRadius, 24]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.42} />
              </mesh>
              {/* Inner intense solar focal core */}
              <mesh rotation={hitType === "floor" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
                <circleGeometry args={[patchRadius * 0.45, 16]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} />
              </mesh>
            </group>

            {/* Primary Window Telemetry Badge */}
            {idx === 0 && (
              <Html
                position={[
                  win.worldPosition[0],
                  win.worldPosition[1] + win.dimensions[1] / 2 + 0.25,
                  win.worldPosition[2],
                ]}
                center
                distanceFactor={16}
                occlude
                zIndexRange={[15, 0]}
                style={{ pointerEvents: "none" }}
              >
                <PillCallout
                  value={`${Math.round(metrics.qGlazingTransmitted * cosIncidence)} W/m²`}
                  label="Solar Glazing Harvest"
                  sub={`Direct Penetration · Alt ${Math.round(altitudeDeg)}°`}
                  status="solar"
                />
              </Html>
            )}
          </group>
        );
      })}

      {/* ── 4. Solar Rays Entering Through Doors (Entryway Insolation) ── */}
      {doorBeams.map(({ door, isIlluminated, hitPoint, patchRadius }) => {
        if (!isIlluminated) return null;

        return (
          <group key={`door-solar-${door.id}`}>
            {/* Direct Sun Ray from Sun to Door Entrance */}
            <Line
              points={[sunPos, door.exteriorPosition]}
              color="#fbbf24"
              lineWidth={2.0}
              transparent
              opacity={0.5}
            />
            {/* Beam Entering Through Doorway onto Interior Entry Floor */}
            <Line
              points={[door.worldPosition, hitPoint]}
              color="#ea580c"
              lineWidth={2.2}
              transparent
              opacity={0.65}
            />
            {/* Entryway Floor Solar Patch */}
            <mesh position={hitPoint} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[patchRadius, 20]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.38} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── Main Overlay Component ─────────────────────────────────── */
export function ThermalRadiationOverlay({
  model,
  geom,
  mode,
  hourlyStep,
  exploded = false,
  sunHour = 12,
  solarDate = "2026-06-21",
  suppressHtmlLabels = false,
}: Props) {
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
      qEastFlux: hourlyStep.qEastFlux,
      qWestFlux: hourlyStep.qWestFlux,
      qRoofFlux: hourlyStep.qRoofFlux,
      qFloorFlux: hourlyStep.qFloorFlux,
      qWindowNetFlux: hourlyStep.qWindowNetFlux,
      qWindowSolarFlux: hourlyStep.qWindowSolarFlux,
      qWindowCondFlux: hourlyStep.qWindowCondFlux,
      qWindowTotalW: hourlyStep.solarGainW,
      psiBridge: hourlyStep.psiBridge,
    };
  }, [modelMetrics, hourlyStep]);

  // Suppress all fixed thermal badges and flux lines during exploded assembly view or when modal is open
  if (exploded || suppressHtmlLabels) return null;

  if (mode === "thermal") return <ThermalAnnotations model={model} geom={geom} metrics={effectiveMetrics} />;
  if (mode === "heat-flow") return <HeatFlowAnnotations model={model} geom={geom} metrics={effectiveMetrics} hourlyStep={hourlyStep} />;
  if (mode === "solar") {
    return (
      <SolarAnnotations
        model={model}
        geom={geom}
        metrics={effectiveMetrics}
        sunHour={sunHour}
        solarDate={solarDate}
      />
    );
  }
  return null;
}

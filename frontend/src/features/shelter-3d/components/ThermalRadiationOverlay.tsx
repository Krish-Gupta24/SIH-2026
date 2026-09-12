"use client";

import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { VisualizationMode } from "../types";
import type { Shelter3DRepresentation } from "../geometry-math";

interface Props {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
  mode: VisualizationMode;
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
    hot: "rgba(239, 68, 68, 0.15)",
    cold: "rgba(59, 130, 246, 0.15)",
    warm: "rgba(245, 158, 11, 0.15)",
    neutral: "rgba(148, 163, 184, 0.15)",
    solar: "rgba(251, 191, 36, 0.15)",
  };

  const borderColor: Record<string, string> = {
    hot: "rgba(239, 68, 68, 0.4)",
    cold: "rgba(59, 130, 246, 0.4)",
    warm: "rgba(245, 158, 11, 0.4)",
    neutral: "rgba(148, 163, 184, 0.3)",
    solar: "rgba(251, 191, 36, 0.45)",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 11px",
        borderRadius: "9999px",
        background: "rgba(11, 19, 41, 0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${borderColor[status]}`,
        boxShadow: "0 6px 20px -2px rgba(0, 0, 0, 0.45), 0 0 12px -2px " + badgeBg[status],
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transform: "translate3d(0, 0, 0)",
        userSelect: "none",
      }}
    >
      {/* Pulsing Status Dot */}
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: dotColor[status],
          boxShadow: `0 0 8px ${dotColor[status]}`,
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
      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>·</span>

      {/* Label and Flux */}
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#cbd5e1",
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
   Clean, separated callouts with occlude=true to eliminate collisions.
   Visible radiating thermal wave arcs in front of high-radiation surfaces.
   ──────────────────────────────────────────────────────────── */
function ThermalAnnotations({
  model,
  geom,
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
}) {
  const H = model.geometry.height;
  const halfL = model.geometry.length / 2;
  const halfW = model.geometry.width / 2;

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

      {/* South Facade Callout — positioned cleanly outside South wall with leader line */}
      <group position={[0, H * 0.7, halfW + 0.05]}>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.45, 0.4],
          ]}
          color="#ef4444"
          lineWidth={1.2}
          transparent
          opacity={0.65}
        />
        <Html
          position={[0, 0.5, 0.45]}
          center
          distanceFactor={16}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout value="+21.5°C" label="South Absorber" sub="+410 W/m²" status="hot" />
        </Html>
      </group>

      {/* North Facade Callout — occluded when looking from the South, zero overlap! */}
      <group position={[0, H * 0.55, -halfW - 0.05]}>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.4, -0.4],
          ]}
          color="#3b82f6"
          lineWidth={1.2}
          transparent
          opacity={0.65}
        />
        <Html
          position={[0, 0.45, -0.45]}
          center
          distanceFactor={16}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout value="-12.0°C" label="North Shaded" sub="-88 W/m²" status="cold" />
        </Html>
      </group>

      {/* Roof Deck Callout — anchored above the ridge */}
      <group position={[0, H + 0.4, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [0, 0.55, 0],
          ]}
          color="#f97316"
          lineWidth={1.2}
          transparent
          opacity={0.65}
        />
        <Html
          position={[0, 0.62, 0]}
          center
          distanceFactor={16}
          occlude
          style={{ pointerEvents: "none" }}
        >
          <PillCallout value="+15.8°C" label="Roof Radiance" sub="Sky Loss" status="warm" />
        </Html>
      </group>

      {/* Peak Window Glazing Callout — only for the primary south window */}
      {geom.windows.length > 0 && (
        <group
          position={[
            geom.windows[0].worldPosition[0],
            geom.windows[0].worldPosition[1] + geom.windows[0].dimensions[1] / 2 + 0.05,
            geom.windows[0].worldPosition[2],
          ]}
        >
          <Line
            points={[
              [0, 0, 0],
              [0, 0.35, 0.25],
            ]}
            color="#ef4444"
            lineWidth={1.2}
            transparent
            opacity={0.6}
          />
          <Html
            position={[0, 0.4, 0.28]}
            center
            distanceFactor={16}
            occlude
            style={{ pointerEvents: "none" }}
          >
            <PillCallout value="+26.5°C" label="Glazing Hotspot" sub="480 W/m²" status="hot" />
          </Html>
        </group>
      )}
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
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
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
          <PillCallout value="Ψ 0.15" label="Thermal Bridge" sub="W/(m·K)" status="hot" />
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
        <PillCallout value="+410" label="Heat Gain →" sub="W/m² solar" status="hot" />
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
        <PillCallout value="-88" label="← Heat Loss" sub="W/m² conduction" status="cold" />
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
            <PillCallout value="0.35 ACH" label="Door Infiltration" status="cold" />
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
}: {
  model: ShelterModel;
  geom: Shelter3DRepresentation;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const halfL = L / 2;
  const halfW = W / 2;

  const sunAltitudeRad = THREE.MathUtils.degToRad(32);
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
          <PillCallout value="950 W/m²" label="Winter Sun" sub="Alt 32° · Leh 34°N" status="solar" />
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
                value={`${(win.dimensions[0] * win.dimensions[1] * 0.55 * 5.2).toFixed(1)} kWh/d`}
                label="Solar Harvest"
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
export function ThermalRadiationOverlay({ model, geom, mode }: Props) {
  if (mode === "thermal") return <ThermalAnnotations model={model} geom={geom} />;
  if (mode === "heat-flow") return <HeatFlowAnnotations model={model} geom={geom} />;
  if (mode === "solar") return <SolarAnnotations model={model} geom={geom} />;
  return null;
}

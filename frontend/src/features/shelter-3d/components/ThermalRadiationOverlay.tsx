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

/* ── Thermal surface temperature annotations ─────────────────────── */
function ThermalAnnotations({
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
      {/* ── Wall surface temperature tags ─────────────────────── */}
      <Html
        position={[0, H * 0.55, halfW + 0.25]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-hot">
          <span className="cad-thermal-badge-temp">+21.5°C</span>
          <div className="cad-thermal-badge-details">
            <strong>South Wall — Absorber</strong>
            <small>+410 W/m² irradiance</small>
          </div>
        </div>
      </Html>

      <Html
        position={[0, H * 0.55, -halfW - 0.25]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-cold">
          <span className="cad-thermal-badge-temp">-12.0°C</span>
          <div className="cad-thermal-badge-details">
            <strong>North Wall — Shaded</strong>
            <small>-88 W/m² heat loss</small>
          </div>
        </div>
      </Html>

      <Html
        position={[halfL + 0.25, H * 0.55, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-neutral">
          <span className="cad-thermal-badge-temp">+3.2°C</span>
          <div className="cad-thermal-badge-details">
            <strong>East Wall — Morning</strong>
            <small>+120 W/m² AM peak</small>
          </div>
        </div>
      </Html>

      <Html
        position={[-halfL - 0.25, H * 0.55, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-neutral">
          <span className="cad-thermal-badge-temp">+1.4°C</span>
          <div className="cad-thermal-badge-details">
            <strong>West Wall — Windward</strong>
            <small>-145 W/m² wind chill</small>
          </div>
        </div>
      </Html>

      {/* ── Roof surface temperature ─────────────────────── */}
      <Html
        position={[0, H + 0.6, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-hot">
          <span className="cad-thermal-badge-temp">+15.8°C</span>
          <div className="cad-thermal-badge-details">
            <strong>Roof Deck — Solar</strong>
            <small>High thermal exposure</small>
          </div>
        </div>
      </Html>

      {/* ── Floor thermal mass ─────────────────────── */}
      <Html
        position={[0, 0.15, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-radiant">
          <span className="cad-thermal-badge-temp">+19.0°C</span>
          <div className="cad-thermal-badge-details">
            <strong>Floor Thermal Mass</strong>
            <small>Heat storage reservoir</small>
          </div>
        </div>
      </Html>

      {/* ── Window glazing hotspot tags ─────────────────────── */}
      {geom.windows.map((win) => (
        <Html
          key={`thermal-win-${win.id}`}
          position={[
            win.worldPosition[0],
            win.worldPosition[1] + win.dimensions[1] / 2 + 0.3,
            win.worldPosition[2],
          ]}
          center
          distanceFactor={14}
        >
          <div className="cad-thermal-tag cad-thermal-radiant">
            <span className="cad-thermal-badge-temp">+26.5°C</span>
            <div className="cad-thermal-badge-details">
              <strong>Glazing Hotspot</strong>
              <small>480 W/m² solar gain</small>
            </div>
          </div>
        </Html>
      ))}
    </group>
  );
}

/* ── Heat flow with arrows, bridges, and HUD callouts ─────────── */
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

  // Corner thermal bridge positions
  const corners: [number, number, number][] = [
    [-halfL, H, halfW],
    [halfL, H, halfW],
    [-halfL, H, -halfW],
    [halfL, H, -halfW],
    [-halfL, 0.05, halfW],
    [halfL, 0.05, halfW],
    [-halfL, 0.05, -halfW],
    [halfL, 0.05, -halfW],
  ];

  return (
    <group>
      {/* ── Thermal bridge indicators at all 8 corners ─── */}
      {corners.map((corner, idx) => {
        const isTop = corner[1] > H / 2;
        const dx = corner[0] > 0 ? 1 : -1;
        const dz = corner[2] > 0 ? 1 : -1;
        const dy = isTop ? 1 : -1;
        return (
          <group key={`bridge-${idx}`}>
            <Line
              points={[
                [corner[0] * 0.95, corner[1], corner[2] * 0.95],
                [
                  corner[0] + dx * 0.35,
                  corner[1] + dy * 0.35,
                  corner[2] + dz * 0.35,
                ],
              ]}
              color="#ef4444"
              lineWidth={2}
              transparent
              opacity={0.8}
            />
            {/* Sphere marker at thermal bridge */}
            <mesh
              position={[corner[0] * 0.95, corner[1], corner[2] * 0.95]}
            >
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        );
      })}

      {/* ── Top corner thermal bridge callout ─────────── */}
      <Html
        position={[halfL + 0.6, H + 0.45, halfW + 0.6]}
        center
        distanceFactor={14}
      >
        <div className="cad-heatflow-callout">
          <strong>Thermal Bridge</strong>
          <span>Ψ = 0.15 W/(m·K) · Corner junction</span>
        </div>
      </Html>

      {/* ── Heat conduction arrows through walls ─────────── */}
      {/* South wall - heat gain */}
      {[-halfL * 0.5, 0, halfL * 0.5].map((xOff, i) => (
        <group key={`south-flow-${i}`}>
          <Line
            points={[
              [xOff, H * 0.5, halfW + 0.4],
              [xOff, H * 0.5, halfW - 0.1],
            ]}
            color="#f97316"
            lineWidth={2.5}
            transparent
            opacity={0.7}
          />
          {/* Arrow head */}
          <mesh
            position={[xOff, H * 0.5, halfW - 0.1]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.06, 0.15, 8]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* North wall - heat loss */}
      {[-halfL * 0.5, 0, halfL * 0.5].map((xOff, i) => (
        <group key={`north-flow-${i}`}>
          <Line
            points={[
              [xOff, H * 0.5, -halfW + 0.1],
              [xOff, H * 0.5, -halfW - 0.4],
            ]}
            color="#3b82f6"
            lineWidth={2.5}
            transparent
            opacity={0.7}
          />
          <mesh
            position={[xOff, H * 0.5, -halfW - 0.4]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.06, 0.15, 8]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── South wall heat gain HUD ─────────── */}
      <Html
        position={[0, H * 0.5, halfW + 0.7]}
        center
        distanceFactor={14}
      >
        <div className="cad-heatflow-callout">
          <strong>Heat Gain → Interior</strong>
          <span>+410 W/m² solar absorption</span>
        </div>
      </Html>

      {/* ── North wall heat loss HUD ─────────── */}
      <Html
        position={[0, H * 0.5, -halfW - 0.7]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-cold">
          <span className="cad-thermal-badge-temp">-88 W/m²</span>
          <div className="cad-thermal-badge-details">
            <strong>Heat Loss → Exterior</strong>
            <small>Conduction + convection</small>
          </div>
        </div>
      </Html>

      {/* ── Roof heat loss arrows (upward) ─────────── */}
      {[-halfL * 0.4, 0, halfL * 0.4].map((xOff, i) => (
        <group key={`roof-flow-${i}`}>
          <Line
            points={[
              [xOff, H + 0.1, 0],
              [xOff, H + 0.55, 0],
            ]}
            color="#a855f7"
            lineWidth={2}
            transparent
            opacity={0.6}
          />
          <mesh position={[xOff, H + 0.55, 0]}>
            <coneGeometry args={[0.05, 0.12, 8]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      <Html
        position={[0, H + 0.85, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-heatflow-callout">
          <strong>Roof Stack Loss</strong>
          <span>U-value × ΔT = -62 W/m²</span>
        </div>
      </Html>

      {/* ── Internal convection loop (warm air rises on south, sinks on north) ─ */}
      <Line
        points={[
          [0, 0.3, halfW * 0.6],
          [0, H * 0.85, halfW * 0.6],
          [0, H * 0.85, -halfW * 0.6],
          [0, 0.3, -halfW * 0.6],
        ]}
        color="#14b8a6"
        lineWidth={1.5}
        transparent
        opacity={0.45}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />

      <Html
        position={[0.2, H * 0.45, 0]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-neutral">
          <span className="cad-thermal-badge-temp">0.35 ACH</span>
          <div className="cad-thermal-badge-details">
            <strong>Internal Convection</strong>
            <small>South→Mass→North loop</small>
          </div>
        </div>
      </Html>

      {/* ── Cold air infiltration at doors ─────────── */}
      {geom.doors.map((door) => (
        <group key={`draft-${door.id}`}>
          <Line
            points={[
              [
                door.exteriorPosition[0],
                0.04,
                door.exteriorPosition[2],
              ],
              [
                door.worldPosition[0],
                0.04,
                door.worldPosition[2],
              ],
            ]}
            color="#38bdf8"
            lineWidth={2.5}
            transparent
            opacity={0.7}
          />
          <Html
            position={[
              door.worldPosition[0],
              door.worldPosition[1] - door.dimensions[1] / 2 + 0.15,
              door.worldPosition[2],
            ]}
            center
            distanceFactor={14}
          >
            <div className="cad-cold-draft-badge">
              ❄ Cold Draft · Air Infiltration
            </div>
          </Html>
        </group>
      ))}

      {/* ── Window heat loss indicators ─────────── */}
      {geom.windows.map((win) => (
        <group key={`win-flow-${win.id}`}>
          <Line
            points={[
              win.worldPosition,
              [
                win.worldPosition[0],
                win.worldPosition[1],
                win.worldPosition[2] + (win.wall === "south" ? 0.4 : win.wall === "north" ? -0.4 : 0),
              ],
            ]}
            color="#f97316"
            lineWidth={2}
            transparent
            opacity={0.5}
          />
        </group>
      ))}
    </group>
  );
}

/* ── Solar irradiance visualization ──────────────────────────── */
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

  // Sun position for Leh Ladakh winter noon (34°N, altitude 32°)
  const sunAltitudeRad = THREE.MathUtils.degToRad(32);
  const sunAzimuthRad = THREE.MathUtils.degToRad(
    180 - model.geometry.orientation
  );
  const sunDistance = 22;
  const sunX =
    sunDistance * Math.cos(sunAltitudeRad) * Math.sin(sunAzimuthRad);
  const sunY = sunDistance * Math.sin(sunAltitudeRad);
  const sunZ =
    sunDistance * Math.cos(sunAltitudeRad) * Math.cos(sunAzimuthRad);
  const sunPosition: [number, number, number] = [sunX, sunY, sunZ];

  return (
    <group>
      {/* ── Sun sphere ─────────────────────── */}
      <group position={sunPosition}>
        <mesh>
          <sphereGeometry args={[0.9, 24, 24]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.25}
          />
        </mesh>
        <Html center distanceFactor={16}>
          <div className="cad-sun-badge">
            <span className="cad-solar-icon">☀</span>
            <div>
              <strong>Winter Solar Noon</strong>
              <span>Alt: 32° · Az: 180° · Leh 34°N</span>
            </div>
          </div>
        </Html>
      </group>

      {/* ── Solar rays to south facade ─────────────────────── */}
      {[-halfL * 0.7, 0, halfL * 0.7].map((xOffset, i) => {
        const targetPoint: [number, number, number] = [
          xOffset,
          H * 0.55,
          halfW + 0.05,
        ];
        return (
          <Line
            key={`ray-${i}`}
            points={[sunPosition, targetPoint]}
            color="#f59e0b"
            lineWidth={1.2}
            transparent
            opacity={0.35}
          />
        );
      })}

      {/* ── Solar callout on south facade ─────────── */}
      <Html
        position={[halfL * 0.4, H * 0.75, halfW + 0.3]}
        center
        distanceFactor={14}
      >
        <div className="cad-solar-callout">
          <strong>South Facade — 950 W/m²</strong>
          <span>Direct beam + diffuse irradiance</span>
        </div>
      </Html>

      {/* ── Rays through windows with interior floor patches ─── */}
      {geom.windows.map((win) => (
        <group key={`solar-ray-${win.id}`}>
          <Line
            points={[sunPosition, win.exteriorPosition]}
            color="#f59e0b"
            lineWidth={1.6}
            transparent
            opacity={0.5}
          />
          <Line
            points={[
              win.worldPosition,
              [
                win.worldPosition[0] * 0.85,
                0.06,
                win.worldPosition[2] - 1.6,
              ],
            ]}
            color="#ea580c"
            lineWidth={1.4}
            transparent
            opacity={0.45}
          />
          {/* Floor solar patch */}
          <mesh
            position={[
              win.worldPosition[0] * 0.85,
              0.02,
              win.worldPosition[2] - 1.6,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.6, 20]} />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.35}
            />
          </mesh>

          {/* Window solar gain callout */}
          <Html
            position={[
              win.worldPosition[0],
              win.worldPosition[1] + win.dimensions[1] / 2 + 0.3,
              win.worldPosition[2],
            ]}
            center
            distanceFactor={14}
          >
            <div className="cad-solar-callout">
              <strong>Aperture — Solar Gain</strong>
              <span>
                SHGC × Area = ~{(win.dimensions[0] * win.dimensions[1] * 0.55 * 5.2).toFixed(1)} kWh/day
              </span>
            </div>
          </Html>
        </group>
      ))}

      {/* ── North facade low-irradiance tag ─────────── */}
      <Html
        position={[0, H * 0.55, -halfW - 0.3]}
        center
        distanceFactor={14}
      >
        <div className="cad-thermal-tag cad-thermal-cold">
          <span className="cad-thermal-badge-temp">65 W/m²</span>
          <div className="cad-thermal-badge-details">
            <strong>North — Diffuse Only</strong>
            <small>No direct beam</small>
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ── Main overlay ────────────────────────────────────────────── */
export function ThermalRadiationOverlay({ model, geom, mode }: Props) {
  if (mode === "thermal") {
    return <ThermalAnnotations model={model} geom={geom} />;
  }

  if (mode === "heat-flow") {
    return <HeatFlowAnnotations model={model} geom={geom} />;
  }

  if (mode === "solar") {
    return <SolarAnnotations model={model} geom={geom} />;
  }

  return null;
}

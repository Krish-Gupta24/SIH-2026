"use client";

import { useMemo, useState } from "react";
import { Html, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { LayerModel, ShelterModel } from "@/types/shelter";
import type { SelectedElement, ViewerSettings, WallOrientation } from "../types";
import { deriveShelter3DGeometry, type Opening3DPlacement } from "../geometry-math";
import { ThermalRadiationOverlay } from "./ThermalRadiationOverlay";
import {
  getThermalColor,
  getHeatFlowColor,
  calculateThermalMetrics,
  type HourlyThermalStep,
} from "../thermal-physics";
import { useExplodeFactor } from "../use-explode-factor";
import {
  createMaterialTexture,
  materialAppearance,
  createSolarPanelTexture,
} from "../procedural-textures";

interface Props {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (element: SelectedElement) => void;
  settings: ViewerSettings;
  hourlyStep?: HourlyThermalStep | null;
  sunHour?: number;
  solarDate?: string;
  suppressHtmlLabels?: boolean;
}

const palette = {
  ink: "#101820",
  charcoal: "#1f2933",
  frame: "#2a343d",
  slate: "#6e818f",
  ice: "#cbdce6",
  paper: "#f7f9fa",
  solar: "#d2a546",
  glass: "#8ac2dc",
  steel: "#8895a0",
  edgeLine: "#475569",
  xrayTint: "#93c5fd",
  xrayEdge: "#60a5fa",
};

// Vivid FLIR thermal camera palette — high saturation colors that pop against dark background
const thermalPalette = {
  southHot: "#ef4444",    // Bright red — highest solar absorption (+21.5°C)
  northCold: "#3b82f6",   // Vivid blue — shaded, heat loss (-12.0°C)
  eastNeutral: "#eab308", // Yellow — moderate morning warmth (+3.2°C)
  westCold: "#06b6d4",    // Cyan — wind-cooled (+1.4°C)
  roofHot: "#f97316",     // Orange — high thermal exposure (+15.8°C)
  floorWarm: "#f59e0b",   // Amber — thermal mass storage (+19.0°C)
  glazingPeak: "#dc2626", // Deep red — peak solar hotspot (+26.5°C)
};

function getWallMaterialColor(
  mode: ViewerSettings["visualization"],
  side: WallOrientation,
  isActive: boolean
) {
  if (isActive) return palette.solar;
  if (mode === "thermal") {
    if (side === "south") return thermalPalette.southHot;
    if (side === "north") return thermalPalette.northCold;
    if (side === "east") return thermalPalette.eastNeutral;
    if (side === "west") return thermalPalette.westCold;
  }
  if (mode === "solar") {
    return side === "south" ? "#d97706" : "#cbd5e1";
  }
  if (mode === "heat-flow") {
    return "#ffffff";
  }
  return side === "south" ? "#ded9cb" : palette.paper;
}

function addPosition(
  base: [number, number, number],
  delta: [number, number, number]
): [number, number, number] {
  return [base[0] + delta[0], base[1] + delta[1], base[2] + delta[2]];
}
// Backward-compatible layer passthrough (renders actual user layers as-is without hardcoding)
export function architecturalLayers<T>(layers: T[]): T[] {
  return layers ?? [];
}

// Layer description derived from the actual material/name — no hardcoded slots
function layerDescription(materialId: string, name: string): string {
  const key = `${materialId} ${name}`.toLowerCase();
  if (key.includes("vapor") || key.includes("vapour")) return "Moisture diffusion barrier";
  if (key.includes("weather") || key.includes("air barrier")) return "Drainage plane + air seal";
  if (key.includes("frame") || key.includes("stud") || key.includes("joist")) return "Load-bearing structure";
  if (key.includes("aerogel") || key.includes("eps") || key.includes("xps") || key.includes("pir") || key.includes("insulation")) return "Thermal resistance core";
  if (key.includes("pcm") || key.includes("phase change")) return "Latent heat storage";
  if (key.includes("earth") || key.includes("rammed") || key.includes("adobe") || key.includes("cob")) return "Thermal mass · solar gain store";
  if (key.includes("concrete") || key.includes("masonry") || key.includes("brick") || key.includes("stone")) return "Structural mass";
  if (key.includes("timber") || key.includes("wood") || key.includes("plywood") || key.includes("deck")) return "Interior finish / lining";
  if (key.includes("steel") || key.includes("metal") || key.includes("galvanized")) return "Metal skin / cladding";
  if (key.includes("membrane") || key.includes("waterproof")) return "Waterproofing layer";
  if (key.includes("plaster") || key.includes("render")) return "Interior plaster finish";
  if (key.includes("glass") || key.includes("glazing")) return "Glazing element";
  return "";
}

function SolarArray({
  span,
  rafterDepth,
  texture,
  isXRay,
  panelCount,
  onPointerOver,
  onPointerOut,
}: {
  span: number;
  rafterDepth: number;
  texture: THREE.CanvasTexture | null;
  isXRay: boolean;
  panelCount?: number;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const numPanels = panelCount && panelCount > 0
    ? Math.max(1, Math.min(16, panelCount))
    : Math.max(2, Math.min(6, Math.floor((span * 0.72) / 1.15)));
  const panelW = Math.min(1.15, (span * 0.85) / numPanels - 0.06);
  const panelL = Math.min(1.75, rafterDepth * 0.72);
  const totalArrayW = numPanels * panelW + (numPanels - 1) * 0.06;
  const startX = -totalArrayW / 2 + panelW / 2;

  return (
    <group onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      {/* Aluminum mounting unistrut rails running under the array */}
      {[-panelL * 0.32, panelL * 0.32].map((zOffset, i) => (
        <mesh key={`rail-${i}`} position={[0, -0.02, zOffset]}>
          <boxGeometry args={[totalArrayW + 0.12, 0.03, 0.04]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Array of PV modules */}
      {Array.from({ length: numPanels }).map((_, index) => {
        const px = startX + index * (panelW + 0.08);
        return (
          <group key={`panel-${index}`} position={[px, 0, 0]}>
            {/* Anodized Aluminum Extrusion Frame */}
            <mesh castShadow={!isXRay} receiveShadow>
              <boxGeometry args={[panelW, 0.035, panelL]} />
              <meshStandardMaterial
                color="#334155"
                metalness={0.85}
                roughness={0.25}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
              />
            </mesh>
            {/* Photovoltaic Crystalline Glass Cell Surface in Vivid Solar Blue */}
            <mesh position={[0, 0.016, 0]}>
              <boxGeometry args={[panelW - 0.03, 0.008, panelL - 0.03]} />
              <meshStandardMaterial
                color="#1d4ed8"
                map={texture}
                roughness={0.14}
                metalness={0.58}
                emissive="#0c2d6b"
                emissiveIntensity={0.28}
                transparent={isXRay}
                opacity={isXRay ? 0.38 : 1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ChimneyFlue({
  flueHeight = 1.35,
  isXRay,
  onPointerOver,
  onPointerOut,
}: {
  flueHeight?: number;
  isXRay: boolean;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      {/* 1. Masonry Stone Chase Penetration Collar */}
      <mesh position={[0, 0.12, 0]} castShadow={!isXRay}>
        <boxGeometry args={[0.42, 0.28, 0.42]} />
        <meshStandardMaterial
          color="#475569"
          roughness={0.88}
          metalness={0.05}
          transparent={isXRay}
          opacity={isXRay ? 0.35 : 1}
        />
      </mesh>

      {/* 2. Black Weather-Seal Flashing Apron */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.54, 0.035, 0.54]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* 3. Class-A Double-Wall Insulated Stainless Steel Pipe */}
      <mesh position={[0, flueHeight / 2 + 0.1, 0]} castShadow={!isXRay}>
        <cylinderGeometry args={[0.12, 0.12, flueHeight, 24]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.88}
          roughness={0.18}
          transparent={isXRay}
          opacity={isXRay ? 0.35 : 1}
        />
      </mesh>

      {/* 4. Structural Joint Clamp Bands */}
      {[0.4, 0.85].map((yFrac, idx) => (
        <mesh key={`band-${idx}`} position={[0, yFrac * flueHeight + 0.1, 0]}>
          <cylinderGeometry args={[0.128, 0.128, 0.035, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}

      {/* 5. Conical Storm Collar */}
      <mesh position={[0, flueHeight + 0.02, 0]}>
        <coneGeometry args={[0.20, 0.08, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* 6. Spark Arrestor Mesh Screen */}
      <mesh position={[0, flueHeight + 0.09, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.11, 16]} />
        <meshStandardMaterial color="#334155" wireframe roughness={0.4} />
      </mesh>

      {/* 7. Architectural Conical Rain Cap / Hood */}
      <mesh position={[0, flueHeight + 0.18, 0]} castShadow={!isXRay}>
        <coneGeometry args={[0.24, 0.12, 24]} />
        <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.28} />
      </mesh>

      {/* 8. Interior Warm Core Exhaust */}
      <mesh position={[0, flueHeight + 0.06, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

interface ThermalTextureParams {
  type: "south" | "north" | "east" | "west" | "roof" | "floor";
  surfaceTemp: number;
  outdoorTemp: number;
  indoorTemp: number;
  uValue: number;
  psiBridge: number;
}

function createThermalTexture(params: ThermalTextureParams): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { type, surfaceTemp, outdoorTemp, indoorTemp, uValue, psiBridge } = params;
  const deltaT = Math.max(1, indoorTemp - outdoorTemp);

  // ISO 10211 Corner Thermal Bridging:
  // At exterior corners where 2 faces meet, temperature dips cooler
  const cornerDrop = psiBridge * (deltaT / 2.0) * Math.min(1.0, uValue / 1.5);
  const cornerTemp = surfaceTemp - cornerDrop;

  const coreColor = getThermalColor(surfaceTemp);
  const cornerColor = getThermalColor(cornerTemp);
  const midColor = getThermalColor((surfaceTemp + cornerTemp) / 2);

  if (type === "south" || type === "roof") {
    // Solar exposed surface with central absorption and cooler ISO 10211 edges
    const grad = ctx.createRadialGradient(128, 110, 15, 128, 128, 150);
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.5, midColor);
    grad.addColorStop(1, cornerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "north") {
    // Cold convective sub-zero gradient with vertical thermal stratification
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, cornerColor);
    grad.addColorStop(0.5, coreColor);
    grad.addColorStop(1, cornerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "east" || type === "west") {
    // Lateral convective gradient
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, cornerColor);
    grad.addColorStop(0.5, coreColor);
    grad.addColorStop(1, cornerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    // Floor mass
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 130);
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.7, midColor);
    grad.addColorStop(1, cornerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

  // Draw subtle ANSYS FEA Isothermal Contour Bands (Fine concentric/linear isobar lines)
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let r = 35; r <= 130; r += 28) {
    ctx.beginPath();
    ctx.arc(128, 120, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Subtle vertical corner bridge border indicator (ISO 10211)
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.strokeRect(10, 10, 236, 236);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

interface HeatFlowTextureParams {
  type: "south" | "north" | "east" | "west" | "roof" | "floor";
  flux: number;
  psiBridge: number;
}

function createHeatFlowTexture(params: HeatFlowTextureParams): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { type, flux, psiBridge } = params;
  const isGain = flux >= 0;
  const coreColor = getHeatFlowColor(flux);
  // Boundary edges and corners suffer greater conductive dissipation or peripheral dilution
  const edgeFlux = isGain ? flux * 0.7 - psiBridge * 12 : flux * 1.35 - psiBridge * 15;
  const edgeColor = getHeatFlowColor(edgeFlux);
  const midColor = getHeatFlowColor((flux + edgeFlux) / 2);

  if (type === "south" || type === "roof") {
    // Solar gain or exposed boundary: core center with edge dissipation
    const grad = ctx.createRadialGradient(128, 120, 20, 128, 128, 145);
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.6, midColor);
    grad.addColorStop(1, edgeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "north") {
    // Shaded conduction loss with vertical stratification
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, edgeColor);
    grad.addColorStop(0.5, coreColor);
    grad.addColorStop(1, edgeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "east" || type === "west") {
    // Lateral solar/convective wall
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, edgeColor);
    grad.addColorStop(0.5, coreColor);
    grad.addColorStop(1, edgeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    // Floor subgrade perimeter dissipation (ISO 13370)
    const grad = ctx.createRadialGradient(128, 128, 25, 128, 128, 130);
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.7, midColor);
    grad.addColorStop(1, edgeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

  // Draw Heat Flux Vector Streamlines & Directional Arrow Grid
  ctx.save();
  ctx.strokeStyle = isGain ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.18)";
  ctx.fillStyle = isGain ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.2;

  // Streamline chevron field
  for (let x = 44; x <= 212; x += 42) {
    for (let y = 44; y <= 212; y += 42) {
      if (isGain) {
        // Inward heat injection: arrows pointing down/inward
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y + 9);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 3.5, y + 4);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x + 3.5, y + 4);
        ctx.stroke();
      } else {
        // Outward heat conduction loss: arrows pointing up/outward
        ctx.beginPath();
        ctx.moveTo(x, y + 9);
        ctx.lineTo(x, y - 9);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 3.5, y - 4);
        ctx.lineTo(x, y - 10);
        ctx.lineTo(x + 3.5, y - 4);
        ctx.stroke();
      }
    }
  }

  // ISO 10211 Corner thermal bridge demarcation lines
  ctx.strokeStyle = isGain ? "rgba(251, 191, 36, 0.3)" : "rgba(239, 68, 68, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 236, 236);

  // Heat flux density label badge (ISO notation)
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(12, 12, 82, 22);
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = isGain ? "#fbbf24" : "#38bdf8";
  ctx.fillText(`${flux >= 0 ? "+" : ""}${Math.round(flux)} W/m²`, 18, 27);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Generates an extruded wall geometry with mathematically non-degenerate cutouts for windows and doors.
 */
function createWallGeometryWithOpenings(
  wallWidth: number,
  wallHeight: number,
  wallThickness: number,
  openings: Opening3DPlacement[]
): THREE.BufferGeometry {
  if (openings.length === 0) {
    return new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness);
  }

  const shape = new THREE.Shape();
  const hw = wallWidth / 2;
  const hh = wallHeight / 2;

  // Extend bottom down by 4cm into the foundation slab so doors at finished floor (-hh)
  // are strictly interior to the outer polygon, preventing degenerate boundary edge collisions in Earcut.
  const subgradeDrop = 0.04;
  shape.moveTo(-hw, -hh - subgradeDrop);
  shape.lineTo(hw, -hh - subgradeDrop);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  // Clockwise cutout holes for windows & doors
  for (const op of openings) {
    const [ox, oy] = op.localWallPosition;
    const halfOpeningW = op.dimensions[0] / 2;
    const halfOpeningH = op.dimensions[1] / 2;

    // Clamp coordinates safely within the wall face
    const minX = Math.max(-hw + 0.05, ox - halfOpeningW);
    const maxX = Math.min(hw - 0.05, ox + halfOpeningW);
    const minY = Math.max(-hh, oy - halfOpeningH);
    const maxY = Math.min(hh - 0.05, oy + halfOpeningH);

    const hole = new THREE.Path();
    hole.moveTo(minX, minY);
    hole.lineTo(minX, maxY);
    hole.lineTo(maxX, maxY);
    hole.lineTo(maxX, minY);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: wallThickness,
    bevelEnabled: false,
  });

  // Center along Z thickness
  geom.translate(0, 0, -wallThickness / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates an extruded triangular gable end wall (tympanum)
 * Spans width W along base and rises to height H at apex
 */
function createGableEndGeometry(width: number, height: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  g.translate(0, 0, -thickness / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Creates an extruded right-triangular wedge for East wall under Shed roof
 * In East local coordinates (+90deg around Y):
 * Local -X points to world +Z (South, height = H)
 * Local +X points to world -Z (North, height = 0)
 */
function createEastShedWedgeGeometry(depth: number, height: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hd = depth / 2;
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(-hd, height);
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  g.translate(0, 0, -thickness / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Creates an extruded right-triangular wedge for West wall under Shed roof
 * In West local coordinates (-90deg around Y):
 * Local +X points to world +Z (South, height = H)
 * Local -X points to world -Z (North, height = 0)
 */
function createWestShedWedgeGeometry(depth: number, height: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hd = depth / 2;
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(hd, height);
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  g.translate(0, 0, -thickness / 2);
  g.computeVertexNormals();
  return g;
}

export function ShelterMesh({
  model,
  selected,
  onSelect,
  settings,
  hourlyStep,
  sunHour = 12,
  solarDate = "2026-06-21",
  suppressHtmlLabels = false,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const geom = useMemo(() => deriveShelter3DGeometry(model), [model]);
  const orientation = -(model.geometry.orientation * Math.PI) / 180;
  const modelMetrics = useMemo(() => calculateThermalMetrics(model), [model]);

  const isActive = (id: string) =>
    hovered === id ||
    (selected?.type === "wall" && id === `wall-${selected.orientation}`) ||
    selected?.type === id;

  const pointer = (event: ThreeEvent<PointerEvent>, id: string | null) => {
    event.stopPropagation();
    setHovered(id);
  };

  const roofAngle = THREE.MathUtils.degToRad(model.geometry.roofAngle || 0);
  const overhang = typeof model.envelope?.roof?.overhang === "number" ? model.envelope.roof.overhang : 0.4;
  const roofSpan = model.geometry.length + overhang * 2;
  const wallThickness = geom.walls.south.dimensions[2];
  const roofThickness = Math.max(0.12, geom.roof.dimensions[1]);

  const deltaHGable = 0.5 * model.geometry.width * Math.tan(roofAngle);
  const halfRunGable = 0.5 * model.geometry.width + overhang;
  const rafterLengthGable = halfRunGable / Math.cos(roofAngle || 0.001);

  const deltaHShed = model.geometry.width * Math.tan(roofAngle);
  const slopeDepthShed = (model.geometry.width + overhang * 2) / Math.cos(roofAngle || 0.001);

  const roofSolarPanels = model.envelope?.roof?.solarPanels;
  const hasRoofSolar = roofSolarPanels?.enabled === true;
  const roofSolarTiltDeg = Math.max(0, Math.min(85, roofSolarPanels?.tiltAngleDeg ?? 30));
  const roofSolarTiltRad = THREE.MathUtils.degToRad(roofSolarTiltDeg);
  const roofSolarMounting = roofSolarPanels?.mountingType ?? "UnistrutElevated";
  const roofPanelCount = roofSolarPanels?.panelCount || Math.max(2, Math.min(6, Math.floor((roofSpan * 0.72) / 1.15)));
  const roofPanelWattage = roofSolarPanels?.panelWattageW || 400;
  const roofArrayKw = ((roofPanelCount * roofPanelWattage) / 1000).toFixed(1);

  const gableEndGeom = useMemo(() => {
    if (model.geometry.roofType !== "Gable" || model.geometry.roofAngle <= 0) return null;
    return createGableEndGeometry(model.geometry.width, deltaHGable, wallThickness);
  }, [model.geometry.roofType, model.geometry.roofAngle, model.geometry.width, deltaHGable, wallThickness]);

  const eastShedWedgeGeom = useMemo(() => {
    if (model.geometry.roofType !== "Shed" || model.geometry.roofAngle <= 0) return null;
    return createEastShedWedgeGeometry(model.geometry.width, deltaHShed, wallThickness);
  }, [model.geometry.roofType, model.geometry.roofAngle, model.geometry.width, deltaHShed, wallThickness]);

  const westShedWedgeGeom = useMemo(() => {
    if (model.geometry.roofType !== "Shed" || model.geometry.roofAngle <= 0) return null;
    return createWestShedWedgeGeometry(model.geometry.width, deltaHShed, wallThickness);
  }, [model.geometry.roofType, model.geometry.roofAngle, model.geometry.width, deltaHShed, wallThickness]);

  // Group openings by wall for cutout geometry generation
  const openingsByWall = useMemo(() => {
    const map: Record<WallOrientation, Opening3DPlacement[]> = {
      north: [],
      south: [],
      east: [],
      west: [],
    };
    geom.windows.forEach((w) => map[w.wall]?.push(w));
    geom.doors.forEach((d) => map[d.wall]?.push(d));
    return map;
  }, [geom.windows, geom.doors]);

  // Pre-generate wall geometries with real cutouts
  const wallGeometries = useMemo(() => {
    const geoms: Record<WallOrientation, THREE.BufferGeometry> = {
      north: createWallGeometryWithOpenings(
        geom.walls.north.dimensions[0],
        geom.walls.north.dimensions[1],
        geom.walls.north.dimensions[2],
        openingsByWall.north
      ),
      south: createWallGeometryWithOpenings(
        geom.walls.south.dimensions[0],
        geom.walls.south.dimensions[1],
        geom.walls.south.dimensions[2],
        openingsByWall.south
      ),
      east: createWallGeometryWithOpenings(
        geom.walls.east.dimensions[0],
        geom.walls.east.dimensions[1],
        geom.walls.east.dimensions[2],
        openingsByWall.east
      ),
      west: createWallGeometryWithOpenings(
        geom.walls.west.dimensions[0],
        geom.walls.west.dimensions[1],
        geom.walls.west.dimensions[2],
        openingsByWall.west
      ),
    };
    return geoms;
  }, [geom.walls, openingsByWall]);

  const isXRay = settings.transparentWalls;
  const isHeatFlow = settings.visualization === "heat-flow";
  const isThermal = settings.visualization === "thermal";
  const isAnalysisVisual = isThermal || isHeatFlow;
  const isModelVisual = settings.visualization === "model";
  const xrayWallOpacity = 0.14;
  const xrayEdgeOpacity = 0.88;

  const explode = useExplodeFactor(settings.explodedView);
  const isWallSelected = selected?.type === "wall";
  const isRoofSelected = selected?.type === "roof";
  const activeWallSide: WallOrientation =
    isWallSelected && selected?.orientation
      ? selected.orientation
      : "south";
  const span = Math.max(model.geometry.length, model.geometry.width);
  // Increased spread factor — walls fan out more dramatically for clearer layer inspection
  const wallExplode = (side: WallOrientation): [number, number, number] => {
    const n = geom.walls[side].normal;
    const scale = 0.55 + span * 0.18;
    return [n[0] * scale * explode, 0.18 * explode, n[2] * scale * explode];
  };
  const roofExplodeY = (model.geometry.height * 0.75 + 1.8) * explode;
  const floorExplodeY = -0.42 * explode;

  const buildingTextures = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      south: createMaterialTexture(model.envelope.walls.south.layers[0]?.materialId ?? "", model.envelope.walls.south.layers[0]?.name ?? ""),
      north: createMaterialTexture(model.envelope.walls.north.layers[0]?.materialId ?? "", model.envelope.walls.north.layers[0]?.name ?? ""),
      east: createMaterialTexture(model.envelope.walls.east.layers[0]?.materialId ?? "", model.envelope.walls.east.layers[0]?.name ?? ""),
      west: createMaterialTexture(model.envelope.walls.west.layers[0]?.materialId ?? "", model.envelope.walls.west.layers[0]?.name ?? ""),
      roof: createMaterialTexture(model.envelope.roof.layers[0]?.materialId ?? "", model.envelope.roof.layers[0]?.name ?? ""),
      floor: createMaterialTexture(model.envelope.floor.layers[0]?.materialId ?? "", model.envelope.floor.layers[0]?.name ?? ""),
    };
  }, [model.envelope]);
  const wallLayerTextures = useMemo(
    () => ({
      north: (model.envelope.walls.north.layers ?? []).map((layer) => createMaterialTexture(layer.materialId, layer.name)),
      south: (model.envelope.walls.south.layers ?? []).map((layer) => createMaterialTexture(layer.materialId, layer.name)),
      east: (model.envelope.walls.east.layers ?? []).map((layer) => createMaterialTexture(layer.materialId, layer.name)),
      west: (model.envelope.walls.west.layers ?? []).map((layer) => createMaterialTexture(layer.materialId, layer.name)),
    }),
    [model.envelope.walls]
  );
  const roofLayerTextures = useMemo(
    () => (model.envelope.roof.layers ?? []).map((layer) => createMaterialTexture(layer.materialId, layer.name)),
    [model.envelope.roof.layers]
  );
  const isRevealingRoofLayers = settings.revealLayers && explode > 0.05 && isRoofSelected;
  const roofLayers = model.envelope.roof.layers ?? [];
  const topRoofLayerDisp = (0.20 + Math.max(0, roofLayers.length - 1) * 0.26) * explode;
  const avgRoofDisp = (0.20 + (Math.max(0, roofLayers.length - 1) * 0.26) / 2) * explode;
  const floorAppearance = materialAppearance(model.envelope.floor.layers[0]?.materialId ?? "", model.envelope.floor.layers[0]?.name ?? "");
  const roofAppearance = materialAppearance(model.envelope.roof.layers[0]?.materialId ?? "", model.envelope.roof.layers[0]?.name ?? "");
  const [hoveredRoofFeature, setHoveredRoofFeature] = useState<"solar" | "chimney" | null>(null);
  const solarTexture = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createSolarPanelTexture();
  }, []);

  // Dynamically calibrated FLIR / Turbo thermal gradient maps for surfaces (ISO 6946 / ISO 10211)
  const thermalTextures = useMemo(() => {
    if (typeof window === "undefined") return null;

    const effMetrics = hourlyStep
      ? {
          tSurfaceSouth: hourlyStep.tSurfaceSouth,
          tSurfaceNorth: hourlyStep.tSurfaceNorth,
          tSurfaceEast: hourlyStep.tSurfaceEast,
          tSurfaceWest: hourlyStep.tSurfaceWest,
          tSurfaceRoof: hourlyStep.tSurfaceRoof,
          tFloorMass: hourlyStep.tFloorMass,
          tOutdoor: hourlyStep.outdoorTemp,
          tIndoor: hourlyStep.indoorTemp,
          uSouth: modelMetrics.uSouth,
          uNorth: modelMetrics.uNorth,
          uEast: modelMetrics.uEast,
          uWest: modelMetrics.uWest,
          uRoof: modelMetrics.uRoof,
          uFloor: modelMetrics.uFloor,
          psiBridge: hourlyStep.psiBridge,
        }
      : {
          tSurfaceSouth: modelMetrics.tSurfaceSouth,
          tSurfaceNorth: modelMetrics.tSurfaceNorth,
          tSurfaceEast: modelMetrics.tSurfaceEast,
          tSurfaceWest: modelMetrics.tSurfaceWest,
          tSurfaceRoof: modelMetrics.tSurfaceRoof,
          tFloorMass: modelMetrics.tFloorMass,
          tOutdoor: modelMetrics.tOutdoor,
          tIndoor: modelMetrics.tIndoor,
          uSouth: modelMetrics.uSouth,
          uNorth: modelMetrics.uNorth,
          uEast: modelMetrics.uEast,
          uWest: modelMetrics.uWest,
          uRoof: modelMetrics.uRoof,
          uFloor: modelMetrics.uFloor,
          psiBridge: modelMetrics.psiBridge,
        };

    return {
      south: createThermalTexture({
        type: "south",
        surfaceTemp: effMetrics.tSurfaceSouth,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uSouth,
        psiBridge: effMetrics.psiBridge,
      }),
      north: createThermalTexture({
        type: "north",
        surfaceTemp: effMetrics.tSurfaceNorth,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uNorth,
        psiBridge: effMetrics.psiBridge,
      }),
      east: createThermalTexture({
        type: "east",
        surfaceTemp: effMetrics.tSurfaceEast,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uEast,
        psiBridge: effMetrics.psiBridge,
      }),
      west: createThermalTexture({
        type: "west",
        surfaceTemp: effMetrics.tSurfaceWest,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uWest,
        psiBridge: effMetrics.psiBridge,
      }),
      roof: createThermalTexture({
        type: "roof",
        surfaceTemp: effMetrics.tSurfaceRoof,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uRoof,
        psiBridge: effMetrics.psiBridge,
      }),
      floor: createThermalTexture({
        type: "floor",
        surfaceTemp: effMetrics.tFloorMass,
        outdoorTemp: effMetrics.tOutdoor,
        indoorTemp: effMetrics.tIndoor,
        uValue: effMetrics.uFloor,
        psiBridge: effMetrics.psiBridge,
      }),
    };
  }, [model, hourlyStep, modelMetrics]);

  // Dynamically calibrated ISO 6946 / ISO 10211 heat flow vector maps
  const heatFlowTextures = useMemo(() => {
    if (typeof window === "undefined") return null;

    const effMetrics = hourlyStep
      ? {
          qSouth: hourlyStep.qSouthFlux,
          qNorth: hourlyStep.qNorthFlux,
          qEast: hourlyStep.qEastFlux,
          qWest: hourlyStep.qWestFlux,
          qRoof: hourlyStep.qRoofFlux,
          qFloor: hourlyStep.qFloorFlux,
          psiBridge: hourlyStep.psiBridge,
        }
      : {
          qSouth: modelMetrics.qSouthFlux,
          qNorth: modelMetrics.qNorthFlux,
          qEast: modelMetrics.qEastFlux ?? -Math.round(modelMetrics.uEast * modelMetrics.deltaT),
          qWest: modelMetrics.qWestFlux ?? -Math.round(modelMetrics.uWest * modelMetrics.deltaT),
          qRoof: modelMetrics.qRoofFlux ?? -Math.round(modelMetrics.uRoof * modelMetrics.deltaT),
          qFloor: modelMetrics.qFloorFlux ?? -18,
          psiBridge: modelMetrics.psiBridge,
        };

    return {
      south: createHeatFlowTexture({ type: "south", flux: effMetrics.qSouth, psiBridge: effMetrics.psiBridge }),
      north: createHeatFlowTexture({ type: "north", flux: effMetrics.qNorth, psiBridge: effMetrics.psiBridge }),
      east: createHeatFlowTexture({ type: "east", flux: effMetrics.qEast, psiBridge: effMetrics.psiBridge }),
      west: createHeatFlowTexture({ type: "west", flux: effMetrics.qWest, psiBridge: effMetrics.psiBridge }),
      roof: createHeatFlowTexture({ type: "roof", flux: effMetrics.qRoof, psiBridge: effMetrics.psiBridge }),
      floor: createHeatFlowTexture({ type: "floor", flux: effMetrics.qFloor, psiBridge: effMetrics.psiBridge }),
    };
  }, [hourlyStep, modelMetrics]);

  const activeAnalysisTextures = isHeatFlow ? heatFlowTextures : thermalTextures;

  return (
    <group rotation={[0, orientation, 0]}>
      {/* 1. Ground Foundation Slab */}
      <mesh
        position={addPosition(geom.floor.center, [0, floorExplodeY, 0])}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ type: "floor" });
        }}
        onPointerOver={(e) => pointer(e, "floor")}
        onPointerOut={(e) => pointer(e, null)}
      >
        <boxGeometry args={geom.floor.dimensions} />
        <meshStandardMaterial
          color={
            isXRay
              ? "#0f172a"
              : isActive("floor")
              ? palette.solar
              : isAnalysisVisual
              ? "#ffffff"
              : isModelVisual
              ? floorAppearance.color
              : palette.ink
          }
          map={
            !isXRay && isAnalysisVisual
              ? activeAnalysisTextures?.floor
              : isModelVisual && !isXRay
              ? buildingTextures?.floor
              : null
          }
          emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.floor : null}
          emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
          emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.65 : 0.45) : 0}
          roughness={isAnalysisVisual ? 0.4 : isModelVisual ? floorAppearance.roughness : 0.78}
          metalness={isModelVisual ? floorAppearance.metalness : 0}
          transparent={isXRay}
          opacity={isXRay ? 0.2 : 1}
          wireframe={settings.wireframe}
          side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {/* Floor edge lines in X-Ray mode */}
      {isXRay && (
        <lineSegments position={addPosition(geom.floor.center, [0, floorExplodeY, 0])}>
          <edgesGeometry args={[new THREE.BoxGeometry(...geom.floor.dimensions)]} />
          <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
        </lineSegments>
      )}

      {/* 2. Four Cardinal Walls with Physical Cutout Holes */}
      {(["north", "south", "east", "west"] as WallOrientation[]).map((side, wallIndex) => {
        const wall = geom.walls[side];
        const layers = model.envelope.walls[side].layers;
        // Always use actual model layers — no template substitution
        const displayLayers = layers;
        const wallGeom = wallGeometries[side];
        const active = isActive(`wall-${side}`);
        const wallPos = addPosition(wall.position, wallExplode(side));
        const wallAppearance = materialAppearance(layers[0]?.materialId ?? "", layers[0]?.name ?? "");
        const isFocusWall = isWallSelected
          ? side === selected.orientation
          : (!selected && side === "south");
        const isRevealingLayers = settings.revealLayers && explode > 0.05 && isFocusWall;

        return (
          <group key={side}>
            <mesh
              geometry={wallGeom}
              position={wallPos}
              rotation={wall.rotation}
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "wall", orientation: side });
              }}
              onPointerOver={(e) => pointer(e, `wall-${side}`)}
              onPointerOut={(e) => pointer(e, null)}
            >
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isAnalysisVisual
                    ? "#ffffff"
                    : isModelVisual
                    ? wallAppearance.color
                    : getWallMaterialColor(settings.visualization, side, active)
                }
                map={
                  !isXRay && isAnalysisVisual
                    ? activeAnalysisTextures?.[side]
                    : isModelVisual && !isXRay
                    ? buildingTextures?.[side]
                    : null
                }
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.[side] : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : isModelVisual ? wallAppearance.roughness : 0.7}
                metalness={isXRay ? 0.08 : isModelVisual ? wallAppearance.metalness : 0.04}
                wireframe={settings.wireframe}
                transparent={isXRay || (isRevealingLayers && explode > 0.1)}
                opacity={isXRay ? xrayWallOpacity : (isRevealingLayers && explode > 0.1 ? 0.22 : 1)}
                depthWrite={!isXRay && (!isRevealingLayers || explode <= 0.1)}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>

            {/* Architectural CAD Edge Lines in X-Ray mode */}
            {isXRay && (
              <lineSegments position={wallPos} rotation={wall.rotation}>
                <edgesGeometry args={[wallGeom]} />
                <lineBasicMaterial
                  color={active ? palette.solar : "#38bdf8"}
                  transparent
                  opacity={xrayEdgeOpacity}
                  linewidth={2}
                />
              </lineSegments>
            )}

            {/* Exploded Construction Layers — strictly non-overlapping, true aperture alignment, active inspection wall */}
            {isRevealingLayers ? (
              <group>
                {/* 1. Physical 3D Layer Slabs & Precise Leader Lines */}
                {displayLayers.map((layer, layerIndex) => {
                  const material = materialAppearance(layer.materialId, layer.name ?? "");
                  const normal = wall.normal;
                  const layerVisualDepth = Math.max(0.024, Math.min(layer.thickness * 1.5, 0.12));
                  const layerDisplacement = (0.3 + layerIndex * 0.35) * explode;

                  const isSouthOrNorth = side === "south" || side === "north";
                  const normalSign = side === "south" || side === "east" ? 1 : -1;
                  const avgDisp = (0.3 + ((displayLayers.length - 1) * 0.35) / 2) * explode;

                  let stackX = wallPos[0];
                  let stackZ = wallPos[2];

                  if (isSouthOrNorth) {
                    stackX = wallPos[0] + wall.dimensions[0] * 0.5 + 0.48;
                    stackZ = wallPos[2] + normalSign * avgDisp;
                  } else {
                    stackX = wallPos[0] + normalSign * avgDisp;
                    stackZ = wallPos[2] + wall.dimensions[0] * 0.5 + 0.48;
                  }

                  let layerEdgeX = wallPos[0];
                  let layerEdgeZ = wallPos[2];

                  if (isSouthOrNorth) {
                    layerEdgeX = wallPos[0] + wall.dimensions[0] * 0.5;
                    layerEdgeZ = wallPos[2] + normalSign * layerDisplacement;
                  } else {
                    layerEdgeX = wallPos[0] + normalSign * layerDisplacement;
                    layerEdgeZ = wallPos[2] + wall.dimensions[0] * 0.5;
                  }

                  return (
                    <group key={`${side}-${layer.materialId}-${layerIndex}`}>
                      <mesh
                        position={[
                          wallPos[0] + normal[0] * layerDisplacement,
                          wallPos[1],
                          wallPos[2] + normal[2] * layerDisplacement,
                        ]}
                        rotation={wall.rotation}
                        geometry={wallGeom}
                        scale={[1.0, 1.0, layerVisualDepth / wall.dimensions[2]]}
                        castShadow={!isXRay}
                        receiveShadow
                      >
                        <meshStandardMaterial
                          color={material.color}
                          map={isModelVisual ? wallLayerTextures[side][layerIndex] : null}
                          roughness={material.roughness}
                          metalness={material.metalness}
                        />
                      </mesh>

                      {/* CAD Leader Line connecting layer edge cleanly into unified callout stack */}
                      <Line
                        points={[
                          [layerEdgeX, wallPos[1], layerEdgeZ],
                          [stackX, wallPos[1], stackZ],
                        ]}
                        color={material.color}
                        lineWidth={1.5}
                        transparent
                        opacity={0.8}
                      />
                    </group>
                  );
                })}

                {/* 2. Unified CAD Assembly Callout Stack — Single architectural card, zero overlap guaranteed */}
                {(() => {
                  const isSouthOrNorth = side === "south" || side === "north";
                  const normalSign = side === "south" || side === "east" ? 1 : -1;
                  const avgDisp = (0.3 + ((displayLayers.length - 1) * 0.35) / 2) * explode;

                  let stackX = wallPos[0];
                  let stackY = wallPos[1];
                  let stackZ = wallPos[2];

                  if (isSouthOrNorth) {
                    stackX = wallPos[0] + wall.dimensions[0] * 0.5 + 0.52;
                    stackZ = wallPos[2] + normalSign * avgDisp;
                  } else {
                    stackX = wallPos[0] + normalSign * avgDisp;
                    stackZ = wallPos[2] + wall.dimensions[0] * 0.5 + 0.52;
                  }

                  const isStackVisible =
                    (selected?.type === "wall" && selected.orientation === side) ||
                    hovered === `wall-${wall.id}` ||
                    hovered === `wall-${side}` ||
                    (selected?.type !== "wall" && side === "south");

                  if (suppressHtmlLabels || !isStackVisible) return null;

                  return (
                    <Html
                      position={[stackX, stackY, stackZ]}
                      distanceFactor={14}
                      zIndexRange={[15, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <div className="cad-assembly-stack">
                        <div className="cad-stack-header">
                          <strong>{wall.name || `${side.toUpperCase()} WALL`}</strong>
                          <small>{displayLayers.length} Layers · Ext → Int</small>
                        </div>
                        <div className="cad-stack-body">
                          {displayLayers.map((layer, index) => {
                            const mat = materialAppearance(layer.materialId, layer.name ?? "");
                            const desc = layerDescription(layer.materialId, layer.name ?? "");
                            return (
                              <div
                                key={`${layer.materialId}-${index}`}
                                className="cad-stack-row"
                                style={{ "--layer-color": mat.color } as React.CSSProperties}
                                title={desc ? `${layer.name ?? layer.materialId}: ${desc}` : (layer.name ?? layer.materialId)}
                              >
                                <span className="cad-stack-idx">{index + 1}</span>
                                <span className="cad-stack-dot" style={{ backgroundColor: mat.color }} />
                                <span className="cad-stack-name">{layer.name ?? layer.materialId}</span>
                                <span className="cad-stack-thick">{Math.round(layer.thickness * 1000)} mm</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Html>
                  );
                })()}
              </group>
            ) : null}
          </group>
        );
      })}

      {/* 2.5 Attic & Clerestory Wall Extensions (Synchronized with host walls during exploded view) */}
      {model.geometry.roofType === "Gable" && model.geometry.roofAngle > 0 && gableEndGeom && (
        <group>
          {/* East Gable Wall Extension */}
          <mesh
            geometry={gableEndGeom}
            position={addPosition([model.geometry.length / 2, model.geometry.height, 0], wallExplode("east"))}
            rotation={[0, Math.PI / 2, 0]}
            castShadow={!isXRay}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "wall", orientation: "east" });
            }}
          >
            <meshStandardMaterial
              color={
                isXRay
                  ? palette.xrayTint
                  : isAnalysisVisual
                  ? "#ffffff"
                  : getWallMaterialColor(settings.visualization, "east", isActive("wall-east"))
              }
              map={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.east : null}
              emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.east : null}
              emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
              emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
              roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : 0.7}
              metalness={isXRay ? 0.08 : 0.04}
              wireframe={settings.wireframe}
              transparent={isXRay}
              opacity={isXRay ? xrayWallOpacity : 1}
              depthWrite={!isXRay}
              side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>

          {/* West Gable Wall Extension */}
          <mesh
            geometry={gableEndGeom}
            position={addPosition([-model.geometry.length / 2, model.geometry.height, 0], wallExplode("west"))}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow={!isXRay}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "wall", orientation: "west" });
            }}
          >
            <meshStandardMaterial
              color={
                isXRay
                  ? palette.xrayTint
                  : isAnalysisVisual
                  ? "#ffffff"
                  : getWallMaterialColor(settings.visualization, "west", isActive("wall-west"))
              }
              map={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.west : null}
              emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.west : null}
              emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
              emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
              roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : 0.7}
              metalness={isXRay ? 0.08 : 0.04}
              wireframe={settings.wireframe}
              transparent={isXRay}
              opacity={isXRay ? xrayWallOpacity : 1}
              depthWrite={!isXRay}
              side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        </group>
      )}

      {model.geometry.roofType === "Shed" && model.geometry.roofAngle > 0 && (
        <group>
          {/* High Wall (South) Clerestory Upper Wall Extension */}
          <mesh
            position={addPosition(
              [0, model.geometry.height + deltaHShed / 2, model.geometry.width / 2 + wallThickness / 2],
              wallExplode("south")
            )}
            castShadow={!isXRay}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "wall", orientation: "south" });
            }}
          >
            <boxGeometry args={[model.geometry.length, deltaHShed, wallThickness]} />
            <meshStandardMaterial
              color={
                isXRay
                  ? palette.xrayTint
                  : isAnalysisVisual
                  ? "#ffffff"
                  : getWallMaterialColor(settings.visualization, "south", isActive("wall-south"))
              }
              map={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.south : null}
              emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.south : null}
              emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
              emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
              roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : 0.7}
              metalness={isXRay ? 0.08 : 0.04}
              wireframe={settings.wireframe}
              transparent={isXRay}
              opacity={isXRay ? xrayWallOpacity : 1}
              depthWrite={!isXRay}
              side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>

          {/* East Shed Triangular Wedge Wall */}
          {eastShedWedgeGeom && (
            <mesh
              geometry={eastShedWedgeGeom}
              position={addPosition([model.geometry.length / 2 + wallThickness / 2, model.geometry.height, 0], wallExplode("east"))}
              rotation={[0, Math.PI / 2, 0]}
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "wall", orientation: "east" });
              }}
            >
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isAnalysisVisual
                    ? "#ffffff"
                    : getWallMaterialColor(settings.visualization, "east", isActive("wall-east"))
                }
                map={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.east : null}
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.east : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : 0.7}
                metalness={isXRay ? 0.08 : 0.04}
                wireframe={settings.wireframe}
                transparent={isXRay}
                opacity={isXRay ? xrayWallOpacity : 1}
                depthWrite={!isXRay}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
          )}

          {/* West Shed Triangular Wedge Wall */}
          {westShedWedgeGeom && (
            <mesh
              geometry={westShedWedgeGeom}
              position={addPosition([-model.geometry.length / 2 - wallThickness / 2, model.geometry.height, 0], wallExplode("west"))}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "wall", orientation: "west" });
              }}
            >
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isAnalysisVisual
                    ? "#ffffff"
                    : getWallMaterialColor(settings.visualization, "west", isActive("wall-west"))
                }
                map={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.west : null}
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.west : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.7 : 0.6) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : 0.7}
                metalness={isXRay ? 0.08 : 0.04}
                wireframe={settings.wireframe}
                transparent={isXRay}
                opacity={isXRay ? xrayWallOpacity : 1}
                depthWrite={!isXRay}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
          )}
        </group>
      )}

      {/* 3. Roof System (Gable, Shed, or Flat) with full architectural accuracy */}
      <group position={[0, roofExplodeY, 0]}>
      {model.geometry.roofType === "Gable" && model.geometry.roofAngle > 0 ? (
        <group>
          {/* Pitch 1: South facing panel */}
          <group
            position={[
              0,
              model.geometry.height + deltaHGable / 2 + 0.02,
              halfRunGable / 2,
            ]}
            rotation={[roofAngle, 0, 0]}
          >
            <mesh
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "roof" });
              }}
              onPointerOver={(e) => pointer(e, "roof")}
              onPointerOut={(e) => pointer(e, null)}
            >
              <boxGeometry args={[roofSpan, roofThickness, rafterLengthGable]} />
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isActive("roof")
                    ? palette.solar
                    : isAnalysisVisual
                    ? "#ffffff"
                    : isModelVisual
                    ? roofAppearance.color
                    : palette.charcoal
                }
                map={
                  !isXRay && isAnalysisVisual
                    ? activeAnalysisTextures?.roof
                    : isModelVisual && !isXRay
                    ? buildingTextures?.roof
                    : null
                }
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.roof : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.65 : 0.55) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : isModelVisual ? roofAppearance.roughness : 0.48}
                metalness={isXRay ? 0.08 : isModelVisual ? roofAppearance.metalness : 0.22}
                wireframe={settings.wireframe}
                transparent={isXRay || (isRevealingRoofLayers && explode > 0.1)}
                opacity={isXRay ? xrayWallOpacity : (isRevealingRoofLayers && explode > 0.1 ? 0.18 : 1)}
                depthWrite={!isXRay && (!isRevealingRoofLayers || explode <= 0.1)}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
            {isXRay && (
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(roofSpan, roofThickness, rafterLengthGable)]} />
                <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
              </lineSegments>
            )}

            {/* Exploded Roof Construction Layers & Unified CAD Assembly Callout */}
            {isRevealingRoofLayers ? (
              <group>
                {roofLayers.map((layer, index) => {
                  const mat = materialAppearance(layer.materialId, layer.name ?? "");
                  const layerDepth = Math.max(0.024, Math.min(layer.thickness * 1.5, 0.10));
                  const layerDisp = (0.20 + (roofLayers.length - 1 - index) * 0.26) * explode;
                  const layerEdgeX = roofSpan / 2;
                  const stackX = roofSpan / 2 + 0.52;
                  const stackY = avgRoofDisp + 0.20;

                  return (
                    <group key={`gable-roof-layer-${layer.materialId}-${index}`}>
                      <mesh
                        position={[0, layerDisp, 0]}
                        castShadow={!isXRay}
                        receiveShadow
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect({ type: "roof" });
                        }}
                      >
                        <boxGeometry args={[roofSpan, layerDepth, rafterLengthGable]} />
                        <meshStandardMaterial
                          color={mat.color}
                          map={isModelVisual ? roofLayerTextures[index] : null}
                          roughness={mat.roughness}
                          metalness={mat.metalness}
                        />
                      </mesh>

                      {/* CAD Leader Line */}
                      <Line
                        points={[
                          [layerEdgeX, layerDisp, 0],
                          [stackX, stackY, 0],
                        ]}
                        color={mat.color}
                        lineWidth={1.5}
                        transparent
                        opacity={0.8}
                      />
                    </group>
                  );
                })}

                {/* Unified CAD Roof Assembly Callout Stack */}
                {!suppressHtmlLabels && (
                  <Html
                    position={[roofSpan / 2 + 0.55, avgRoofDisp + 0.20, 0]}
                    distanceFactor={14}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="cad-assembly-stack cad-roof-stack">
                      <div className="cad-stack-header">
                        <strong>{model.envelope.roof.name || "GABLE ROOF SYSTEM"}</strong>
                        <small>{roofLayers.length} Layers · U: {modelMetrics.uRoof.toFixed(2)} W/m²K</small>
                      </div>
                      <div className="cad-stack-body">
                        {roofLayers.map((layer, index) => {
                          const mat = materialAppearance(layer.materialId, layer.name ?? "");
                          const desc = layerDescription(layer.materialId, layer.name ?? "");
                          return (
                            <div
                              key={`gable-callout-${layer.materialId}-${index}`}
                              className="cad-stack-row"
                              style={{ "--layer-color": mat.color } as React.CSSProperties}
                              title={desc ? `${layer.name ?? layer.materialId}: ${desc}` : (layer.name ?? layer.materialId)}
                            >
                              <span className="cad-stack-idx">{index + 1}</span>
                              <span className="cad-stack-dot" style={{ backgroundColor: mat.color }} />
                              <span className="cad-stack-name">{layer.name ?? layer.materialId}</span>
                              <span className="cad-stack-thick">{Math.round(layer.thickness * 1000)} mm</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Html>
                )}
              </group>
            ) : null}

            {/* High-Efficiency South-Facing Photovoltaic Solar Array mounted on outermost roof plane */}
            {hasRoofSolar && (() => {
              const gableExtraTiltDeg = roofSolarMounting === "FlushMount"
                ? 0
                : Math.max(0, roofSolarTiltDeg - (model.geometry.roofAngle || 0));
              const gableExtraTiltRad = THREE.MathUtils.degToRad(gableExtraTiltDeg);
              return (
                <group
                  position={[
                    0,
                    roofThickness / 2 + 0.038 + (isRevealingRoofLayers ? topRoofLayerDisp : 0) + Math.sin(gableExtraTiltRad) * 0.14,
                    0,
                  ]}
                  rotation={[gableExtraTiltRad, 0, 0]}
                >
                  {/* Elevated unistrut rear standoff struts if extra tilt is present */}
                  {gableExtraTiltDeg > 2 && (
                    [-roofSpan * 0.28, 0, roofSpan * 0.28].map((rx, idx) => (
                      <mesh key={`gable-standoff-${idx}`} position={[rx, -Math.sin(gableExtraTiltRad) * 0.10, -rafterLengthGable * 0.22]}>
                        <cylinderGeometry args={[0.012, 0.012, Math.max(0.04, Math.sin(gableExtraTiltRad) * 0.40), 8]} />
                        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                      </mesh>
                    ))
                  )}
                  <SolarArray
                    span={roofSpan}
                    rafterDepth={rafterLengthGable}
                    texture={solarTexture}
                    isXRay={isXRay}
                    panelCount={roofPanelCount}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredRoofFeature("solar");
                    }}
                    onPointerOut={() => setHoveredRoofFeature(null)}
                  />
                  {hoveredRoofFeature === "solar" && !suppressHtmlLabels && (
                    <Html
                      position={[0, 0.45, 0]}
                      center
                      distanceFactor={14}
                      zIndexRange={[15, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <div className="cad-minimal-tooltip cad-solar-callout" style={{ minWidth: 190 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.9rem" }}>⚡</span>
                          <strong>Rooftop Solar PV Array</strong>
                        </div>
                        <span>{roofPanelCount} Monocrystalline Modules ({roofSolarTiltDeg}° Tilt)</span>
                        <span>Peak Capacity: {roofArrayKw} kWp · 21.5% Efficiency</span>
                        <small>South-Facing Gable · {roofSolarMounting}</small>
                      </div>
                    </Html>
                  )}
                </group>
              );
            })()}
          </group>

          {/* Pitch 2: North facing panel */}
          <group
            position={[
              0,
              model.geometry.height + deltaHGable / 2 + 0.02,
              -halfRunGable / 2,
            ]}
            rotation={[-roofAngle, 0, 0]}
          >
            <mesh
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "roof" });
              }}
              onPointerOver={(e) => pointer(e, "roof")}
              onPointerOut={(e) => pointer(e, null)}
            >
              <boxGeometry args={[roofSpan, roofThickness, rafterLengthGable]} />
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isActive("roof")
                    ? palette.solar
                    : isAnalysisVisual
                    ? "#ffffff"
                    : isModelVisual
                    ? roofAppearance.color
                    : palette.charcoal
                }
                map={
                  !isXRay && isAnalysisVisual
                    ? activeAnalysisTextures?.roof
                    : isModelVisual && !isXRay
                    ? buildingTextures?.roof
                    : null
                }
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.roof : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.65 : 0.55) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : isModelVisual ? roofAppearance.roughness : 0.48}
                metalness={isXRay ? 0.08 : isModelVisual ? roofAppearance.metalness : 0.22}
                wireframe={settings.wireframe}
                transparent={isXRay}
                opacity={isXRay ? xrayWallOpacity : 1}
                depthWrite={!isXRay}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
            {isXRay && (
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(roofSpan, roofThickness, rafterLengthGable)]} />
                <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
              </lineSegments>
            )}
          </group>

          {/* Architectural Ridge Capping Flashing */}
          <mesh
            position={[
              0,
              model.geometry.height + deltaHGable + roofThickness / 2 + 0.01 + (isRevealingRoofLayers ? topRoofLayerDisp * 0.5 : 0),
              0,
            ]}
            castShadow={!isXRay}
          >
            <boxGeometry args={[roofSpan + 0.02, 0.06, 0.24]} />
            <meshStandardMaterial
              color={isActive("roof") ? palette.solar : palette.slate}
              metalness={0.4}
              roughness={0.4}
            />
          </mesh>

          {/* Alpine Class-A Insulated Chimney Flue (North slope near ridge — zero shading on PV) */}
          {(() => {
            const chimneyX = model.geometry.length * 0.28;
            const chimneyZ = -halfRunGable * 0.42;
            const chimneyBaseY = model.geometry.height + deltaHGable * (1 - 0.42) + roofThickness / 2;
            const chimneyFlueHeight = Math.max(1.35, (model.geometry.height + deltaHGable + 0.68) - chimneyBaseY);

            return (
              <group position={[chimneyX, chimneyBaseY, chimneyZ]}>
                <ChimneyFlue
                  flueHeight={chimneyFlueHeight}
                  isXRay={isXRay}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredRoofFeature("chimney");
                  }}
                  onPointerOut={() => setHoveredRoofFeature(null)}
                />
                {hoveredRoofFeature === "chimney" && !suppressHtmlLabels && (
                  <Html
                    position={[0, chimneyFlueHeight + 0.35, 0]}
                    center
                    distanceFactor={14}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="cad-minimal-tooltip" style={{ minWidth: 190, borderColor: "#f97316" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.9rem" }}>🔥</span>
                        <strong style={{ color: "#fb923c" }}>Alpine Stove Flue</strong>
                      </div>
                      <span>Class-A Double-Wall Insulated Steel</span>
                      <span>Height: {chimneyFlueHeight.toFixed(2)}m · Spark Arrestor</span>
                      <small>North Slope Draft · Zero PV Shading</small>
                    </div>
                  </Html>
                )}
              </group>
            );
          })()}
        </group>
      ) : model.geometry.roofType === "Shed" && model.geometry.roofAngle > 0 ? (
        <group>
          {/* Sloping Monopitch Shed Roof Slab */}
          <group
            position={[
              0,
              model.geometry.height + deltaHShed / 2 + (roofThickness / 2) / Math.cos(roofAngle),
              0,
            ]}
            rotation={[-roofAngle, 0, 0]}
          >
            <mesh
              castShadow={!isXRay}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "roof" });
              }}
              onPointerOver={(e) => pointer(e, "roof")}
              onPointerOut={(e) => pointer(e, null)}
            >
              <boxGeometry args={[roofSpan, roofThickness, slopeDepthShed]} />
              <meshStandardMaterial
                color={
                  isXRay
                    ? palette.xrayTint
                    : isActive("roof")
                    ? palette.solar
                    : isAnalysisVisual
                    ? "#ffffff"
                    : isModelVisual
                    ? roofAppearance.color
                    : palette.charcoal
                }
                map={
                  !isXRay && isAnalysisVisual
                    ? activeAnalysisTextures?.roof
                    : isModelVisual && !isXRay
                    ? buildingTextures?.roof
                    : null
                }
                emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.roof : null}
                emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.65 : 0.55) : 0}
                roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : isModelVisual ? roofAppearance.roughness : 0.48}
                metalness={isXRay ? 0.08 : isModelVisual ? roofAppearance.metalness : 0.22}
                wireframe={settings.wireframe}
                transparent={isXRay || (isRevealingRoofLayers && explode > 0.1)}
                opacity={isXRay ? xrayWallOpacity : (isRevealingRoofLayers && explode > 0.1 ? 0.18 : 1)}
                depthWrite={!isXRay && (!isRevealingRoofLayers || explode <= 0.1)}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
            {isXRay && (
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(roofSpan, roofThickness, slopeDepthShed)]} />
                <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
              </lineSegments>
            )}

            {/* Exploded Shed Roof Construction Layers & Unified CAD Assembly Callout */}
            {isRevealingRoofLayers ? (
              <group>
                {roofLayers.map((layer, index) => {
                  const mat = materialAppearance(layer.materialId, layer.name ?? "");
                  const layerDepth = Math.max(0.024, Math.min(layer.thickness * 1.5, 0.10));
                  const layerDisp = (0.20 + (roofLayers.length - 1 - index) * 0.26) * explode;
                  const layerEdgeX = roofSpan / 2;
                  const stackX = roofSpan / 2 + 0.52;
                  const stackY = avgRoofDisp + 0.20;

                  return (
                    <group key={`shed-roof-layer-${layer.materialId}-${index}`}>
                      <mesh
                        position={[0, layerDisp, 0]}
                        castShadow={!isXRay}
                        receiveShadow
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect({ type: "roof" });
                        }}
                      >
                        <boxGeometry args={[roofSpan, layerDepth, slopeDepthShed]} />
                        <meshStandardMaterial
                          color={mat.color}
                          map={isModelVisual ? roofLayerTextures[index] : null}
                          roughness={mat.roughness}
                          metalness={mat.metalness}
                        />
                      </mesh>

                      {/* CAD Leader Line */}
                      <Line
                        points={[
                          [layerEdgeX, layerDisp, 0],
                          [stackX, stackY, 0],
                        ]}
                        color={mat.color}
                        lineWidth={1.5}
                        transparent
                        opacity={0.8}
                      />
                    </group>
                  );
                })}

                {/* Unified CAD Roof Assembly Callout Stack */}
                {!suppressHtmlLabels && (
                  <Html
                    position={[roofSpan / 2 + 0.55, avgRoofDisp + 0.20, 0]}
                    distanceFactor={14}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="cad-assembly-stack cad-roof-stack">
                      <div className="cad-stack-header">
                        <strong>{model.envelope.roof.name || "SHED ROOF SYSTEM"}</strong>
                        <small>{roofLayers.length} Layers · U: {modelMetrics.uRoof.toFixed(2)} W/m²K</small>
                      </div>
                      <div className="cad-stack-body">
                        {roofLayers.map((layer, index) => {
                          const mat = materialAppearance(layer.materialId, layer.name ?? "");
                          const desc = layerDescription(layer.materialId, layer.name ?? "");
                          return (
                            <div
                              key={`shed-callout-${layer.materialId}-${index}`}
                              className="cad-stack-row"
                              style={{ "--layer-color": mat.color } as React.CSSProperties}
                              title={desc ? `${layer.name ?? layer.materialId}: ${desc}` : (layer.name ?? layer.materialId)}
                            >
                              <span className="cad-stack-idx">{index + 1}</span>
                              <span className="cad-stack-dot" style={{ backgroundColor: mat.color }} />
                              <span className="cad-stack-name">{layer.name ?? layer.materialId}</span>
                              <span className="cad-stack-thick">{Math.round(layer.thickness * 1000)} mm</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Html>
                )}
              </group>
            ) : null}

            {/* Monocrystalline Solar PV Array mounted on Shed Roof */}
            {hasRoofSolar && (() => {
              const shedRelativeTiltDeg = Math.min(80, roofSolarTiltDeg + (model.geometry.roofAngle || 0));
              const shedRelativeTiltRad = THREE.MathUtils.degToRad(shedRelativeTiltDeg);
              return (
                <group
                  position={[
                    0,
                    roofThickness / 2 + 0.038 + (isRevealingRoofLayers ? topRoofLayerDisp : 0) + Math.sin(shedRelativeTiltRad) * 0.12,
                    slopeDepthShed * 0.06,
                  ]}
                  rotation={[shedRelativeTiltRad, 0, 0]}
                >
                  <SolarArray
                    span={roofSpan}
                    rafterDepth={slopeDepthShed * 0.65}
                    texture={solarTexture}
                    isXRay={isXRay}
                    panelCount={roofPanelCount}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredRoofFeature("solar");
                    }}
                    onPointerOut={() => setHoveredRoofFeature(null)}
                  />
                  {hoveredRoofFeature === "solar" && !suppressHtmlLabels && (
                    <Html
                      position={[0, 0.45, 0]}
                      center
                      distanceFactor={14}
                      zIndexRange={[15, 0]}
                      style={{ pointerEvents: "none" }}
                    >
                      <div className="cad-minimal-tooltip cad-solar-callout" style={{ minWidth: 190 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ fontSize: "0.9rem" }}>⚡</span>
                          <strong>Rooftop Solar PV Array</strong>
                        </div>
                        <span>{roofPanelCount} Monocrystalline Modules ({roofSolarTiltDeg}° Tilt)</span>
                        <span>Peak Capacity: {roofArrayKw} kWp · 21.5% Efficiency</span>
                        <small>Shed Slope Mounted · {roofSolarMounting}</small>
                      </div>
                    </Html>
                  )}
                </group>
              );
            })()}
          </group>

          {/* Alpine Class-A Insulated Chimney Flue on Shed Roof */}
          {(() => {
            const chimneyX = model.geometry.length * 0.28;
            const chimneyZ = -model.geometry.width * 0.22;
            const shedYAtZ =
              model.geometry.height +
              deltaHShed / 2 +
              roofThickness / 2 / Math.cos(roofAngle) +
              chimneyZ * Math.tan(roofAngle);
            const chimneyFlueHeight = Math.max(
              1.35,
              model.geometry.height + deltaHShed + 0.65 - shedYAtZ
            );

            return (
              <group position={[chimneyX, shedYAtZ + (isRevealingRoofLayers ? topRoofLayerDisp : 0), chimneyZ]}>
                <ChimneyFlue
                  flueHeight={chimneyFlueHeight}
                  isXRay={isXRay}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredRoofFeature("chimney");
                  }}
                  onPointerOut={() => setHoveredRoofFeature(null)}
                />
                {hoveredRoofFeature === "chimney" && !suppressHtmlLabels && (
                  <Html
                    position={[0, chimneyFlueHeight + 0.35, 0]}
                    center
                    distanceFactor={14}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="cad-minimal-tooltip" style={{ minWidth: 190, borderColor: "#f97316" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.9rem" }}>🔥</span>
                        <strong style={{ color: "#fb923c" }}>Alpine Stove Flue</strong>
                      </div>
                      <span>Class-A Double-Wall Insulated Steel</span>
                      <span>Height: {chimneyFlueHeight.toFixed(2)}m · Spark Arrestor</span>
                      <small>Natural Draft · High Ridge Penetration</small>
                    </div>
                  </Html>
                )}
              </group>
            );
          })()}
        </group>
      ) : (
        /* Flat Roof System with Architectural Eaves & Parapet Rim */
        <group position={[0, model.geometry.height + roofThickness / 2, 0]}>
          {/* Insulated Roof Deck */}
          <mesh
            castShadow={!isXRay}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "roof" });
            }}
            onPointerOver={(e) => pointer(e, "roof")}
            onPointerOut={(e) => pointer(e, null)}
          >
            <boxGeometry args={[roofSpan, roofThickness, model.geometry.width + overhang * 2]} />
            <meshStandardMaterial
              color={
                isXRay
                  ? palette.xrayTint
                  : isActive("roof")
                  ? palette.solar
                  : isAnalysisVisual
                  ? "#ffffff"
                  : isModelVisual
                  ? roofAppearance.color
                  : palette.charcoal
              }
              map={
                !isXRay && isAnalysisVisual
                  ? activeAnalysisTextures?.roof
                  : isModelVisual && !isXRay
                  ? buildingTextures?.roof
                  : null
              }
              emissiveMap={!isXRay && isAnalysisVisual ? activeAnalysisTextures?.roof : null}
              emissive={!isXRay && isAnalysisVisual ? "#ffffff" : "#000000"}
              emissiveIntensity={!isXRay && isAnalysisVisual ? (isHeatFlow ? 0.65 : 0.55) : 0}
              roughness={isXRay ? 0.15 : isAnalysisVisual ? 0.45 : isModelVisual ? roofAppearance.roughness : 0.48}
              metalness={isXRay ? 0.08 : isModelVisual ? roofAppearance.metalness : 0.22}
              wireframe={settings.wireframe}
              transparent={isXRay || (isRevealingRoofLayers && explode > 0.1)}
              opacity={isXRay ? xrayWallOpacity : (isRevealingRoofLayers && explode > 0.1 ? 0.18 : 1)}
              depthWrite={!isXRay && (!isRevealingRoofLayers || explode <= 0.1)}
              side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>

          {/* Architectural Perimeter Fascia Trim (Drip edge) */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(roofSpan, roofThickness, model.geometry.width + overhang * 2)]} />
            <lineBasicMaterial color={isXRay ? "#38bdf8" : "#94a3b8"} transparent opacity={0.6} />
          </lineSegments>

          {/* Vernacular Ladakhi Parapet Wall Rim (when overhang <= 0.15m) */}
          {overhang <= 0.15 && !isXRay && (
            <group position={[0, roofThickness / 2 + 0.10 + (isRevealingRoofLayers ? topRoofLayerDisp : 0), 0]}>
              {/* South parapet */}
              <mesh position={[0, 0, model.geometry.width / 2]}>
                <boxGeometry args={[model.geometry.length + wallThickness * 2, 0.20, 0.14]} />
                <meshStandardMaterial color={palette.slate} roughness={0.8} />
              </mesh>
              {/* North parapet */}
              <mesh position={[0, 0, -model.geometry.width / 2]}>
                <boxGeometry args={[model.geometry.length + wallThickness * 2, 0.20, 0.14]} />
                <meshStandardMaterial color={palette.slate} roughness={0.8} />
              </mesh>
              {/* East parapet */}
              <mesh position={[model.geometry.length / 2, 0, 0]}>
                <boxGeometry args={[0.14, 0.20, model.geometry.width]} />
                <meshStandardMaterial color={palette.slate} roughness={0.8} />
              </mesh>
              {/* West parapet */}
              <mesh position={[-model.geometry.length / 2, 0, 0]}>
                <boxGeometry args={[0.14, 0.20, model.geometry.width]} />
                <meshStandardMaterial color={palette.slate} roughness={0.8} />
              </mesh>
            </group>
          )}

          {/* Exploded Flat Roof Construction Layers & Unified CAD Assembly Callout */}
          {isRevealingRoofLayers ? (
            <group>
              {roofLayers.map((layer, index) => {
                const mat = materialAppearance(layer.materialId, layer.name ?? "");
                const layerDepth = Math.max(0.024, Math.min(layer.thickness * 1.5, 0.10));
                const layerDisp = (0.20 + (roofLayers.length - 1 - index) * 0.26) * explode;
                const layerEdgeX = roofSpan / 2;
                const stackX = roofSpan / 2 + 0.52;
                const stackY = avgRoofDisp + 0.20;

                return (
                  <group key={`flat-roof-layer-${layer.materialId}-${index}`}>
                    <mesh
                      position={[0, layerDisp, 0]}
                      castShadow={!isXRay}
                      receiveShadow
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect({ type: "roof" });
                      }}
                    >
                      <boxGeometry args={[roofSpan, layerDepth, model.geometry.width + overhang * 2]} />
                      <meshStandardMaterial
                        color={mat.color}
                        map={isModelVisual ? roofLayerTextures[index] : null}
                        roughness={mat.roughness}
                        metalness={mat.metalness}
                      />
                    </mesh>

                    {/* CAD Leader Line */}
                    <Line
                      points={[
                        [layerEdgeX, layerDisp, 0],
                        [stackX, stackY, 0],
                      ]}
                      color={mat.color}
                      lineWidth={1.5}
                      transparent
                      opacity={0.8}
                    />
                  </group>
                );
              })}

              {/* Unified CAD Roof Assembly Callout Stack */}
              {!suppressHtmlLabels && (
                <Html
                  position={[roofSpan / 2 + 0.55, avgRoofDisp + 0.20, 0]}
                  distanceFactor={14}
                  zIndexRange={[15, 0]}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="cad-assembly-stack cad-roof-stack">
                    <div className="cad-stack-header">
                      <strong>{model.envelope.roof.name || "FLAT ROOF SYSTEM"}</strong>
                      <small>{roofLayers.length} Layers · U: {modelMetrics.uRoof.toFixed(2)} W/m²K</small>
                    </div>
                    <div className="cad-stack-body">
                      {roofLayers.map((layer, index) => {
                        const mat = materialAppearance(layer.materialId, layer.name ?? "");
                        const desc = layerDescription(layer.materialId, layer.name ?? "");
                        return (
                          <div
                            key={`flat-callout-${layer.materialId}-${index}`}
                            className="cad-stack-row"
                            style={{ "--layer-color": mat.color } as React.CSSProperties}
                            title={desc ? `${layer.name ?? layer.materialId}: ${desc}` : (layer.name ?? layer.materialId)}
                          >
                            <span className="cad-stack-idx">{index + 1}</span>
                            <span className="cad-stack-dot" style={{ backgroundColor: mat.color }} />
                            <span className="cad-stack-name">{layer.name ?? layer.materialId}</span>
                            <span className="cad-stack-thick">{Math.round(layer.thickness * 1000)} mm</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Html>
              )}
            </group>
          ) : null}

          {/* Flat Roof: South-Tilted Ballast-Mounted Photovoltaic Solar Array */}
          {hasRoofSolar && (
            <group position={[0, roofThickness / 2 + (isRevealingRoofLayers ? topRoofLayerDisp : 0), model.geometry.width * 0.08]}>
              {/* Unrotated Precast Concrete Ballast Footings (Sitting Flat on Roof Deck) */}
              {[-roofSpan * 0.28, 0, roofSpan * 0.28].map((rx, idx) => {
                const rafterD = Math.min(1.85, model.geometry.width * 0.5);
                const rearStrutH = Math.max(0.08, Math.min(1.1, rafterD * 0.72 * Math.sin(roofSolarTiltRad)));
                return (
                  <group key={`flat-ballast-${idx}`} position={[rx, 0, 0]}>
                    {/* Concrete ballast block sitting flat on roof deck */}
                    <mesh position={[0, 0.04, 0]}>
                      <boxGeometry args={[0.24, 0.08, 0.52]} />
                      <meshStandardMaterial color="#64748b" roughness={0.9} />
                    </mesh>
                    {/* Front low pivot bracket */}
                    <mesh position={[0, 0.09, 0.16]}>
                      <boxGeometry args={[0.06, 0.05, 0.06]} />
                      <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                    </mesh>
                    {/* Rear vertical/diagonal aluminum strut rising to tilted rack */}
                    <mesh position={[0, 0.08 + rearStrutH / 2, -0.16]}>
                      <cylinderGeometry args={[0.016, 0.016, rearStrutH, 8]} />
                      <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                );
              })}

              {/* Dynamic Tilted Array Group */}
              <group
                position={[0, 0.10 + Math.sin(roofSolarTiltRad) * 0.18, 0]}
                rotation={[roofSolarTiltRad, 0, 0]}
              >
                <SolarArray
                  span={roofSpan}
                  rafterDepth={Math.min(1.85, model.geometry.width * 0.5)}
                  texture={solarTexture}
                  isXRay={isXRay}
                  panelCount={roofPanelCount}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredRoofFeature("solar");
                  }}
                  onPointerOut={() => setHoveredRoofFeature(null)}
                />
                {hoveredRoofFeature === "solar" && !suppressHtmlLabels && (
                  <Html
                    position={[0, 0.45, 0]}
                    center
                    distanceFactor={14}
                    zIndexRange={[15, 0]}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="cad-minimal-tooltip cad-solar-callout" style={{ minWidth: 195 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.9rem" }}>⚡</span>
                        <strong>Ballasted Solar PV Array</strong>
                      </div>
                      <span>{roofPanelCount} Monocrystalline Modules ({roofSolarTiltDeg}° Tilt)</span>
                      <span>Peak Capacity: {roofArrayKw} kWp · 21.5% Efficiency</span>
                      <small>{roofSolarMounting} · South-Facing Racking</small>
                    </div>
                  </Html>
                )}
              </group>
            </group>
          )}

          {/* Alpine Class-A Insulated Chimney Flue on Flat Roof Deck */}
          <group position={[model.geometry.length * 0.28, roofThickness / 2 + (isRevealingRoofLayers ? topRoofLayerDisp : 0), -model.geometry.width * 0.26]}>
            <ChimneyFlue
              flueHeight={1.42}
              isXRay={isXRay}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredRoofFeature("chimney");
              }}
              onPointerOut={() => setHoveredRoofFeature(null)}
            />
            {hoveredRoofFeature === "chimney" && !suppressHtmlLabels && (
              <Html
                position={[0, 1.42 + 0.35, 0]}
                center
                distanceFactor={14}
                zIndexRange={[15, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="cad-minimal-tooltip" style={{ minWidth: 190, borderColor: "#f97316" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.9rem" }}>🔥</span>
                    <strong style={{ color: "#fb923c" }}>Alpine Stove Flue</strong>
                  </div>
                  <span>Class-A Double-Wall Insulated Steel</span>
                  <span>Height: 1.42m · Spark Arrestor Hood</span>
                  <small>Natural Draft · High Wind Flashing Boot</small>
                </div>
              </Html>
            )}
          </group>
        </group>
      )}
      </group>

      {/* 4. Windows Assemblies with Real Frames, Double Glazing & Sills */}
      {geom.windows.map((win, index) => {
        const isSelected = selected?.type === "window" && selected.id === win.id;
        const isHovered = hovered === `window-${win.id}`;
        const active = isSelected || isHovered;
        const source = model.windows.find((item) => item.id === win.id);
        const [wWidth, wHeight, wDepth] = win.dimensions;
        const frameThickness = 0.06;
        const glassThickness = 0.024;
        const glassWidth = Math.max(0.1, wWidth - frameThickness * 2);
        const glassHeight = Math.max(0.1, wHeight - frameThickness * 2);
        const overhangProj = source?.shadingOverhang || 0;

        const winPos = addPosition(win.worldPosition, wallExplode(win.wall));

        return (
          <group
            key={win.id}
            position={winPos}
            rotation={win.rotation}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "window", id: win.id });
            }}
            onPointerOver={(e) => pointer(e, `window-${win.id}`)}
            onPointerOut={(e) => pointer(e, null)}
          >
            {/* Window Frame: Top Header */}
            <mesh position={[0, wHeight / 2 - frameThickness / 2, 0]} castShadow>
              <boxGeometry args={[wWidth, frameThickness, wDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.35}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Window Frame: Bottom Sill Member */}
            <mesh position={[0, -wHeight / 2 + frameThickness / 2, 0]} castShadow>
              <boxGeometry args={[wWidth, frameThickness, wDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.35}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Window Frame: Left Jamb */}
            <mesh position={[-wWidth / 2 + frameThickness / 2, 0, 0]} castShadow>
              <boxGeometry args={[frameThickness, wHeight - frameThickness * 2, wDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.35}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Window Frame: Right Jamb */}
            <mesh position={[wWidth / 2 - frameThickness / 2, 0, 0]} castShadow>
              <boxGeometry args={[frameThickness, wHeight - frameThickness * 2, wDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.35}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Vertical Mullion divider for wide windows */}
            {wWidth > 1.3 ? (
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.045, wHeight - frameThickness * 2, wDepth * 0.9]} />
                <meshStandardMaterial
                  color={active ? palette.solar : palette.frame}
                  roughness={0.35}
                  metalness={0.2}
                  transparent={isXRay}
                  opacity={isXRay ? 0.35 : 1}
                  wireframe={settings.wireframe}
                />
              </mesh>
            ) : null}

            {/* Exterior Projecting Window Sill Flashing */}
            <mesh position={[0, -wHeight / 2 - 0.015, wDepth / 2 + 0.03]} rotation={[0.08, 0, 0]}>
              <boxGeometry args={[wWidth + 0.12, 0.035, 0.12]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.steel}
                roughness={0.3}
                metalness={0.5}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Double/Triple Glazing Glass Pane */}
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[glassWidth, glassHeight, glassThickness]} />
              {isThermal ? (
                <meshStandardMaterial
                  color="#dc2626"
                  emissive="#ef4444"
                  emissiveIntensity={0.85}
                  roughness={0.15}
                  wireframe={settings.wireframe}
                />
              ) : isHeatFlow ? (
                <meshStandardMaterial
                  color={
                    (hourlyStep ? hourlyStep.qWindowNetFlux : (modelMetrics.qWindowNetFlux ?? 280)) >= 0
                      ? "#f59e0b"
                      : "#0284c7"
                  }
                  emissive={
                    (hourlyStep ? hourlyStep.qWindowNetFlux : (modelMetrics.qWindowNetFlux ?? 280)) >= 0
                      ? "#ea580c"
                      : "#1d4ed8"
                  }
                  emissiveIntensity={0.72}
                  roughness={0.2}
                  wireframe={settings.wireframe}
                />
              ) : isXRay ? (
                <meshPhysicalMaterial
                  color="#bae6fd"
                  transmission={0.92}
                  transparent
                  opacity={0.15}
                  roughness={0.05}
                  wireframe={settings.wireframe}
                />
              ) : settings.visualization === "solar" ? (
                <meshPhysicalMaterial
                  color="#ffd54f"
                  transmission={0.45}
                  roughness={0.08}
                  transparent
                  opacity={0.8}
                  wireframe={settings.wireframe}
                />
              ) : source?.solarPane?.enabled ? (
                <meshPhysicalMaterial
                  color={active ? palette.solar : "#1e3a8a"}
                  emissive="#0c2d6b"
                  emissiveIntensity={0.22}
                  transmission={(source.solarPane.transparencyPct || 30) / 100}
                  transparent
                  opacity={0.88}
                  roughness={0.10}
                  metalness={0.65}
                  reflectivity={0.95}
                  clearcoat={1}
                  wireframe={settings.wireframe}
                />
              ) : (
                <meshPhysicalMaterial
                  color={active ? palette.solar : palette.glass}
                  transmission={0.88}
                  transparent
                  opacity={0.65}
                  roughness={0.05}
                  metalness={0.12}
                  reflectivity={0.9}
                  clearcoat={1}
                  wireframe={settings.wireframe}
                />
              )}
            </mesh>

            {/* BIPV Photovoltaic Busbar Grid Lines Overlay on Solar Glass */}
            {source?.solarPane?.enabled && !isXRay && (
              <group position={[0, 0, 0.015]}>
                {[-glassWidth * 0.28, 0, glassWidth * 0.28].map((lx, i) => (
                  <mesh key={`pv-busbar-${i}`} position={[lx, 0, 0]}>
                    <boxGeometry args={[0.003, glassHeight * 0.95, 0.001]} />
                    <meshStandardMaterial color="#93c5fd" metalness={0.9} roughness={0.1} />
                  </mesh>
                ))}
              </group>
            )}

            {/* Shading Overhang (Awning) with support struts */}
            {overhangProj > 0 ? (
              <group position={[0, wHeight / 2 + 0.08, wDepth / 2 + overhangProj / 2]}>
                <mesh castShadow>
                  <boxGeometry args={[wWidth + 0.24, 0.045, overhangProj]} />
                  <meshStandardMaterial color={palette.charcoal} roughness={0.4} metalness={0.2} />
                </mesh>
                {[-1, 1].map((dir) => (
                  <mesh
                    key={dir}
                    position={[dir * (wWidth / 2 + 0.08), -0.15, -overhangProj * 0.3]}
                    rotation={[0.5, 0, 0]}
                  >
                    <boxGeometry args={[0.03, 0.32, 0.03]} />
                    <meshStandardMaterial color={palette.ink} metalness={0.7} />
                  </mesh>
                ))}
              </group>
            ) : null}

            {/* Minimal In-Situ Tooltip on Hover only (when not selected) */}
            {isHovered && !isSelected && !suppressHtmlLabels ? (
              <Html position={[0, wHeight / 2 + 0.35, wDepth / 2 + 0.05]} center distanceFactor={12} zIndexRange={[15, 0]}>
                <div className="cad-minimal-tooltip" style={source?.solarPane?.enabled ? { borderColor: "#38bdf8" } : undefined}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    {source?.solarPane?.enabled && <span style={{ fontSize: "0.85rem" }}>⚡</span>}
                    <strong>
                      {source?.solarPane?.enabled ? "BIPV Solar Window" : `Aperture #${index + 1}`} · {source?.wall.toUpperCase()}
                    </strong>
                  </div>
                  <span>
                    {win.dimensions[0].toFixed(2)} × {win.dimensions[1].toFixed(2)} m · Sill {source?.sillHeight}m
                  </span>
                  {source?.solarPane?.enabled ? (
                    <small style={{ color: "#38bdf8" }}>
                      ⚡ {Math.round(win.dimensions[0] * win.dimensions[1] * (source.solarPane.powerDensityWpM2 || 90))}Wp BIPV Glass · {source.solarPane.transparencyPct || 30}% VLT
                    </small>
                  ) : (
                    <small>{source?.glazingType.replace(/_/g, " ")}</small>
                  )}
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}

      {/* 5. Doors Assemblies with Architectural Frames, Panels & Hardware */}
      {geom.doors.map((door, index) => {
        const isSelected = selected?.type === "door" && selected.id === door.id;
        const isHovered = hovered === `door-${door.id}`;
        const active = isSelected || isHovered;
        const source = model.doors.find((item) => item.id === door.id);
        const [dWidth, dHeight, dDepth] = door.dimensions;
        const frameThickness = 0.07;
        const panelWidth = dWidth - frameThickness * 2;
        const panelHeight = dHeight - frameThickness;
        const panelDepth = 0.06;

        const doorPos = addPosition(door.worldPosition, wallExplode(door.wall));

        return (
          <group
            key={door.id}
            position={doorPos}
            rotation={door.rotation}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "door", id: door.id });
            }}
            onPointerOver={(e) => pointer(e, `door-${door.id}`)}
            onPointerOut={(e) => pointer(e, null)}
          >
            {/* Door Frame: Left Jamb */}
            <mesh position={[-dWidth / 2 + frameThickness / 2, 0, 0]} castShadow>
              <boxGeometry args={[frameThickness, dHeight, dDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.4}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Door Frame: Right Jamb */}
            <mesh position={[dWidth / 2 - frameThickness / 2, 0, 0]} castShadow>
              <boxGeometry args={[frameThickness, dHeight, dDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.4}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Door Frame: Top Header */}
            <mesh position={[0, dHeight / 2 - frameThickness / 2, 0]} castShadow>
              <boxGeometry args={[dWidth, frameThickness, dDepth]} />
              <meshStandardMaterial
                color={active ? palette.solar : palette.frame}
                roughness={0.4}
                metalness={0.2}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Insulated Heavy Door Leaf Panel */}
            <mesh position={[0, -frameThickness / 2, dDepth / 2 - panelDepth / 2]} castShadow>
              <boxGeometry args={[panelWidth, panelHeight, panelDepth]} />
              <meshStandardMaterial
                color={
                  active
                    ? palette.solar
                    : isThermal
                    ? thermalPalette.eastNeutral
                    : isHeatFlow
                    ? "#1e40af"
                    : palette.charcoal
                }
                emissive={
                  !isXRay && isThermal
                    ? thermalPalette.eastNeutral
                    : !isXRay && isHeatFlow
                    ? "#1d4ed8"
                    : "#000000"
                }
                emissiveIntensity={!isXRay && (isThermal || isHeatFlow) ? 0.35 : 0}
                roughness={0.55}
                metalness={0.1}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Vision Glass Lite in Upper Door */}
            <mesh position={[0, 0.35, dDepth / 2]}>
              <boxGeometry args={[Math.min(0.25, panelWidth * 0.4), 0.55, 0.02]} />
              <meshPhysicalMaterial
                color={palette.glass}
                transmission={0.8}
                transparent
                opacity={0.65}
                roughness={0.05}
                wireframe={settings.wireframe}
              />
            </mesh>

            {/* Stainless Steel Lever Handle & Escutcheon */}
            <mesh position={[panelWidth / 2 - 0.12, -0.05, dDepth / 2 + 0.045]}>
              <boxGeometry args={[0.04, 0.18, 0.015]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} wireframe={settings.wireframe} />
            </mesh>
            <mesh position={[panelWidth / 2 - 0.16, -0.05, dDepth / 2 + 0.065]}>
              <boxGeometry args={[0.12, 0.025, 0.025]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} wireframe={settings.wireframe} />
            </mesh>

            {/* Weather-Seal Aluminum Threshold */}
            <mesh position={[0, -dHeight / 2 + 0.015, dDepth / 2]} castShadow>
              <boxGeometry args={[dWidth + 0.04, 0.03, 0.12]} />
              <meshStandardMaterial color={palette.steel} metalness={0.8} roughness={0.2} wireframe={settings.wireframe} />
            </mesh>

            {/* Minimal In-Situ Tooltip on Hover only (when not selected) */}
            {isHovered && !isSelected && !suppressHtmlLabels ? (
              <Html position={[0, dHeight / 2 + 0.35, dDepth / 2 + 0.05]} center distanceFactor={12} zIndexRange={[15, 0]}>
                <div className="cad-minimal-tooltip">
                  <strong>Door #{index + 1} · {source?.wall.toUpperCase()}</strong>
                  <span>{dWidth.toFixed(2)} × {dHeight.toFixed(2)} m · Ingress</span>
                  <small>{source?.construction || "Airtight Thermal Break"}</small>
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}

      {/* 6. Interior Thermal Mass Elements (Slabs / Trombe Wall) */}
      {model.thermalMass.map((mass, index) => (
        <mesh
          key={mass.id}
          position={[-model.geometry.length * 0.2 + index * 0.55, Math.max(0.12, mass.thickness / 2), 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelect({ type: "thermalMass", id: mass.id });
          }}
        >
          <boxGeometry
            args={[
              Math.min(1.8, Math.sqrt(mass.surfaceArea)),
              Math.max(0.12, mass.thickness),
              0.32,
            ]}
          />
          <meshStandardMaterial
            color={
              isXRay
                ? "#f59e0b"
                : selected?.type === "thermalMass" && selected.id === mass.id
                ? palette.solar
                : isThermal
                ? thermalPalette.floorWarm
                : palette.slate
            }
            emissive={isXRay ? "#f59e0b" : isThermal ? thermalPalette.floorWarm : "#000000"}
            emissiveIntensity={isXRay ? 0.45 : isThermal ? 0.45 : 0}
            roughness={0.7}
            wireframe={settings.wireframe}
          />
        </mesh>
      ))}

      {/* 7. Solar Beams & Heat Flow Streamlines — suppressed during exploded view */}
      <ThermalRadiationOverlay
        model={model}
        geom={geom}
        mode={settings.visualization}
        hourlyStep={hourlyStep}
        exploded={settings.explodedView}
        sunHour={sunHour}
        solarDate={solarDate}
        suppressHtmlLabels={suppressHtmlLabels}
      />
    </group>
  );
}

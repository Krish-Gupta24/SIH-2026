"use client";

import { useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { SelectedElement, ViewerSettings, WallOrientation } from "../types";
import { deriveShelter3DGeometry, type Opening3DPlacement } from "../geometry-math";
import { ThermalRadiationOverlay } from "./ThermalRadiationOverlay";

interface Props {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (element: SelectedElement) => void;
  settings: ViewerSettings;
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
    const heatFlowColors: Record<WallOrientation, string> = {
      south: "#dc2626",  // warm red – heat gain
      north: "#2563eb",  // cool blue – heat loss
      east: "#f59e0b",   // amber – moderate
      west: "#6366f1",   // indigo – wind-driven loss
    };
    return heatFlowColors[side];
  }
  return side === "south" ? "#ded9cb" : palette.paper;
}

function createThermalTexture(type: "south" | "north" | "east" | "west" | "roof" | "floor"): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (type === "south") {
    // FLIR Ironbow solar absorption gradient
    const grad = ctx.createRadialGradient(128, 100, 20, 128, 128, 160);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.2, "#fde047");
    grad.addColorStop(0.45, "#f97316");
    grad.addColorStop(0.75, "#ef4444");
    grad.addColorStop(0.92, "#a855f7");
    grad.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "north") {
    // Cold convective sub-zero gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1e3a8a");
    grad.addColorStop(0.35, "#2563eb");
    grad.addColorStop(0.7, "#06b6d4");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "east") {
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, "#eab308");
    grad.addColorStop(0.5, "#d97706");
    grad.addColorStop(1, "#0284c7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "west") {
    const grad = ctx.createLinearGradient(256, 0, 0, 256);
    grad.addColorStop(0, "#f97316");
    grad.addColorStop(0.4, "#06b6d4");
    grad.addColorStop(1, "#1e40af");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === "roof") {
    const grad = ctx.createRadialGradient(128, 128, 30, 128, 128, 140);
    grad.addColorStop(0, "#fef08a");
    grad.addColorStop(0.4, "#f97316");
    grad.addColorStop(0.85, "#dc2626");
    grad.addColorStop(1, "#7c3aed");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    // floor mass
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 130);
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(0.6, "#d97706");
    grad.addColorStop(1, "#0369a1");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

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

export function ShelterMesh({ model, selected, onSelect, settings }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const geom = useMemo(() => deriveShelter3DGeometry(model), [model]);
  const orientation = -(model.geometry.orientation * Math.PI) / 180;

  const isActive = (id: string) =>
    hovered === id ||
    (selected?.type === "wall" && id === `wall-${selected.orientation}`) ||
    selected?.type === id;

  const pointer = (event: ThreeEvent<PointerEvent>, id: string | null) => {
    event.stopPropagation();
    setHovered(id);
  };

  const roofAngle = THREE.MathUtils.degToRad(model.geometry.roofAngle);
  const overhang = model.envelope.roof.overhang;
  const roofDepth = model.geometry.width + overhang * 2;
  const roofSpan = model.geometry.length + overhang * 2;
  const gableHalf = roofDepth / 2 / Math.cos(roofAngle || 0.001);

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
  const isThermal = settings.visualization === "thermal";
  const xrayWallOpacity = 0.14;
  const xrayEdgeOpacity = 0.88;

  // Procedural FLIR thermal gradient maps for surfaces
  const thermalTextures = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      south: createThermalTexture("south"),
      north: createThermalTexture("north"),
      east: createThermalTexture("east"),
      west: createThermalTexture("west"),
      roof: createThermalTexture("roof"),
      floor: createThermalTexture("floor"),
    };
  }, []);

  return (
    <group rotation={[0, orientation, 0]}>
      {/* 1. Ground Foundation Slab */}
      <mesh
        position={geom.floor.center}
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
              : isThermal
              ? "#ffffff"
              : palette.ink
          }
          map={!isXRay && isThermal ? thermalTextures?.floor : null}
          emissiveMap={!isXRay && isThermal ? thermalTextures?.floor : null}
          emissive={!isXRay && isThermal ? "#ffffff" : "#000000"}
          emissiveIntensity={!isXRay && isThermal ? 0.45 : 0}
          roughness={isThermal ? 0.4 : 0.78}
          transparent={isXRay}
          opacity={isXRay ? 0.2 : 1}
          wireframe={settings.wireframe}
          side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {/* Floor edge lines in X-Ray mode */}
      {isXRay && (
        <lineSegments position={geom.floor.center}>
          <edgesGeometry args={[new THREE.BoxGeometry(...geom.floor.dimensions)]} />
          <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
        </lineSegments>
      )}

      {/* 2. Four Cardinal Walls with Physical Cutout Holes */}
      {(["north", "south", "east", "west"] as WallOrientation[]).map((side, wallIndex) => {
        const wall = geom.walls[side];
        const layers = model.envelope.walls[side].layers;
        const wallGeom = wallGeometries[side];
        const active = isActive(`wall-${side}`);

        return (
          <group key={side}>
            <mesh
              geometry={wallGeom}
              position={wall.position}
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
                    : isThermal
                    ? "#ffffff"
                    : getWallMaterialColor(settings.visualization, side, active)
                }
                map={!isXRay && isThermal ? thermalTextures?.[side] : null}
                emissiveMap={!isXRay && isThermal ? thermalTextures?.[side] : null}
                emissive={!isXRay && isThermal ? "#ffffff" : "#000000"}
                emissiveIntensity={!isXRay && isThermal ? 0.6 : 0}
                roughness={isXRay ? 0.15 : isThermal ? 0.45 : 0.7}
                metalness={isXRay ? 0.08 : 0.04}
                wireframe={settings.wireframe}
                transparent={isXRay}
                opacity={isXRay ? xrayWallOpacity : 1}
                depthWrite={!isXRay}
                side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>

            {/* Architectural CAD Edge Lines in X-Ray mode */}
            {isXRay && (
              <lineSegments position={wall.position} rotation={wall.rotation}>
                <edgesGeometry args={[wallGeom]} />
                <lineBasicMaterial
                  color={active ? palette.solar : "#38bdf8"}
                  transparent
                  opacity={xrayEdgeOpacity}
                  linewidth={2}
                />
              </lineSegments>
            )}

            {/* Exploded Construction Layers (Reveal Layers mode) */}
            {settings.revealLayers
              ? layers.slice(0, 4).map((layer, layerIndex) => {
                  const displacement = 0.2 + layerIndex * 0.1;
                  const normal = wall.normal;
                  return (
                    <mesh
                      key={`${layer.materialId}-${layerIndex}`}
                      position={[
                        wall.position[0] + normal[0] * displacement,
                        wall.position[1],
                        wall.position[2] + normal[2] * displacement,
                      ]}
                      rotation={wall.rotation}
                    >
                      <boxGeometry
                        args={[
                          wall.dimensions[0] * 0.96,
                          wall.dimensions[1] * 0.96,
                          Math.max(0.025, layer.thickness * 0.25),
                        ]}
                      />
                      <meshStandardMaterial
                        color={[palette.paper, palette.ice, palette.slate, palette.charcoal][layerIndex]}
                        transparent
                        opacity={0.9}
                        roughness={0.65}
                      />
                    </mesh>
                  );
                })
              : null}

            {settings.revealLayers && wallIndex === 1 ? (
              <Html position={[wall.position[0], wall.position[1] + model.geometry.height * 0.58, wall.position[2] + 0.8]} center>
                <span className="cad-scene-label">Assembly Layers</span>
              </Html>
            ) : null}
          </group>
        );
      })}

      {/* 3. Roof System (Gable or Flat/Shed) with proper X-Ray Transparency */}
      {model.geometry.roofType === "Gable" && model.geometry.roofAngle > 0 ? (
        <group>
          {[-1, 1].map((direction) => {
            const gableDimensions: [number, number, number] = [roofSpan, 0.14, gableHalf + 0.15];
            return (
              <group
                key={direction}
                position={[0, model.geometry.height + (Math.sin(roofAngle) * gableHalf) / 2 + 0.04, (direction * roofDepth) / 4]}
                rotation={[direction * -roofAngle, 0, 0]}
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
                  <boxGeometry args={gableDimensions} />
                  <meshStandardMaterial
                    color={
                      isXRay
                        ? palette.xrayTint
                        : isActive("roof")
                        ? palette.solar
                        : isThermal
                        ? "#ffffff"
                        : palette.charcoal
                    }
                    map={!isXRay && isThermal ? thermalTextures?.roof : null}
                    emissiveMap={!isXRay && isThermal ? thermalTextures?.roof : null}
                    emissive={!isXRay && isThermal ? "#ffffff" : "#000000"}
                    emissiveIntensity={!isXRay && isThermal ? 0.55 : 0}
                    roughness={isXRay ? 0.15 : 0.48}
                    metalness={isXRay ? 0.08 : 0.22}
                    wireframe={settings.wireframe}
                    transparent={isXRay}
                    opacity={isXRay ? xrayWallOpacity : 1}
                    depthWrite={!isXRay}
                    side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
                  />
                </mesh>
                {isXRay && (
                  <lineSegments>
                    <edgesGeometry args={[new THREE.BoxGeometry(...gableDimensions)]} />
                    <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
                  </lineSegments>
                )}
              </group>
            );
          })}
        </group>
      ) : (
        <group position={geom.roof.center} rotation={geom.roof.rotation}>
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
            <boxGeometry args={geom.roof.dimensions} />
            <meshStandardMaterial
              color={
                isXRay
                  ? palette.xrayTint
                  : isActive("roof")
                  ? palette.solar
                  : isThermal
                  ? "#ffffff"
                  : palette.charcoal
              }
              map={!isXRay && isThermal ? thermalTextures?.roof : null}
              emissiveMap={!isXRay && isThermal ? thermalTextures?.roof : null}
              emissive={!isXRay && isThermal ? "#ffffff" : "#000000"}
              emissiveIntensity={!isXRay && isThermal ? 0.55 : 0}
              roughness={isXRay ? 0.15 : 0.48}
              metalness={isXRay ? 0.08 : 0.22}
              wireframe={settings.wireframe}
              transparent={isXRay}
              opacity={isXRay ? xrayWallOpacity : 1}
              depthWrite={!isXRay}
              side={isXRay ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
          {isXRay && (
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...geom.roof.dimensions)]} />
              <lineBasicMaterial color="#38bdf8" transparent opacity={xrayEdgeOpacity} />
            </lineSegments>
          )}
        </group>
      )}

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

        return (
          <group
            key={win.id}
            position={win.worldPosition}
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
                />
              </mesh>
            ) : null}

            {/* Exterior Projecting Window Sill Flashing */}
            <mesh position={[0, -wHeight / 2 - 0.015, wDepth / 2 + 0.03]} rotation={[0.08, 0, 0]}>
              <boxGeometry args={[wWidth + 0.12, 0.035, 0.12]} />
              <meshStandardMaterial color={active ? palette.solar : palette.steel} roughness={0.3} metalness={0.5} />
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
                />
              ) : isXRay ? (
                <meshPhysicalMaterial
                  color="#bae6fd"
                  transmission={0.92}
                  transparent
                  opacity={0.15}
                  roughness={0.05}
                />
              ) : settings.visualization === "solar" ? (
                <meshPhysicalMaterial
                  color="#ffd54f"
                  transmission={0.45}
                  roughness={0.08}
                  transparent
                  opacity={0.8}
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
                />
              )}
            </mesh>

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
            {isHovered && !isSelected ? (
              <Html position={[0, wHeight / 2 + 0.35, wDepth / 2 + 0.05]} center distanceFactor={12}>
                <div className="cad-minimal-tooltip">
                  <strong>Aperture #{index + 1} · {source?.wall.toUpperCase()}</strong>
                  <span>
                    {win.dimensions[0].toFixed(2)} × {win.dimensions[1].toFixed(2)} m · Sill {source?.sillHeight}m
                  </span>
                  <small>{source?.glazingType.replace(/_/g, " ")}</small>
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

        return (
          <group
            key={door.id}
            position={door.worldPosition}
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
                    : palette.charcoal
                }
                emissive={!isXRay && isThermal ? thermalPalette.eastNeutral : "#000000"}
                emissiveIntensity={!isXRay && isThermal ? 0.35 : 0}
                roughness={0.55}
                metalness={0.1}
                transparent={isXRay}
                opacity={isXRay ? 0.35 : 1}
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
              />
            </mesh>

            {/* Stainless Steel Lever Handle & Escutcheon */}
            <mesh position={[panelWidth / 2 - 0.12, -0.05, dDepth / 2 + 0.045]}>
              <boxGeometry args={[0.04, 0.18, 0.015]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[panelWidth / 2 - 0.16, -0.05, dDepth / 2 + 0.065]}>
              <boxGeometry args={[0.12, 0.025, 0.025]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Weather-Seal Aluminum Threshold */}
            <mesh position={[0, -dHeight / 2 + 0.015, dDepth / 2]} castShadow>
              <boxGeometry args={[dWidth + 0.04, 0.03, 0.12]} />
              <meshStandardMaterial color={palette.steel} metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Minimal In-Situ Tooltip on Hover only (when not selected) */}
            {isHovered && !isSelected ? (
              <Html position={[0, dHeight / 2 + 0.35, dDepth / 2 + 0.05]} center distanceFactor={12}>
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
          />
        </mesh>
      ))}

      {/* 7. Solar Beams & Heat Flow Streamlines */}
      <ThermalRadiationOverlay model={model} geom={geom} mode={settings.visualization} />
    </group>
  );
}

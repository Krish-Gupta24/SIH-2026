"use client";

import { useMemo, useState } from "react";
import { Html, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { SelectedElement, ViewerSettings, WallOrientation } from "../types";
import { deriveShelter3DGeometry } from "../geometry-math";

interface Props { model: ShelterModel; selected: SelectedElement; onSelect: (element: SelectedElement) => void; settings: ViewerSettings; }
const palette = { ink: "#101820", slate: "#6e818f", ice: "#cbdce6", paper: "#f7f9fa", solar: "#d2a546" };

function colorFor(mode: ViewerSettings["visualization"], orientation?: WallOrientation) {
  if (mode === "thermal") return orientation === "north" ? palette.slate : orientation === "south" ? palette.solar : palette.ice;
  if (mode === "solar") return orientation === "south" ? palette.solar : palette.paper;
  if (mode === "heat-flow") return palette.ice;
  return orientation === "south" ? "#d9d5c9" : palette.paper;
}

export function ShelterMesh({ model, selected, onSelect, settings }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const geom = useMemo(() => deriveShelter3DGeometry(model), [model]);
  const orientation = -(model.geometry.orientation * Math.PI) / 180;
  const isActive = (id: string) => hovered === id || (selected?.type === "wall" && id === `wall-${selected.orientation}`) || selected?.type === id;
  const pointer = (event: ThreeEvent<PointerEvent>, id: string | null) => { event.stopPropagation(); setHovered(id); };
  const roofAngle = THREE.MathUtils.degToRad(model.geometry.roofAngle);
  const overhang = model.envelope.roof.overhang;
  const roofDepth = model.geometry.width + overhang * 2;
  const roofSpan = model.geometry.length + overhang * 2;
  const gableHalf = roofDepth / 2 / Math.cos(roofAngle || .001);

  return <group rotation={[0, orientation, 0]}>
    <mesh position={geom.floor.center} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "floor" }); }} onPointerOver={(e) => pointer(e, "floor")} onPointerOut={(e) => pointer(e, null)}>
      <boxGeometry args={geom.floor.dimensions} /><meshStandardMaterial color={isActive("floor") ? palette.slate : palette.ink} roughness={.78} wireframe={settings.wireframe} />
    </mesh>

    {(["north", "south", "east", "west"] as WallOrientation[]).map((side, wallIndex) => {
      const wall = geom.walls[side];
      const layers = model.envelope.walls[side].layers;
      return <group key={side}>
        <mesh position={wall.position} rotation={wall.rotation} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "wall", orientation: side }); }} onPointerOver={(e) => pointer(e, `wall-${side}`)} onPointerOut={(e) => pointer(e, null)}>
          <boxGeometry args={wall.dimensions} /><meshStandardMaterial color={isActive(`wall-${side}`) ? palette.slate : colorFor(settings.visualization, side)} roughness={.72} metalness={.03} wireframe={settings.wireframe} transparent={settings.transparentWalls} opacity={settings.transparentWalls ? .38 : 1} />
        </mesh>
        {settings.revealLayers ? layers.slice(0, 4).map((layer, layerIndex) => {
          const displacement = .17 + layerIndex * .09;
          const normal = wall.normal;
          return <mesh key={`${layer.materialId}-${layerIndex}`} position={[wall.position[0] + normal[0] * displacement, wall.position[1], wall.position[2] + normal[2] * displacement]} rotation={wall.rotation}>
            <boxGeometry args={[wall.dimensions[0] * .98, wall.dimensions[1] * .98, Math.max(.025, layer.thickness * .22)]} />
            <meshStandardMaterial color={[palette.paper, palette.ice, palette.slate, palette.ink][layerIndex]} transparent opacity={.92} roughness={.7} />
          </mesh>;
        }) : null}
        {settings.revealLayers && wallIndex === 1 ? <Html position={[wall.position[0], wall.position[1] + model.geometry.height * .58, wall.position[2] + .72]} center><span className="cad-scene-label">Assembly layers</span></Html> : null}
      </group>;
    })}

    {model.geometry.roofType === "Gable" && model.geometry.roofAngle > 0 ? <group>
      {[-1, 1].map((direction) => <mesh key={direction} position={[0, model.geometry.height + Math.sin(roofAngle) * gableHalf / 2 + .04, direction * roofDepth / 4]} rotation={[direction * -roofAngle, 0, 0]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "roof" }); }} onPointerOver={(e) => pointer(e, "roof")} onPointerOut={(e) => pointer(e, null)}>
        <boxGeometry args={[roofSpan, .14, gableHalf + .15]} /><meshStandardMaterial color={isActive("roof") ? palette.slate : palette.ink} roughness={.48} metalness={.22} wireframe={settings.wireframe} />
      </mesh>)}
    </group> : <mesh position={geom.roof.center} rotation={geom.roof.rotation} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "roof" }); }} onPointerOver={(e) => pointer(e, "roof")} onPointerOut={(e) => pointer(e, null)}>
      <boxGeometry args={geom.roof.dimensions} /><meshStandardMaterial color={isActive("roof") ? palette.slate : palette.ink} roughness={.48} metalness={.22} wireframe={settings.wireframe} />
    </mesh>}

    {geom.windows.map((window) => {
      const active = selected?.type === "window" && selected.id === window.id;
      const source = model.windows.find((item) => item.id === window.id);
      return <group key={window.id} position={window.worldPosition} rotation={window.rotation}>
        <mesh onClick={(e) => { e.stopPropagation(); onSelect({ type: "window", id: window.id }); }} onPointerOver={(e) => pointer(e, `window-${window.id}`)} onPointerOut={(e) => pointer(e, null)}>
          <boxGeometry args={window.dimensions} /><meshPhysicalMaterial color={active ? palette.solar : palette.ice} transmission={.34} transparent opacity={.72} roughness={.12} metalness={.12} />
        </mesh>
        <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(...window.dimensions)]} /><lineBasicMaterial color={active ? palette.solar : palette.ink} /></lineSegments>
        {source && source.shadingOverhang > 0 ? <mesh position={[0, source.height / 2 + .08, source.shadingOverhang / 2]}><boxGeometry args={[source.width + .16, .06, source.shadingOverhang]} /><meshStandardMaterial color={palette.ink} /></mesh> : null}
      </group>;
    })}

    {geom.doors.map((door) => <group key={door.id} position={door.worldPosition} rotation={door.rotation}><mesh castShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "door", id: door.id }); }} onPointerOver={(e) => pointer(e, `door-${door.id}`)} onPointerOut={(e) => pointer(e, null)}><boxGeometry args={door.dimensions} /><meshStandardMaterial color={selected?.type === "door" && selected.id === door.id ? palette.solar : palette.slate} roughness={.65} /></mesh><lineSegments><edgesGeometry args={[new THREE.BoxGeometry(...door.dimensions)]} /><lineBasicMaterial color={palette.ink} /></lineSegments></group>)}

    {model.thermalMass.map((mass, index) => <mesh key={mass.id} position={[-model.geometry.length * .2 + index * .55, Math.max(.12, mass.thickness / 2), 0]} castShadow onClick={(e) => { e.stopPropagation(); onSelect({ type: "thermalMass", id: mass.id }); }}><boxGeometry args={[Math.min(1.8, Math.sqrt(mass.surfaceArea)), Math.max(.12, mass.thickness), .32]} /><meshStandardMaterial color={palette.slate} roughness={.9} /></mesh>)}

    {settings.visualization === "heat-flow" ? ([[-geom.boundingBox.dimensions[0] / 2 - 2, 1.3, 0], [geom.boundingBox.dimensions[0] / 2 + 2, 1.3, 0]] as [number, number, number][]).map((origin, index) => <group key={index}><Line points={[origin, [origin[0] * .45, 1.3, 0]]} color={palette.solar} lineWidth={2} /><Html position={origin} center><span className="cad-scene-label">Indicative heat path</span></Html></group>) : null}
  </group>;
}

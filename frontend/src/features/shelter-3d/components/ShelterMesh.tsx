"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { ShelterModel } from "@/types/shelter";
import { SelectedElement } from "../types";
import { deriveShelter3DGeometry } from "../geometry-math";

interface ShelterMeshProps {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (el: SelectedElement) => void;
  wireframe?: boolean;
  transparentWalls?: boolean;
}

export function ShelterMesh({
  model,
  selected,
  onSelect,
  wireframe = false,
  transparentWalls = false,
}: ShelterMeshProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const geom = useMemo(() => deriveShelter3DGeometry(model), [model]);

  // Convert orientation degrees to radians around vertical Y axis (negated for clockwise rotation in Three.js)
  const orientationRad = ((model.geometry.orientation || 0) * Math.PI) / 180;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>, id: string) => {
    e.stopPropagation();
    setHovered(id);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(null);
  };

  return (
    <group rotation={[0, -orientationRad, 0]}>
      {/* 1. Ground Slab / Floor */}
      <mesh
        position={geom.floor.center}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ type: "floor" });
        }}
        onPointerOver={(e) => handlePointerOver(e, "floor")}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={geom.floor.dimensions} />
        <meshStandardMaterial
          color={
            selected?.type === "floor"
              ? "#3b82f6"
              : hovered === "floor"
              ? "#64748b"
              : "#334155"
          }
          emissive={selected?.type === "floor" ? "#1d4ed8" : "#000000"}
          emissiveIntensity={selected?.type === "floor" ? 0.3 : 0}
          roughness={0.8}
          metalness={0.1}
          wireframe={wireframe}
        />
      </mesh>

      {/* 2. Four Envelope Walls */}
      {(["north", "south", "east", "west"] as const).map((orient) => {
        const wall = geom.walls[orient];
        const isSelected = selected?.type === "wall" && selected.orientation === orient;
        const isHovered = hovered === `wall-${orient}`;

        // Color coding: South wall warm solar amber tint, others cold slate
        const defaultColor = orient === "south" ? "#e2d7c5" : "#cbd5e1";

        return (
          <mesh
            key={orient}
            position={wall.position}
            rotation={wall.rotation}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ type: "wall", orientation: orient });
            }}
            onPointerOver={(e) => handlePointerOver(e, `wall-${orient}`)}
            onPointerOut={handlePointerOut}
            castShadow
            receiveShadow
          >
            <boxGeometry args={wall.dimensions} />
            <meshStandardMaterial
              color={isSelected ? "#2563eb" : isHovered ? "#93c5fd" : defaultColor}
              emissive={isSelected ? "#1d4ed8" : isHovered ? "#60a5fa" : "#000000"}
              emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.15 : 0}
              roughness={0.7}
              metalness={0.15}
              wireframe={wireframe}
              transparent={transparentWalls}
              opacity={transparentWalls ? 0.55 : 1.0}
            />
          </mesh>
        );
      })}

      {/* 3. Roof */}
      <mesh
        position={geom.roof.center}
        rotation={geom.roof.rotation}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ type: "roof" });
        }}
        onPointerOver={(e) => handlePointerOver(e, "roof")}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={geom.roof.dimensions} />
        <meshStandardMaterial
          color={
            selected?.type === "roof"
              ? "#2563eb"
              : hovered === "roof"
              ? "#64748b"
              : "#1e293b"
          }
          emissive={selected?.type === "roof" ? "#1d4ed8" : "#000000"}
          emissiveIntensity={selected?.type === "roof" ? 0.4 : 0}
          roughness={0.5}
          metalness={0.4}
          wireframe={wireframe}
        />
      </mesh>

      {/* 4. Windows */}
      {geom.windows.map((win) => {
        const isSelected = selected?.type === "window" && selected.id === win.id;
        const isHovered = hovered === `win-${win.id}`;

        return (
          <group key={win.id} position={win.worldPosition} rotation={win.rotation}>
            {/* Window Glass Pane */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "window", id: win.id });
              }}
              onPointerOver={(e) => handlePointerOver(e, `win-${win.id}`)}
              onPointerOut={handlePointerOut}
            >
              <boxGeometry args={win.dimensions} />
              <meshStandardMaterial
                color={isSelected ? "#38bdf8" : isHovered ? "#7dd3fc" : "#0284c7"}
                emissive={isSelected ? "#0284c7" : "#000000"}
                emissiveIntensity={isSelected ? 0.6 : 0}
                roughness={0.1}
                metalness={0.9}
                transparent={true}
                opacity={0.7}
                wireframe={wireframe}
              />
            </mesh>

            {/* Window Outer Frame */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...win.dimensions)]} />
              <lineBasicMaterial color={isSelected ? "#f59e0b" : "#475569"} linewidth={2} />
            </lineSegments>
          </group>
        );
      })}

      {/* 5. Doors */}
      {geom.doors.map((door) => {
        const isSelected = selected?.type === "door" && selected.id === door.id;
        const isHovered = hovered === `door-${door.id}`;

        return (
          <group key={door.id} position={door.worldPosition} rotation={door.rotation}>
            {/* Door Leaf */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "door", id: door.id });
              }}
              onPointerOver={(e) => handlePointerOver(e, `door-${door.id}`)}
              onPointerOut={handlePointerOut}
              castShadow
            >
              <boxGeometry args={door.dimensions} />
              <meshStandardMaterial
                color={isSelected ? "#d97706" : isHovered ? "#b45309" : "#78350f"}
                emissive={isSelected ? "#d97706" : "#000000"}
                emissiveIntensity={isSelected ? 0.5 : 0}
                roughness={0.6}
                metalness={0.2}
                wireframe={wireframe}
              />
            </mesh>

            {/* Door Frame Outline */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...door.dimensions)]} />
              <lineBasicMaterial color={isSelected ? "#60a5fa" : "#1e293b"} linewidth={2} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

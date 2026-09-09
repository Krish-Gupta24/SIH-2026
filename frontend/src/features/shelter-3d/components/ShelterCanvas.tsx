"use client";

import React, { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ShelterModel } from "@/types/shelter";
import { SelectedElement, CameraPreset, ViewerSettings } from "../types";
import { ShelterMesh } from "./ShelterMesh";
import { DimensionLines } from "./DimensionLines";
import { CompassRose } from "./CompassRose";

interface ShelterCanvasProps {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (el: SelectedElement) => void;
  settings: ViewerSettings;
  activePreset: CameraPreset;
}

function CameraController({
  preset,
  controlsRef,
}: {
  preset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl>;
}) {
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object;

    switch (preset) {
      case "iso":
        camera.position.set(10, 8, 12);
        controls.target.set(0, 1.5, 0);
        break;
      case "top":
        camera.position.set(0, 16, 0.001); // slight offset to prevent gimbal lock
        controls.target.set(0, 0, 0);
        break;
      case "south":
        camera.position.set(0, 2, 14);
        controls.target.set(0, 1.5, 0);
        break;
      case "east":
        camera.position.set(14, 2, 0);
        controls.target.set(0, 1.5, 0);
        break;
      case "north":
        camera.position.set(0, 2, -14);
        controls.target.set(0, 1.5, 0);
        break;
      case "west":
        camera.position.set(-14, 2, 0);
        controls.target.set(0, 1.5, 0);
        break;
    }
    controls.update();
  }, [preset, controlsRef]);

  return null;
}

export function ShelterCanvas({
  model,
  selected,
  onSelect,
  settings,
  activePreset,
}: ShelterCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Calculate suitable compass radius outside building perimeter
  const maxSpan = Math.max(model.geometry.length, model.geometry.width);
  const compassRadius = Math.max(4.0, maxSpan * 0.75);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Canvas
        shadows
        camera={{ position: [10, 8, 12], fov: 45, near: 0.1, far: 200 }}
        onPointerMissed={() => onSelect(null)}
        className="touch-none"
      >
        <CameraController preset={activePreset} controlsRef={controlsRef} />

        {/* Orbit Controls with bounded elevation */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below ground plane
        />

        {/* Ambient & Directional Sunlight */}
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[12, 18, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0001}
        />
        <hemisphereLight args={["#e0f2fe", "#0f172a", 0.4]} />

        {/* Ground Reference Grid */}
        {settings.showGrid && (
          <Grid
            position={[0, -0.005, 0]}
            args={[30, 30]}
            cellSize={1.0}
            cellThickness={0.8}
            cellColor="#1e293b"
            sectionSize={5.0}
            sectionThickness={1.2}
            sectionColor="#334155"
            fadeDistance={35}
            fadeStrength={1.5}
          />
        )}

        {/* Cardinal Orientation Compass */}
        {settings.showCompass && (
          <CompassRose orientation={model.geometry.orientation} radius={compassRadius} />
        )}

        {/* Real-time 3D Dimension Measurements */}
        {settings.showDimensions && <DimensionLines model={model} />}

        {/* Parametric Building Model */}
        <ShelterMesh
          model={model}
          selected={selected}
          onSelect={onSelect}
          wireframe={settings.wireframe}
          transparentWalls={settings.transparentWalls}
        />
      </Canvas>
    </div>
  );
}

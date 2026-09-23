"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ShelterModel } from "@/types/shelter";
import type { CameraPreset, SelectedElement, ViewerSettings } from "../types";
import type { HourlyThermalStep } from "../thermal-physics";
import { ShelterMesh } from "./ShelterMesh";
import { DimensionLines } from "./DimensionLines";
import { CompassRose } from "./CompassRose";
import { ThermalScaleLegend } from "./ThermalScaleLegend";
import { SceneEnvironment } from "./SceneEnvironment";
import { SunLighting } from "./SunLighting";

interface ShelterCanvasProps {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (element: SelectedElement) => void;
  settings: ViewerSettings;
  activePreset: CameraPreset;
  hourlyStep?: HourlyThermalStep | null;
  hasSimResults?: boolean;
  sunHour?: number;
}

function CameraController({
  preset,
  controlsRef,
  model,
}: {
  preset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  model: ShelterModel;
}) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const maxDim = Math.max(model.geometry.length, model.geometry.width, model.geometry.height);
    const dist = Math.max(10, maxDim * 2.2);
    const midY = model.geometry.height * 0.55;

    const positions: Record<CameraPreset, [number, number, number]> = {
      iso: [dist * 0.85, dist * 0.65, dist * 0.85],
      top: [0, dist * 1.3, 0.01],
      south: [0, midY, dist],
      north: [0, midY, -dist],
      east: [dist, midY, 0],
      west: [-dist, midY, 0],
    };

    controls.object.position.set(...positions[preset]);
    controls.target.set(0, midY, 0);
    controls.update();
  }, [preset, controlsRef, model.geometry.length, model.geometry.width, model.geometry.height]);

  return null;
}

export function ShelterCanvas({
  model,
  selected,
  onSelect,
  settings,
  activePreset,
  hourlyStep,
  hasSimResults,
  sunHour = 12,
}: ShelterCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const compassRadius = Math.max(4.5, Math.max(model.geometry.length, model.geometry.width) * 0.72);

  const isAnalysis =
    settings.visualization === "thermal" || settings.visualization === "heat-flow";
  const envActive = settings.showEnvironment && !isAnalysis;
  const isSolar = settings.visualization === "solar";
  const bgColor = envActive ? "#c9d8e4" : isSolar ? "#d8e6ef" : "#dce7ed";

  return (
    <div className="cad-viewport relative size-full overflow-hidden">
      <Canvas
        shadows={settings.showSunShadows}
        dpr={[1, 2]}
        camera={{ position: [12, 8, 12], fov: 36, near: 0.1, far: 200 }}
        onPointerMissed={() => onSelect(null)}
        className="touch-none"
      >
        <color attach="background" args={[bgColor]} />
        {!envActive ? <fog attach="fog" args={[bgColor, 24, 65]} /> : null}

        <CameraController preset={activePreset} controlsRef={controlsRef} model={model} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3.5}
          maxDistance={55}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />

        <SunLighting model={model} settings={settings} sunHour={sunHour} />
        <SceneEnvironment model={model} settings={settings} sunHour={sunHour} />

        {/* CAD Coordinate Grid */}
        {settings.showGrid ? (
          <Grid
            position={[0, 0.005, 0]}
            args={[60, 60]}
            cellSize={0.5}
            cellThickness={0.45}
            cellColor="#8da0ab"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#526572"
            fadeDistance={36}
            fadeStrength={1.5}
            infiniteGrid
          />
        ) : null}

        {/* Solar Compass Rose */}
        {settings.showCompass ? (
          <CompassRose orientation={model.geometry.orientation} radius={compassRadius} />
        ) : null}

        {/* Interactive Dimension Lines & Callouts */}
        {settings.showDimensions ? <DimensionLines model={model} selected={selected} /> : null}

        {/* 3D Shelter Mesh with Architectural Assemblies & Visualizers */}
        <ShelterMesh
          model={model}
          selected={selected}
          onSelect={onSelect}
          settings={settings}
          hourlyStep={hourlyStep}
        />
      </Canvas>

      {/* Thermographic & Solar Scale Legend HUD */}
      <ThermalScaleLegend
        mode={settings.visualization}
        model={model}
        hourlyStep={hourlyStep}
        hasSimResults={hasSimResults}
      />
    </div>
  );
}

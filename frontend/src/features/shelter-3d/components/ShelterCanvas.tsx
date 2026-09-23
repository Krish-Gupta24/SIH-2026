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
  solarDate: string;
  suppressHtmlLabels?: boolean;
}

function CameraController({
  preset,
  controlsRef,
  model,
  explodedView,
}: {
  preset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  model: ShelterModel;
  explodedView: boolean;
}) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const maxDim = Math.max(model.geometry.length, model.geometry.width, model.geometry.height);
    const dist = Math.max(9.0, maxDim * (explodedView ? 2.2 : 1.7));
    const targetY = model.geometry.height * (explodedView ? 0.75 : 0.62);

    const positions: Record<CameraPreset, [number, number, number]> = {
      iso: [dist * 0.82, targetY + dist * 0.52, dist * 0.82],
      top: [0, targetY + dist * 1.3, 0.01],
      south: [0, targetY, dist * 1.08],
      north: [0, targetY, -dist * 1.08],
      east: [dist * 1.08, targetY, 0],
      west: [-dist * 1.08, targetY, 0],
    };

    controls.object.position.set(...positions[preset]);
    controls.target.set(0, targetY, 0);
    controls.update();
  }, [preset, controlsRef, model.geometry.length, model.geometry.width, model.geometry.height, explodedView]);

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
  solarDate,
  suppressHtmlLabels = false,
}: ShelterCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const compassRadius = Math.max(7.5, Math.max(model.geometry.length, model.geometry.width) * 1.15 + 1.8);

  const isAnalysis =
    settings.visualization === "thermal" || settings.visualization === "heat-flow";
  const envActive = settings.showEnvironment && !isAnalysis;
  const isSolar = settings.visualization === "solar";
  const bgColor = envActive ? "#c9d8e4" : isSolar ? "#d8e6ef" : "#dce7ed";

  return (
    <div className="cad-viewport relative size-full overflow-hidden">
      {/* Fixed Clean Screen HUD Pill for Exploded View — never overlaps 3D geometry */}
      {settings.explodedView && !suppressHtmlLabels ? (
        <div className="cad-exploded-hud">
          <span className="cad-exploded-hud-dot" />
          <span>Exploded Assembly · Drag to Orbit · Click any Wall to Inspect Layers</span>
        </div>
      ) : null}

      <Canvas
        shadows={settings.showSunShadows}
        dpr={[1, 2]}
        camera={{ position: [6.5, 4.5, 6.5], fov: 42, near: 0.1, far: 250 }}
        onPointerMissed={() => onSelect(null)}
        className="touch-none"
      >
        <color attach="background" args={[bgColor]} />
        {!envActive ? <fog attach="fog" args={[bgColor, 24, 65]} /> : null}

        <CameraController preset={activePreset} controlsRef={controlsRef} model={model} explodedView={settings.explodedView} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={1.8}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />

        <SunLighting model={model} settings={settings} sunHour={sunHour} solarDate={solarDate} suppressHtmlLabels={suppressHtmlLabels} />
        <SceneEnvironment model={model} settings={settings} sunHour={sunHour} solarDate={solarDate} />

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
        {settings.showCompass && !suppressHtmlLabels ? (
          <CompassRose orientation={model.geometry.orientation} radius={compassRadius} />
        ) : null}

        {/* Interactive Dimension Lines & Callouts — hidden during exploded view to avoid label clutter */}
        {settings.showDimensions && !settings.explodedView && !suppressHtmlLabels ? (
          <DimensionLines model={model} selected={selected} />
        ) : null}

        {/* 3D Shelter Mesh with Architectural Assemblies & Visualizers */}
        <ShelterMesh
          model={model}
          selected={selected}
          onSelect={onSelect}
          settings={suppressHtmlLabels ? { ...settings, revealLayers: false } : settings}
          hourlyStep={hourlyStep}
          sunHour={sunHour}
          solarDate={solarDate}
          suppressHtmlLabels={suppressHtmlLabels}
        />
      </Canvas>

      {/* Thermographic & Solar Scale Legend HUD */}
      {!suppressHtmlLabels ? (
        <ThermalScaleLegend
          mode={settings.visualization}
          model={model}
          hourlyStep={hourlyStep}
          hasSimResults={hasSimResults}
        />
      ) : null}
    </div>
  );
}

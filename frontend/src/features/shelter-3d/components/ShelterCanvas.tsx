"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ShelterModel } from "@/types/shelter";
import type { CameraPreset, SelectedElement, ViewerSettings } from "../types";
import { ShelterMesh } from "./ShelterMesh";
import { DimensionLines } from "./DimensionLines";
import { CompassRose } from "./CompassRose";

interface ShelterCanvasProps {
  model: ShelterModel;
  selected: SelectedElement;
  onSelect: (element: SelectedElement) => void;
  settings: ViewerSettings;
  activePreset: CameraPreset;
}

function CameraController({ preset, controlsRef }: { preset: CameraPreset; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const span = 12;
    const positions: Record<CameraPreset, [number, number, number]> = {
      iso: [span, 8, span], top: [0, 18, 0.01], south: [0, 3, 16], north: [0, 3, -16], east: [16, 3, 0], west: [-16, 3, 0],
    };
    controls.object.position.set(...positions[preset]);
    controls.target.set(0, 1.4, 0);
    controls.update();
  }, [preset, controlsRef]);
  return null;
}

export function ShelterCanvas({ model, selected, onSelect, settings, activePreset }: ShelterCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const compassRadius = Math.max(4.5, Math.max(model.geometry.length, model.geometry.width) * 0.72);

  return (
    <div className="cad-viewport size-full">
      <Canvas shadows={settings.showSunShadows} dpr={[1, 1.7]} camera={{ position: [12, 8, 12], fov: 38, near: 0.1, far: 180 }} onPointerMissed={() => onSelect(null)} className="touch-none">
        <color attach="background" args={["#dce7ed"]} />
        <fog attach="fog" args={["#dce7ed", 24, 60]} />
        <CameraController preset={activePreset} controlsRef={controlsRef} />
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} minDistance={4} maxDistance={42} maxPolarAngle={Math.PI / 2 - 0.03} />
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#ffffff", "#6e818f", 0.8]} />
        <directionalLight position={[10, 16, 8]} intensity={1.65} castShadow={settings.showSunShadows} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0002} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#c9d8e0" roughness={1} />
        </mesh>
        {settings.showGrid ? <Grid position={[0, 0.005, 0]} args={[50, 50]} cellSize={0.5} cellThickness={0.45} cellColor="#8da0ab" sectionSize={5} sectionThickness={1} sectionColor="#526572" fadeDistance={32} fadeStrength={1.5} infiniteGrid /> : null}
        {settings.showCompass ? <CompassRose orientation={model.geometry.orientation} radius={compassRadius} /> : null}
        {settings.showDimensions ? <DimensionLines model={model} selected={selected} /> : null}
        <ShelterMesh model={model} selected={selected} onSelect={onSelect} settings={settings} />
      </Canvas>
    </div>
  );
}

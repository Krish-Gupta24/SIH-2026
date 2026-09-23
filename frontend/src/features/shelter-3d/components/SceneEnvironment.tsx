"use client";

import { useMemo } from "react";
import { Cloud, Sky } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { ViewerSettings } from "../types";
import { createLadakhGroundTexture } from "../procedural-textures";
import { computeSunAngles } from "../sun-geometry";

interface Props {
  model: ShelterModel;
  settings: ViewerSettings;
  sunHour: number;
}

function MountainRing() {
  const peaks = useMemo(() => {
    const items: { pos: [number, number, number]; scale: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const radius = 38 + (i % 3) * 4;
      items.push({
        pos: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius],
        scale: [14 + (i % 4) * 3, 10 + (i % 5) * 2.5, 10 + (i % 2) * 4],
        rot: angle,
      });
    }
    return items;
  }, []);

  return (
    <group>
      {peaks.map((peak, i) => (
        <mesh
          key={i}
          position={[peak.pos[0], peak.scale[1] * 0.45, peak.pos[2]]}
          rotation={[0, peak.rot, 0]}
          castShadow={false}
          receiveShadow={false}
        >
          <coneGeometry args={[peak.scale[0] * 0.35, peak.scale[1], 5, 1]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#8b9cab" : "#6d7d8c"}
            roughness={0.92}
            metalness={0.02}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function SiteContext({ model }: { model: ShelterModel }) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const pad = 3.5;

  return (
    <group>
      {/* Perimeter rubble / dry-stone boundary */}
      {[
        [0, 0.12, W / 2 + pad],
        [0, 0.12, -W / 2 - pad],
        [L / 2 + pad, 0.12, 0],
        [-L / 2 - pad, 0.12, 0],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={i < 2 ? [L + pad * 2, 0.24, 0.45] : [0.45, 0.24, W + pad * 2]} />
          <meshStandardMaterial color="#9aa3a0" roughness={0.95} metalness={0.03} />
        </mesh>
      ))}

      {/* Gravel apron under the shelter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[Math.max(L, W) * 0.85 + 2, 48]} />
        <meshStandardMaterial color="#aeb8b2" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

export function SceneEnvironment({ model, settings, sunHour }: Props) {
  const lat = model.location?.latitude ?? 34.15;
  const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(lat, sunHour);
  const groundMap = useMemo(() => createLadakhGroundTexture(), []);

  const skySun = useMemo((): [number, number, number] => {
    const alt = Math.max(0.02, THREE.MathUtils.degToRad(altitudeDeg));
    const az = THREE.MathUtils.degToRad(azimuthFromNorthDeg);
    return [Math.cos(alt) * Math.sin(az), Math.sin(alt), Math.cos(alt) * Math.cos(az)];
  }, [altitudeDeg, azimuthFromNorthDeg]);

  const isAnalysis =
    settings.visualization === "thermal" ||
    settings.visualization === "heat-flow";

  if (!settings.showEnvironment || isAnalysis) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#c8d7df" roughness={1} metalness={0} />
      </mesh>
    );
  }

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={skySun}
        turbidity={2.8}
        rayleigh={1.2}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />

      <fog attach="fog" args={["#c9d8e4", 28, 95]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          map={groundMap}
          color="#b5c0b8"
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>

      <MountainRing />
      <SiteContext model={model} />

      <Cloud
        opacity={0.35}
        speed={0.12}
        bounds={[22, 4, 22]}
        segments={18}
        position={[-12, 14, -18]}
        color="#f0f4f8"
      />
      <Cloud
        opacity={0.28}
        speed={0.08}
        bounds={[18, 3, 14]}
        segments={14}
        position={[16, 16, 10]}
        color="#e8eef3"
      />
    </>
  );
}

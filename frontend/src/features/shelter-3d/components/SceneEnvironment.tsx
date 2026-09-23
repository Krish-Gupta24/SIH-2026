"use client";

import { useMemo } from "react";
import { Cloud, Sky } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { ViewerSettings } from "../types";
import { createLandscapeGroundTexture, type LandscapeKind } from "../procedural-textures";
import { computeSunAngles } from "../sun-geometry";

interface Props {
  model: ShelterModel;
  settings: ViewerSettings;
  sunHour: number;
}

const landscapeConfig: Record<LandscapeKind, { fog: string; terrain: string; ridge: string; turbidity: number; rayleigh: number }> = {
  ladakh: { fog: "#c7c6bd", terrain: "#8d8474", ridge: "#665f58", turbidity: 1.9, rayleigh: 1.35 },
  desert: { fog: "#dfc59d", terrain: "#bd915f", ridge: "#a97947", turbidity: 4.6, rayleigh: 1.6 },
  plains: { fog: "#b8ced2", terrain: "#769166", ridge: "#67806a", turbidity: 3.2, rayleigh: 1.9 },
};

function landscapeFor(model: ShelterModel): LandscapeKind {
  const location = `${model.location.region} ${model.location.climateZone} ${model.location.weatherSource}`.toLowerCase();
  if (location.includes("ladakh") || location.includes("leh") || location.includes("himal") || location.includes("alpine") || model.location.elevation >= 2600) return "ladakh";
  if (location.includes("desert") || location.includes("arid") || location.includes("hot dry") || location.includes("bwh")) return "desert";
  return "plains";
}

function terrainHeight(kind: LandscapeKind, x: number, z: number) {
  const radius = Math.hypot(x, z);
  const edge = THREE.MathUtils.smoothstep(radius, 12, 60);
  const broad = Math.sin(x * 0.11 + z * 0.035) * Math.cos(z * 0.09 - x * 0.025);
  const fine = Math.sin(x * 0.47) * Math.cos(z * 0.39);
  if (kind === "ladakh") return edge * (2.8 + broad * 3.2 + fine * 0.65 + Math.max(0, radius - 30) * 0.12);
  if (kind === "desert") return edge * (0.35 + Math.sin(x * 0.18 + z * 0.05) * 0.85 + Math.cos(z * 0.15) * 0.45);
  return edge * (0.05 + broad * 0.16 + fine * 0.05);
}

function TerrainSurface({ kind }: { kind: LandscapeKind }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(132, 132, 96, 96);
    const positions = terrain.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      positions.setZ(index, terrainHeight(kind, positions.getX(index), positions.getY(index)));
    }
    positions.needsUpdate = true;
    terrain.computeVertexNormals();
    return terrain;
  }, [kind]);
  const map = useMemo(() => createLandscapeGroundTexture(kind), [kind]);
  const config = landscapeConfig[kind];

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
      <meshStandardMaterial map={map} color={config.terrain} roughness={0.94} metalness={0.01} />
    </mesh>
  );
}

function DistantLandscape({ kind }: { kind: LandscapeKind }) {
  const features = useMemo(() => Array.from({ length: kind === "plains" ? 24 : 18 }, (_, index) => {
    const angle = (index / (kind === "plains" ? 24 : 18)) * Math.PI * 2 + 0.16;
    const radius = 38 + ((index * 13) % 9);
    const isMountain = kind === "ladakh";
    return {
      position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [number, number, number],
      width: isMountain ? 10 + ((index * 7) % 9) : 4 + ((index * 7) % 6),
      height: isMountain ? 15 + ((index * 11) % 14) : 3 + ((index * 11) % 9),
      rotation: angle,
    };
  }), [kind]);
  const config = landscapeConfig[kind];

  if (kind === "plains") {
    return <group>{features.map((feature, index) => <group key={index} position={feature.position}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow><cylinderGeometry args={[0.08, 0.11, 2.1, 6]} /><meshStandardMaterial color="#6c5337" roughness={0.9} /></mesh>
      <mesh position={[0, 2.7, 0]} castShadow receiveShadow><coneGeometry args={[0.85 + (index % 3) * 0.22, 2.4 + (index % 2) * 0.4, 7]} /><meshStandardMaterial color={index % 3 === 0 ? "#567350" : "#698460"} roughness={0.9} flatShading /></mesh>
    </group>)}</group>;
  }

  if (kind === "desert") {
    return <group>{features.map((feature, index) => (
      <group key={index} position={feature.position} rotation={[0, feature.rotation, 0]}>
        <mesh position={[0, 0.18, 0]} receiveShadow>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#d2a064" : index % 3 === 1 ? "#bc824a" : "#e2ba7f"} roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.2, 0]} scale={[feature.width * 1.35, 1.1 + (index % 3) * 0.28, feature.width * 2.5]} receiveShadow>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#d2a064" : index % 3 === 1 ? "#bc824a" : "#e2ba7f"} roughness={0.98} />
        </mesh>
      </group>
    ))}</group>;
  }

  return <group>{features.map((feature, index) => <group key={index} position={feature.position} rotation={[0, feature.rotation, 0]}>
    <mesh position={[0, feature.height * 0.45, 0]} castShadow={false} receiveShadow={false}><coneGeometry args={[feature.width * 0.52, feature.height, 7, 1]} /><meshStandardMaterial color={index % 2 === 0 ? config.ridge : "#766d63"} roughness={0.95} flatShading /></mesh>
    <mesh position={[feature.width * 0.18, feature.height * 0.36, -feature.width * 0.12]} rotation={[0, 0.45, 0]} castShadow={false} receiveShadow={false}><coneGeometry args={[feature.width * 0.38, feature.height * 0.72, 7, 1]} /><meshStandardMaterial color="#72685e" roughness={0.95} flatShading /></mesh>
    <mesh position={[-feature.width * 0.13, feature.height * 0.8, 0]} castShadow={false} receiveShadow={false}><coneGeometry args={[feature.width * 0.25, feature.height * 0.31, 7, 1]} /><meshStandardMaterial color="#f4f5f3" roughness={0.9} flatShading /></mesh>
  </group>)}</group>;
}

function PrayerFlags({ model }: { model: ShelterModel }) {
  const offset = Math.max(model.geometry.length, model.geometry.width) * 0.72 + 2.5;
  const colors = ["#285f9e", "#f0c832", "#c64e45", "#477a48", "#f3f0e8"];
  return <group position={[-offset, 0, -offset * 0.4]} rotation={[0, 0.42, 0]}>
    {[-1.5, 1.5].map((x) => <mesh key={x} position={[x, 1.2, 0]} castShadow><cylinderGeometry args={[0.03, 0.04, 2.4, 8]} /><meshStandardMaterial color="#745d45" roughness={0.9} /></mesh>)}
    {colors.map((color, index) => <mesh key={color} position={[-1.18 + index * 0.59, 1.72 - index * 0.045, 0.02]} rotation={[0, 0, -0.05]}><planeGeometry args={[0.5, 0.34]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} /></mesh>)}
  </group>;
}

function SiteContext({ model, kind }: { model: ShelterModel; kind: LandscapeKind }) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const pad = 3.5;
  const boundaryColor = kind === "ladakh" ? "#8d8372" : kind === "desert" ? "#a98055" : "#6d8063";
  const boundary = [[0, 0.12, W / 2 + pad], [0, 0.12, -W / 2 - pad], [L / 2 + pad, 0.12, 0], [-L / 2 - pad, 0.12, 0]];

  return <group>
    {boundary.map((position, index) => <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow><boxGeometry args={index < 2 ? [L + pad * 2, 0.24, 0.45] : [0.45, 0.24, W + pad * 2]} /><meshStandardMaterial color={boundaryColor} roughness={0.95} metalness={0.02} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><circleGeometry args={[Math.max(L, W) * 0.85 + 2, 48]} /><meshStandardMaterial color={kind === "ladakh" ? "#b6ab94" : kind === "desert" ? "#d2af78" : "#91a27d"} roughness={1} /></mesh>
    {kind === "ladakh" ? <PrayerFlags model={model} /> : null}
  </group>;
}

export function SceneEnvironment({ model, settings, sunHour }: Props) {
  const lat = model.location?.latitude ?? 34.15;
  const kind = landscapeFor(model);
  const config = landscapeConfig[kind];
  const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(lat, sunHour);
  const skySun = useMemo((): [number, number, number] => {
    const alt = Math.max(0.02, THREE.MathUtils.degToRad(altitudeDeg));
    const az = THREE.MathUtils.degToRad(azimuthFromNorthDeg);
    return [Math.cos(alt) * Math.sin(az), Math.sin(alt), Math.cos(alt) * Math.cos(az)];
  }, [altitudeDeg, azimuthFromNorthDeg]);
  const isAnalysis = settings.visualization === "thermal" || settings.visualization === "heat-flow";

  if (!settings.showEnvironment || isAnalysis) return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#c8d7df" roughness={1} /></mesh>;

  return <>
    <Sky distance={450000} sunPosition={skySun} turbidity={config.turbidity} rayleigh={config.rayleigh} mieCoefficient={0.004} mieDirectionalG={0.85} />
    <fog attach="fog" args={[config.fog, kind === "plains" ? 46 : 34, 115]} />
    <TerrainSurface kind={kind} />
    <DistantLandscape kind={kind} />
    <SiteContext model={model} kind={kind} />
    {kind === "plains" ? <Cloud opacity={0.34} speed={0.1} bounds={[25, 4, 20]} segments={18} position={[-12, 15, -18]} color="#eef3f4" /> : null}
    {kind === "ladakh" ? <Cloud opacity={0.16} speed={0.08} bounds={[16, 2, 12]} segments={12} position={[20, 20, -14]} color="#f4f3ef" /> : null}
  </>;
}

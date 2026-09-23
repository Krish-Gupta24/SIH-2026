"use client";

import { useMemo, useRef } from "react";
import { Cloud, Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { ViewerSettings } from "../types";
import {
  createLandscapeGroundTexture,
  createSnowLandscapeGroundTexture,
  type LandscapeKind,
} from "../procedural-textures";
import { computeSunAngles, dayOfYearFromIsoDate } from "../sun-geometry";

interface Props {
  model: ShelterModel;
  settings: ViewerSettings;
  sunHour: number;
  solarDate: string;
}

const landscapeConfig: Record<
  LandscapeKind,
  {
    fog: string;
    snowFog: string;
    terrain: string;
    ridge: string;
    turbidity: number;
    rayleigh: number;
    skyTint: string;
    ambientLight: number;
    shadowIntensity: number;
  }
> = {
  ladakh: {
    fog: "#c7c6bd",
    snowFog: "#dce9f4",
    terrain: "#8d8474",
    ridge: "#665f58",
    // High altitude = extremely clean air, very low turbidity/rayleigh → ultra-blue sky
    turbidity: 1.1,
    rayleigh: 0.82,
    skyTint: "#e0eef8",
    ambientLight: 0.52,
    shadowIntensity: 0.8,
  },
  desert: {
    fog: "#dfc59d",
    snowFog: "#dce9f4",
    terrain: "#bd915f",
    ridge: "#a97947",
    turbidity: 5.2,
    rayleigh: 1.8,
    skyTint: "#f4e8d8",
    ambientLight: 0.55,
    shadowIntensity: 0.85,
  },
  plains: {
    fog: "#b8ced2",
    snowFog: "#d8e6ef",
    terrain: "#769166",
    ridge: "#67806a",
    turbidity: 3.2,
    rayleigh: 1.9,
    skyTint: "#d8e8ed",
    ambientLight: 0.5,
    shadowIntensity: 0.6,
  },
};

function landscapeFor(model: ShelterModel): LandscapeKind {
  const location = `${model.location.region} ${model.location.climateZone} ${model.location.weatherSource}`.toLowerCase();
  if (
    location.includes("ladakh") ||
    location.includes("leh") ||
    location.includes("himal") ||
    location.includes("alpine") ||
    model.location.elevation >= 2200
  )
    return "ladakh";
  if (
    location.includes("desert") ||
    location.includes("arid") ||
    location.includes("hot dry") ||
    location.includes("bwh")
  )
    return "desert";
  return "plains";
}

function terrainHeight(kind: LandscapeKind, x: number, z: number, snowy: boolean) {
  const radius = Math.hypot(x, z);
  const edge = THREE.MathUtils.smoothstep(radius, 12, 60);
  const broad = Math.sin(x * 0.11 + z * 0.035) * Math.cos(z * 0.09 - x * 0.025);
  const fine = Math.sin(x * 0.47) * Math.cos(z * 0.39);

  if (kind === "ladakh") {
    // Dramatic mountain terrain: steep ridges, talus slopes, snow wave drifts
    const ridges = Math.sin(x * 0.07) * Math.cos(z * 0.05) * 2.8;
    const peaks = Math.max(0, Math.sin(x * 0.03 + z * 0.04) * 4.5);
    const talus = Math.abs(Math.sin(x * 0.22 + z * 0.17)) * 0.6;
    const snowDrift = snowy
      ? Math.sin(x * 0.12 + z * 0.08) * 0.95 + Math.cos(z * 0.18) * 0.75 + 0.45
      : 0;
    return (
      edge *
      (3.2 +
        broad * 4.5 +
        fine * 0.85 +
        ridges +
        peaks +
        talus +
        snowDrift +
        Math.max(0, radius - 22) * 0.22)
    );
  }

  if (kind === "desert") {
    const duneCrest = Math.sin(z * 0.18 + x * 0.04) * Math.cos(x * 0.12);
    const barchan = Math.max(0, Math.sin(x * 0.26 + z * 0.15)) * 0.5;
    const ripple = Math.sin(z * 0.9) * Math.cos(x * 0.7) * 0.08;
    return edge * (0.3 + duneCrest * 1.6 + Math.cos(x * 0.18) * 0.5 + barchan + ripple);
  }

  const rolls = Math.sin(x * 0.08) * Math.cos(z * 0.06) * 0.3;
  return edge * (0.05 + broad * 0.18 + fine * 0.05 + rolls);
}

function TerrainSurface({ kind, snowy }: { kind: LandscapeKind; snowy: boolean }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(132, 132, 110, 110);
    const positions = terrain.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      positions.setZ(
        index,
        terrainHeight(kind, positions.getX(index), positions.getY(index), snowy)
      );
    }
    positions.needsUpdate = true;
    terrain.computeVertexNormals();
    return terrain;
  }, [kind, snowy]);

  const map = useMemo(() => {
    if (snowy) {
      return createSnowLandscapeGroundTexture();
    }
    return createLandscapeGroundTexture(kind);
  }, [kind, snowy]);

  const config = landscapeConfig[kind];

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.28, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        map={map}
        color={snowy ? "#ffffff" : config.terrain}
        roughness={snowy ? 0.72 : 0.94}
        metalness={snowy ? 0.04 : 0.01}
      />
    </mesh>
  );
}

/** Distant Himalayan Mountain Range — graceful distant snow massifs without black peaks */
function DistantMountains({ kind, snowy }: { kind: LandscapeKind; snowy: boolean }) {
  // Distant Horizon Snow Massifs — lower, graceful height that frames the shelter
  const outerPeaks = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const angle = (index / 30) * Math.PI * 2 + 0.1;
        const radius = 68 + ((index * 17) % 22); // Pushed further back for panoramic depth
        return {
          position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [
            number,
            number,
            number
          ],
          width: 18 + ((index * 6) % 12),
          height: 13 + ((index * 5) % 9), // Decreased height from ~60m down to 13–21m
          rotation: angle,
        };
      }),
    []
  );

  // Intermediate Rolling Snow Ridges
  const innerPeaks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = (index / 24) * Math.PI * 2 + 0.25;
        const radius = 48 + ((index * 11) % 16);
        return {
          position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [
            number,
            number,
            number
          ],
          width: 14 + ((index * 5) % 10),
          height: 7 + ((index * 3) % 6), // Gentle rolling foothills (7–12m)
          rotation: angle + 0.15,
        };
      }),
    []
  );

  return (
    <group>
      {/* 1. Distant Mountain Peaks — 100% Pure White Snow Mantle (Zero Black Peaks) */}
      {outerPeaks.map((peak, index) => (
        <group key={`outer-${index}`} position={peak.position} rotation={[0, peak.rotation, 0]}>
          {snowy ? (
            <>
              {/* Main Mountain Snow Massif — Pure Brilliant Snow */}
              <mesh position={[0, peak.height * 0.48, 0]}>
                <coneGeometry args={[peak.width * 0.52, peak.height, 8, 1]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  roughness={0.72}
                  metalness={0.03}
                  flatShading
                />
              </mesh>

              {/* Brilliant Glowing Summit Snow Cap (Peak is 100% Pure Snow White) */}
              <mesh position={[0, peak.height * 0.72, 0]}>
                <coneGeometry args={[peak.width * 0.28, peak.height * 0.52, 7, 1]} />
                <meshStandardMaterial
                  color="#ffffff"
                  roughness={0.52}
                  metalness={0.05}
                  flatShading
                />
              </mesh>

              {/* Secondary Snow Shoulder Ridge */}
              <mesh
                position={[peak.width * 0.22, peak.height * 0.36, -peak.width * 0.1]}
                rotation={[0, 0.45, 0]}
              >
                <coneGeometry args={[peak.width * 0.38, peak.height * 0.7, 7, 1]} />
                <meshStandardMaterial
                  color="#f1f7fa"
                  roughness={0.76}
                  flatShading
                />
              </mesh>

              {/* Lower Glacial Apron blending into horizon terrain */}
              <mesh position={[0, peak.height * 0.14, 0]}>
                <cylinderGeometry
                  args={[peak.width * 0.46, peak.width * 0.88, peak.height * 0.28, 8]}
                />
                <meshStandardMaterial
                  color="#ebf5fa"
                  roughness={0.82}
                  flatShading
                />
              </mesh>
            </>
          ) : (
            // Non-snowy summer rock peak with snow cap
            <>
              <mesh position={[0, peak.height * 0.45, 0]}>
                <coneGeometry args={[peak.width * 0.52, peak.height, 8, 1]} />
                <meshStandardMaterial color="#6a635b" roughness={0.95} flatShading />
              </mesh>
              <mesh position={[0, peak.height * 0.75, 0]}>
                <coneGeometry args={[peak.width * 0.26, peak.height * 0.42, 8, 1]} />
                <meshStandardMaterial color="#ffffff" roughness={0.7} flatShading />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* 2. Inner Rolling Snow Ridges */}
      {innerPeaks.map((peak, index) => (
        <group key={`inner-${index}`} position={peak.position} rotation={[0, peak.rotation, 0]}>
          {snowy ? (
            <>
              {/* Pure Snow Ridge */}
              <mesh position={[0, peak.height * 0.48, 0]}>
                <coneGeometry args={[peak.width * 0.5, peak.height, 7, 1]} />
                <meshStandardMaterial color="#f4f9fc" roughness={0.76} flatShading />
              </mesh>

              {/* Snow Shoulder */}
              <mesh
                position={[-peak.width * 0.18, peak.height * 0.34, peak.width * 0.08]}
                rotation={[0, -0.25, 0]}
              >
                <coneGeometry args={[peak.width * 0.34, peak.height * 0.65, 6, 1]} />
                <meshStandardMaterial color="#edf6fb" roughness={0.78} flatShading />
              </mesh>
            </>
          ) : (
            <mesh position={[0, peak.height * 0.45, 0]}>
              <coneGeometry args={[peak.width * 0.5, peak.height, 7, 1]} />
              <meshStandardMaterial color="#726a62" roughness={0.95} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function DesertDunes({ model }: { model: ShelterModel }) {
  const features = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = (index / 24) * Math.PI * 2 + 0.2;
        const radius = 36 + ((index * 13) % 11);
        return {
          position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [
            number,
            number,
            number
          ],
          scaleX: 6 + ((index * 7) % 9),
          scaleZ: 10 + ((index * 9) % 14),
          height: 1.8 + ((index * 5) % 3) * 0.6,
          rotation: angle + 0.3,
          color: index % 3 === 0 ? "#d2a064" : index % 3 === 1 ? "#bc824a" : "#e2ba7f",
        };
      }),
    []
  );

  return (
    <group>
      {features.map((feature, index) => (
        <group key={index} position={feature.position} rotation={[0, feature.rotation, 0]}>
          <mesh
            position={[0, feature.height * 0.4, 0]}
            scale={[feature.scaleX * 0.9, feature.height, feature.scaleZ]}
          >
            <sphereGeometry args={[1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={feature.color} roughness={0.98} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PlainsTreeline() {
  const trees = useMemo(
    () =>
      Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2 + 0.1;
        const radius = 40 + ((index * 11) % 12);
        return {
          position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [
            number,
            number,
            number
          ],
          trunkH: 2.0 + ((index * 3) % 5) * 0.35,
          crownR: 0.85 + ((index * 7) % 4) * 0.22,
          crownH: 2.2 + ((index * 5) % 3) * 0.5,
          color:
            index % 4 === 0
              ? "#4a6935"
              : index % 4 === 1
              ? "#5c7a42"
              : index % 4 === 2
              ? "#3f6030"
              : "#667d4a",
        };
      }),
    []
  );

  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={tree.position}>
          <mesh position={[0, tree.trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, tree.trunkH, 6]} />
            <meshStandardMaterial color="#6c5337" roughness={0.9} />
          </mesh>
          <mesh position={[0, tree.trunkH + tree.crownH * 0.35, 0]} castShadow>
            <coneGeometry args={[tree.crownR + 0.25, tree.crownH * 0.7, 7]} />
            <meshStandardMaterial color={tree.color} roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Local site rocks, boulders and snow mounds */
function SiteDetail({ kind, snowy }: { kind: LandscapeKind; snowy: boolean }) {
  const details = useMemo(
    () =>
      Array.from({ length: kind === "plains" ? 44 : 32 }, (_, index) => {
        const angle = index * 2.39996;
        const radius = 10 + (index % 9) * 2.4;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          scale: 0.32 + (index % 5) * 0.1,
        };
      }),
    [kind]
  );

  if (kind === "ladakh") {
    return (
      <group>
        {details.map((detail, index) => (
          <group key={index} position={[detail.x, 0.08, detail.z]}>
            {/* Rock boulder / natural snow drift mound */}
            <mesh
              position={[0, detail.scale * 0.25, 0]}
              scale={[1.2, 0.65, 0.95]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[detail.scale, 1]} />
              <meshStandardMaterial
                color={snowy ? "#dce8f0" : "#4d463e"}
                roughness={0.95}
                flatShading
              />
            </mesh>

            {/* Snow cushion resting on top of boulder */}
            {snowy && (
              <mesh
                position={[0, detail.scale * 0.42, 0]}
                scale={[1.18, 0.42, 1.05]}
                receiveShadow
              >
                <sphereGeometry args={[detail.scale * 0.96, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#ffffff" roughness={0.7} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    );
  }

  return null;
}

/** Tibetan prayer flags fluttering against the winter sky */
function PrayerFlags({ model }: { model: ShelterModel }) {
  const offset = Math.max(model.geometry.length, model.geometry.width) * 0.72 + 2.8;
  const colors = ["#285f9e", "#f0c832", "#c64e45", "#477a48", "#f3f0e8"];
  return (
    <group position={[-offset, 0, -offset * 0.4]} rotation={[0, 0.42, 0]}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 2.5, 8]} />
          <meshStandardMaterial color="#6a543e" roughness={0.9} />
        </mesh>
      ))}
      {colors.map((color, index) => (
        <mesh
          key={color}
          position={[-1.24 + index * 0.62, 1.76 - index * 0.045, 0.02]}
          rotation={[0, 0, -0.05]}
        >
          <planeGeometry args={[0.52, 0.35]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      ))}
      {/* Rope between poles */}
      <mesh position={[0, 2.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 3.4, 4]} />
        <meshStandardMaterial color="#d4b47c" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Tibetan stone cairn (ovoo) with snow cap */
function StoneCairn({ position, snowy }: { position: [number, number, number]; snowy: boolean }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((level) => (
        <mesh
          key={level}
          position={[0, level * 0.22 + 0.08, 0]}
          scale={[1 - level * 0.18, 1, 1 - level * 0.18]}
        >
          <dodecahedronGeometry args={[0.22 - level * 0.035, 0]} />
          <meshStandardMaterial
            color={level % 2 === 0 ? "#5a5246" : "#4a433a"}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
      {/* Rounded snow cap on cairn */}
      {snowy && (
        <mesh position={[0, 0.88, 0]}>
          <sphereGeometry args={[0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.78} />
        </mesh>
      )}
    </group>
  );
}

/** Immediate building ground pad, snow banks, and perimeter boundary */
function SiteContext({
  model,
  kind,
  snowy,
}: {
  model: ShelterModel;
  kind: LandscapeKind;
  snowy: boolean;
}) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const pad = 5.2; // Enlarged snow site boundary
  const boundaryColor = snowy
    ? "#524b42"
    : kind === "ladakh"
    ? "#8d8372"
    : kind === "desert"
    ? "#a98055"
    : "#6d8063";
  const boundary = [
    [0, 0.12, W / 2 + pad],
    [0, 0.12, -W / 2 - pad],
    [L / 2 + pad, 0.12, 0],
    [-L / 2 - pad, 0.12, 0],
  ];

  return (
    <group>
      {/* Stone boundary walls */}
      {boundary.map((position, index) => (
        <group key={index}>
          <mesh position={position as [number, number, number]} castShadow receiveShadow>
            <boxGeometry
              args={index < 2 ? [L + pad * 2, 0.24, 0.45] : [0.45, 0.24, W + pad * 2]}
            />
            <meshStandardMaterial color={boundaryColor} roughness={0.96} metalness={0.02} />
          </mesh>

          {/* Thick, rounded snow cap on top of boundary walls */}
          {snowy && (
            <mesh
              position={[position[0], 0.28, position[2]]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={
                  index < 2
                    ? [L + pad * 2 + 0.14, 0.12, 0.58]
                    : [0.58, 0.12, W + pad * 2 + 0.14]
                }
              />
              <meshStandardMaterial color="#ffffff" roughness={0.65} />
            </mesh>
          )}
        </group>
      ))}

      {/* Immediate site circular ground pad — pure thick snow blanket */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <circleGeometry args={[Math.max(L, W) * 0.95 + 3.2, 48]} />
        <meshStandardMaterial
          color={
            snowy
              ? "#ffffff"
              : kind === "ladakh"
              ? "#b6ab94"
              : kind === "desert"
              ? "#d2af78"
              : "#91a27d"
          }
          roughness={snowy ? 0.65 : 1}
        />
      </mesh>

      {/* Thick snowdrift banks sculpted along all 4 shelter foundation sides */}
      {snowy && (
        <group>
          {/* North foundation snow bank */}
          <mesh
            position={[0, 0.22, -W / 2 - 0.7]}
            scale={[L * 0.96, 0.44, 1.4]}
            rotation={[0.1, 0, 0]}
            receiveShadow
          >
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.65} />
          </mesh>

          {/* South foundation snow bank */}
          <mesh
            position={[0, 0.16, W / 2 + 0.6]}
            scale={[L * 0.9, 0.32, 1.2]}
            rotation={[-0.08, 0, 0]}
            receiveShadow
          >
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.68} />
          </mesh>

          {/* West foundation snow bank (windward crest) */}
          <mesh
            position={[-L / 2 - 0.7, 0.24, 0]}
            scale={[1.5, 0.48, W * 0.96]}
            rotation={[0, 0, -0.1]}
            receiveShadow
          >
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.65} />
          </mesh>

          {/* East foundation snow bank */}
          <mesh
            position={[L / 2 + 0.6, 0.18, 0]}
            scale={[1.2, 0.36, W * 0.9]}
            rotation={[0, 0, 0.08]}
            receiveShadow
          >
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.68} />
          </mesh>
        </group>
      )}

      {kind === "ladakh" ? (
        <>
          <PrayerFlags model={model} />
          <StoneCairn
            position={[L / 2 + pad + 0.8, 0, W / 2 + pad + 0.8]}
            snowy={snowy}
          />
          <StoneCairn
            position={[-L / 2 - pad - 0.8, 0, -W / 2 - pad - 0.8]}
            snowy={snowy}
          />
        </>
      ) : null}
    </group>
  );
}

/** Lightweight GPU points particle system for gentle drifting snow flurries */
function SnowFlurry() {
  const count = 750; // Increased for a rich, immersive winter atmosphere
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 55;
      pos[i * 3 + 1] = Math.random() * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 55;
      spd[i] = 0.8 + Math.random() * 0.9;
    }
    return [pos, spd];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta * 2.4;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.4 + i) * delta * 0.3;

      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 22 + Math.random() * 3;
        arr[i * 3] = (Math.random() - 0.5) * 55;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 55;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.18}
        transparent
        opacity={0.88}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function SceneEnvironment({ model, settings, sunHour, solarDate }: Props) {
  const lat = model.location?.latitude ?? 34.15;
  const kind = landscapeFor(model);
  const elevation = model.location?.elevation ?? 1500;
  const config = landscapeConfig[kind];
  const dayOfYear = dayOfYearFromIsoDate(solarDate);

  // Snowy environment for cold alpine Ladakh climate, winter design condition, or cold weather
  const snowy =
    kind === "ladakh" ||
    (model.location.designTempWinter ?? 5) <= 5 ||
    elevation >= 2000 ||
    model.location.climateZone?.toLowerCase().includes("cold") ||
    model.location.region?.toLowerCase().includes("ladakh") ||
    model.location.region?.toLowerCase().includes("leh");

  const solarSite = useMemo(
    () => ({
      latitudeDeg: lat,
      longitudeDeg: model.location?.longitude ?? 77.58,
      dayOfYear,
    }),
    [lat, model.location?.longitude, dayOfYear]
  );
  const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(solarSite, sunHour);

  const skySun = useMemo((): [number, number, number] => {
    const alt = Math.max(0.02, THREE.MathUtils.degToRad(altitudeDeg));
    const az = THREE.MathUtils.degToRad(azimuthFromNorthDeg);
    return [Math.cos(alt) * Math.sin(az), Math.sin(alt), Math.cos(alt) * Math.cos(az)];
  }, [altitudeDeg, azimuthFromNorthDeg]);

  const dynamicTurbidity =
    kind === "desert" ? config.turbidity + (altitudeDeg < 15 ? 1.5 : 0) : config.turbidity;

  const isAnalysis =
    settings.visualization === "thermal" || settings.visualization === "heat-flow";

  if (!settings.showEnvironment || isAnalysis) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#c8d7df" roughness={1} />
      </mesh>
    );
  }

  // Crisp mountain atmospheric fog
  const fogColor = snowy ? config.snowFog : config.fog;
  const fogNear = snowy ? 36 : kind === "plains" ? 48 : 36;
  const fogFar = snowy ? 140 : kind === "plains" ? 118 : 124;

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={skySun}
        turbidity={snowy ? 1.1 : dynamicTurbidity}
        rayleigh={snowy ? 0.82 : config.rayleigh}
        mieCoefficient={kind === "desert" ? 0.008 : 0.0035}
        mieDirectionalG={kind === "ladakh" ? 0.92 : 0.85}
      />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Snowy or location-specific terrain */}
      <TerrainSurface kind={kind} snowy={snowy} />

      {/* Panoramic Himalayan snow massifs */}
      {kind === "ladakh" ? <DistantMountains kind={kind} snowy={snowy} /> : null}
      {kind === "desert" ? <DesertDunes model={model} /> : null}
      {kind === "plains" ? <PlainsTreeline /> : null}

      {/* Site rocks and boulders with snow caps */}
      <SiteDetail kind={kind} snowy={snowy} />

      {/* Immediate site circle pad, boundary snow caps, and prayer flags */}
      <SiteContext model={model} kind={kind} snowy={snowy} />

      {/* Falling snow particles in the mountain air */}
      {snowy ? <SnowFlurry /> : null}

      {/* High cirrus clouds */}
      {kind === "ladakh" ? (
        <Cloud
          opacity={snowy ? 0.22 : 0.12}
          speed={0.05}
          bounds={[24, 2, 14]}
          segments={12}
          position={[18, 30, -18]}
          color={snowy ? "#ffffff" : "#f5f4f0"}
        />
      ) : null}
    </>
  );
}

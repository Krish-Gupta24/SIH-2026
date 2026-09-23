"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { ViewerSettings } from "../types";
import {
  ambientIntensityForHour,
  computeSunAngles,
  sunLightIntensity,
  sunPositionGeographic,
} from "../sun-geometry";

interface Props {
  model: ShelterModel;
  settings: ViewerSettings;
  sunHour: number;
}

export function SunLighting({ model, settings, sunHour }: Props) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const lat = model.location?.latitude ?? 34.15;
  const { altitudeDeg } = computeSunAngles(lat, sunHour);

  const sunPos = useMemo(
    () => new THREE.Vector3(...sunPositionGeographic(lat, sunHour, 48)),
    [lat, sunHour]
  );
  const sunPath = useMemo(
    () =>
      Array.from({ length: 49 }, (_, index) => index * 0.5)
        .filter((hour) => computeSunAngles(lat, hour).altitudeDeg > 0)
        .map((hour) => sunPositionGeographic(lat, hour, 48)),
    [lat]
  );

  const showSunDisc =
    settings.showEnvironment &&
    settings.visualization !== "thermal" &&
    settings.visualization !== "heat-flow" &&
    altitudeDeg > -1;

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    light.position.copy(sunPos);
    light.intensity = sunLightIntensity(altitudeDeg, settings.visualization);
    light.target = target;
    target.position.set(0, model.geometry.height * 0.45, 0);
    target.updateMatrixWorld();
  });

  const hemiSky = altitudeDeg > 5 ? "#dbeafe" : "#94a3b8";
  const hemiGround = "#7d8f7a";
  const amb = ambientIntensityForHour(sunHour, altitudeDeg);
  const sunMinutes = Math.round((sunHour % 1) * 60);
  const sunTimeLabel = `${Math.floor(sunHour).toString().padStart(2, "0")}:${sunMinutes.toString().padStart(2, "0")}`;

  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={amb} />
      <hemisphereLight args={[hemiSky, hemiGround, amb * 0.95]} />
      <directionalLight
        ref={lightRef}
        position={sunPos.toArray()}
        intensity={sunLightIntensity(altitudeDeg, settings.visualization)}
        castShadow={settings.showSunShadows && altitudeDeg > 2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.00035}
        color={settings.visualization === "solar" ? "#fff4d6" : "#fffaf0"}
      />

      {settings.showEnvironment && settings.visualization === "model" && sunPath.length > 1 ? (
        <Line points={sunPath} color="#e7a82d" lineWidth={0.8} transparent opacity={0.44} />
      ) : null}

      {showSunDisc ? (
        <group position={sunPos.toArray()}>
          <mesh>
            <sphereGeometry args={[1.1, 32, 32]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.65, 24, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.22} />
          </mesh>
          <Html center distanceFactor={55} style={{ pointerEvents: "none" }}>
            <div className="cad-sun-hud">
              <strong>{sunTimeLabel}</strong>
              <span>Alt {altitudeDeg.toFixed(1)}° · {lat.toFixed(1)}°N</span>
            </div>
          </Html>
        </group>
      ) : null}
    </>
  );
}

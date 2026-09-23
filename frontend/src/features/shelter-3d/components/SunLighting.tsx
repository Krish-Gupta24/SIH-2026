"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { ShelterModel } from "@/types/shelter";
import type { ViewerSettings } from "../types";
import {
  ambientIntensityForHour,
  atmosphericColorTemperature,
  computeSunAngles,
  dayOfYearFromIsoDate,
  daylightWindow,
  shadowSoftness,
  solarNoonIntensity,
  sunLightIntensity,
  sunPositionGeographic,
} from "../sun-geometry";

interface Props {
  model: ShelterModel;
  settings: ViewerSettings;
  sunHour: number;
  solarDate: string;
}

/** Returns a human-readable solar phase label for the current time */
function solarPhaseLabel(
  altitudeDeg: number,
  sunHour: number,
  sunrise: number,
  sunset: number
): string {
  if (altitudeDeg <= 0) return sunHour < 12 ? "Night · Pre-dawn" : "Night · After dusk";
  if (sunHour <= sunrise + 1.0) return "Golden Hour · Dawn";
  if (sunHour >= sunset - 1.0) return "Golden Hour · Dusk";
  if (altitudeDeg > 60) return "Solar Noon";
  if (sunHour < 12) return "Morning Sun";
  return "Afternoon Sun";
}

function landscapeKindFor(model: ShelterModel): "ladakh" | "desert" | "plains" {
  const location = `${model.location?.region ?? ""} ${model.location?.climateZone ?? ""} ${model.location?.weatherSource ?? ""}`.toLowerCase();
  const elevation = model.location?.elevation ?? 1500;
  if (
    location.includes("ladakh") ||
    location.includes("leh") ||
    location.includes("himal") ||
    location.includes("alpine") ||
    elevation >= 2600
  ) return "ladakh";
  if (
    location.includes("desert") ||
    location.includes("arid") ||
    location.includes("hot dry") ||
    location.includes("bwh")
  ) return "desert";
  return "plains";
}

export function SunLighting({ model, settings, sunHour, solarDate }: Props) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const discRef = useRef<THREE.Group>(null);
  const targetObj = useRef<THREE.Object3D>(new THREE.Object3D());

  const lat = model.location?.latitude ?? 34.15;
  const lon = model.location?.longitude ?? 77.58;
  const elevation = model.location?.elevation ?? 1500;
  const landscapeKind = landscapeKindFor(model);
  const dayOfYear = dayOfYearFromIsoDate(solarDate);
  const solarSite = { latitudeDeg: lat, longitudeDeg: lon, dayOfYear };

  // ─── Real-time sun position ────────────────────────────────────────────────
  // We store a mutable ref to sunHour so useFrame always reads the latest
  // value without needing to be re-subscribed each render.
  const sunHourRef = useRef(sunHour);
  sunHourRef.current = sunHour;

  // Build the sun arc path (static per date, not per hour)
  const sunPathPoints: [number, number, number][] = [];
  for (let h = 0; h <= 24; h += 0.5) {
    const a = computeSunAngles(solarSite, h);
    if (a.altitudeDeg > 0) sunPathPoints.push(sunPositionGeographic(solarSite, h, 48));
  }

  // Location-aware peak intensity — derived from actual lat/elevation
  const peakIntensity = solarNoonIntensity(lat, dayOfYear, elevation);
  const softness = shadowSoftness(landscapeKind, elevation);
  const shadowBias = -0.00035 - softness * 0.0003;
  const shadowRadius = 1 + Math.round(softness * 4);

  // Hemisphere ground colour from landscape type
  const hemiGround =
    landscapeKind === "ladakh" ? "#6d7f7a" :
    landscapeKind === "desert" ? "#9a7a50" : "#7d8f7a";

  // Daylight window for phase label (static per date)
  const daylight = daylightWindow(solarSite);

  // ─── useFrame: drive EVERYTHING from sunHourRef (always current) ────────────
  useFrame(() => {
    const h = sunHourRef.current;
    const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(solarSite, h);
    const [px, py, pz] = sunPositionGeographic(solarSite, h, 48);

    // Move directional light
    const light = lightRef.current;
    if (light) {
      light.position.set(px, py, pz);
      const baseIntensity = sunLightIntensity(altitudeDeg, settings.visualization);
      light.intensity = baseIntensity * peakIntensity;
      light.color.set(atmosphericColorTemperature(altitudeDeg, landscapeKind, elevation));
      const tgt = targetObj.current;
      tgt.position.set(0, model.geometry.height * 0.45, 0);
      tgt.updateMatrixWorld();
      light.target = tgt;
    }

    // Move sun disc group in lockstep (visible in all views including thermal simulation)
    const disc = discRef.current;
    if (disc) {
      disc.position.set(px, py, pz);
      disc.visible = altitudeDeg > -1.5;
    }
  });

  // These values are only used for the HTML HUD overlay — they're computed at
  // render time (last known sunHour) and are fine to be slightly stale.
  const { altitudeDeg: renderAlt, azimuthFromNorthDeg: renderAz } =
    computeSunAngles(solarSite, sunHour);
  const amb = ambientIntensityForHour(renderAlt) * (0.85 + peakIntensity * 0.15);
  const isHighAltitude = elevation > 2500;
  const isLowLatitude = Math.abs(lat) < 25;
  const hemiSky =
    isHighAltitude
      ? (renderAlt > 5 ? "#cce3f5" : "#8899aa")
      : isLowLatitude
        ? (renderAlt > 5 ? "#e8f4fd" : "#a4b5c6")
        : (renderAlt > 5 ? "#dbeafe" : "#94a3b8");

  const sunMinutes = Math.round((sunHour % 1) * 60);
  const sunTimeLabel = `${Math.floor(sunHour).toString().padStart(2, "0")}:${sunMinutes.toString().padStart(2, "0")}`;
  const phaseLabel = solarPhaseLabel(renderAlt, sunHour, daylight.sunrise, daylight.sunset);

  // Disc colours — driven by render-time alt (updates each re-render / scrub)
  const sunDiscColor = renderAlt < 5
    ? (landscapeKind === "desert" ? "#ff8833" : "#ffaa55")
    : "#fde68a";
  const sunGlowColor = renderAlt < 5
    ? (landscapeKind === "desert" ? "#ff6622" : "#ff8844")
    : "#fbbf24";
  const coronaRadius = landscapeKind === "desert" ? 2.4 : 2.0;

  // Starting position for initial render (avoids flash at origin)
  const [initX, initY, initZ] = sunPositionGeographic(solarSite, sunHour, 48);

  return (
    <>
      <primitive object={targetObj.current} />
      <ambientLight intensity={amb} />
      <hemisphereLight args={[hemiSky, hemiGround, amb * 0.95]} />

      <directionalLight
        ref={lightRef}
        position={[initX, initY, initZ]}
        intensity={sunLightIntensity(renderAlt, settings.visualization) * peakIntensity}
        castShadow={settings.showSunShadows && renderAlt > 2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={shadowBias}
        shadow-radius={shadowRadius}
      />

      {/* Sun arc path for model, thermal, and solar views */}
      {sunPathPoints.length > 1 && (
        <Line
          points={sunPathPoints}
          color="#f59e0b"
          lineWidth={1.0}
          transparent
          opacity={0.35}
        />
      )}

      {/* Sun disc & radiant coronal glow — visible across all modes including thermal simulation */}
      <group ref={discRef} position={[initX, initY, initZ]}>
        {/* Core brilliant solar sphere */}
        <mesh>
          <sphereGeometry args={[1.35, 32, 32]} />
          <meshBasicMaterial color={sunDiscColor} />
        </mesh>
        {/* Radiant inner plasma flare */}
        <mesh>
          <sphereGeometry args={[2.0, 24, 24]} />
          <meshBasicMaterial color={sunGlowColor} transparent opacity={0.32} />
        </mesh>
        {/* Middle coronal glow */}
        <mesh>
          <sphereGeometry args={[coronaRadius + 0.6, 20, 20]} />
          <meshBasicMaterial color={sunGlowColor} transparent opacity={0.14} />
        </mesh>
        {/* Soft outer atmospheric halo */}
        <mesh>
          <sphereGeometry args={[coronaRadius + 2.0, 16, 16]} />
          <meshBasicMaterial color={sunGlowColor} transparent opacity={0.05} />
        </mesh>

        {/* Minimal Sun Indicator Badge positioned below the sun disc — never obscures the radiant sun */}
        {renderAlt > -1.5 && (
          <Html position={[0, -2.6, 0]} center distanceFactor={50} style={{ pointerEvents: "none" }}>
            <div
              className="cad-sun-mini-badge"
              title={`Solar Altitude: ${renderAlt.toFixed(1)}° · Azimuth: ${renderAz.toFixed(0)}° (${phaseLabel})`}
            >
              <span className="cad-sun-mini-icon">☀️</span>
              <span className="cad-sun-mini-time">{sunTimeLabel}</span>
              {renderAlt > 0 ? (
                <span className="cad-sun-mini-alt">{Math.round(renderAlt)}°</span>
              ) : (
                <span className="cad-sun-mini-alt">Dusk</span>
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

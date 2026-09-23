"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html, Line } from "@react-three/drei";
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
  suppressHtmlLabels?: boolean;
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

export function SunLighting({ model, settings, sunHour, solarDate, suppressHtmlLabels = false }: Props) {
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

  // Disc colours — soft warm orangish-amber sun (gentle, light, compact)
  const sunCoreColor = renderAlt < 5
    ? (landscapeKind === "desert" ? "#ea580c" : "#f97316")
    : "#f59e0b"; // Warm soft amber-orange
  const sunInnerCoronaColor = renderAlt < 5
    ? (landscapeKind === "desert" ? "#c2410c" : "#ea580c")
    : "#fb923c"; // Soft radiant warm orange
  const sunOuterGlowColor = renderAlt < 5
    ? (landscapeKind === "desert" ? "#9a3412" : "#c2410c")
    : "#f97316"; // Soft outer amber
  const coronaRadius = landscapeKind === "desert" ? 1.4 : 1.2;

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
          lineWidth={1.2}
          transparent
          opacity={0.4}
        />
      )}

      {/* Sun disc & soft warm coronal glow — compact, lighter and shorter outer circle */}
      <group ref={discRef} position={[initX, initY, initZ]}>
        {/* Core solar sphere - soft warm amber-orange */}
        <mesh>
          <sphereGeometry args={[0.75, 32, 32]} />
          <meshBasicMaterial
            color={sunCoreColor}
            fog={false}
          />
        </mesh>

        {/* Soft inner corona rim - gentle translucent opacity */}
        <mesh>
          <sphereGeometry args={[0.98, 32, 32]} />
          <meshBasicMaterial
            color={sunInnerCoronaColor}
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>

        {/* Short, soft outer corona ring */}
        <mesh>
          <sphereGeometry args={[1.35, 24, 24]} />
          <meshBasicMaterial
            color={sunOuterGlowColor}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>

        {/* Subtle, soft camera-facing circular halo (short radius, no long spike rays) */}
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          {/* Compact soft inner halo disc */}
          <mesh>
            <circleGeometry args={[1.4, 32]} />
            <meshBasicMaterial
              color="#fb923c"
              transparent
              opacity={0.35}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </mesh>

          {/* Short outer circle halo */}
          <mesh>
            <circleGeometry args={[2.0, 32]} />
            <meshBasicMaterial
              color="#ea580c"
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </mesh>
        </Billboard>

        {/* Gentle omnidirectional sun point light (soft, balanced daylight) */}
        <pointLight
          position={[0, 0, 0]}
          color={renderAlt < 5 ? "#ff7733" : "#f97316"}
          intensity={renderAlt > 0 ? 2.4 : 0.8}
          distance={160}
          decay={1.2}
        />

        {/* Minimal Sun Indicator Badge positioned right below the sun disc */}
        {!suppressHtmlLabels && renderAlt > -1.5 && (
          <Html position={[0, -1.35, 0]} center distanceFactor={50} zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
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

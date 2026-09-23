"use client";

import { Html, Line } from "@react-three/drei";

export function CompassRose({ orientation = 0, radius = 7.5 }: { orientation?: number; radius?: number }) {
  const axes: { label: string; point: [number, number, number] }[] = [
    { label: "N", point: [0, 0.03, -radius] },
    { label: "S", point: [0, 0.03, radius] },
    { label: "E", point: [radius, 0.03, 0] },
    { label: "W", point: [-radius, 0.03, 0] },
  ];
  return (
    <group position={[0, 0.02, 0]}>
      {axes.map(({ label, point }) => (
        <group key={label}>
          <Line
            points={[[0, 0.03, 0], point]}
            color={label === "N" ? "#e11d48" : "#94a3b8"}
            lineWidth={label === "N" ? 2.2 : 1.2}
          />
          <Html position={point} center distanceFactor={16} zIndexRange={[5, 0]}>
            <span className={label === "N" ? "cad-compass cad-compass-north" : "cad-compass"}>
              {label}
            </span>
          </Html>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.04, radius, 72]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>
      {/* Position orientation bearing badge cleanly next to South marker on the outer ring */}
      <Html position={[0, 0.05, radius + 0.7]} center distanceFactor={16} zIndexRange={[5, 0]}>
        <span className="cad-bearing">{Math.round(orientation)}° Azimuth</span>
      </Html>
    </group>
  );
}

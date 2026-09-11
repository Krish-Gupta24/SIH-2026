"use client";

import { Html, Line } from "@react-three/drei";

export function CompassRose({ orientation = 0, radius = 4 }: { orientation?: number; radius?: number }) {
  const axes: { label: string; point: [number, number, number] }[] = [
    { label: "N", point: [0, .025, -radius] }, { label: "S", point: [0, .025, radius] }, { label: "E", point: [radius, .025, 0] }, { label: "W", point: [-radius, .025, 0] },
  ];
  return <group position={[0, .02, 0]}>
    {axes.map(({ label, point }) => <group key={label}><Line points={[[0, .025, 0], point]} color={label === "N" ? "#101820" : "#7d909b"} lineWidth={label === "N" ? 1.8 : .8} /><Html position={point} center distanceFactor={14}><span className={label === "N" ? "cad-compass cad-compass-north" : "cad-compass"}>{label}</span></Html></group>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius - .025, radius, 72]} /><meshBasicMaterial color="#6e818f" transparent opacity={.38} /></mesh>
    <Html position={[0, .04, 0]} center distanceFactor={15}><span className="cad-bearing">{Math.round(orientation)}°</span></Html>
  </group>;
}

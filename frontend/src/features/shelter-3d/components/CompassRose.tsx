"use client";

import React from "react";
import { Html, Line } from "@react-three/drei";

export function CompassRose({ orientation = 0, radius = 2.5 }: { orientation?: number; radius?: number }) {
  const pointsNorth: [number, number, number][] = [
    [0, 0.02, 0],
    [0, 0.02, -radius],
  ];
  const pointsSouth: [number, number, number][] = [
    [0, 0.02, 0],
    [0, 0.02, radius],
  ];
  const pointsEast: [number, number, number][] = [
    [0, 0.02, 0],
    [radius, 0.02, 0],
  ];
  const pointsWest: [number, number, number][] = [
    [0, 0.02, 0],
    [-radius, 0.02, 0],
  ];

  return (
    <group position={[0, 0.01, 0]}>
      {/* North Axis (Red) */}
      <Line points={pointsNorth} color="#ef4444" lineWidth={3} />
      <Html position={[0, 0.05, -radius - 0.3]} center distanceFactor={14}>
        <div className="rounded-full bg-red-600/90 text-white font-bold text-[10px] h-5 w-5 flex items-center justify-center shadow select-none">
          N
        </div>
      </Html>

      {/* South Axis (Slate) */}
      <Line points={pointsSouth} color="#64748b" lineWidth={1.5} />
      <Html position={[0, 0.05, radius + 0.3]} center distanceFactor={14}>
        <div className="rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] h-5 w-5 flex items-center justify-center select-none">
          S
        </div>
      </Html>

      {/* East Axis (Slate) */}
      <Line points={pointsEast} color="#64748b" lineWidth={1.5} />
      <Html position={[radius + 0.3, 0.05, 0]} center distanceFactor={14}>
        <div className="rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] h-5 w-5 flex items-center justify-center select-none">
          E
        </div>
      </Html>

      {/* West Axis (Slate) */}
      <Line points={pointsWest} color="#64748b" lineWidth={1.5} />
      <Html position={[-radius - 0.3, 0.05, 0]} center distanceFactor={14}>
        <div className="rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] h-5 w-5 flex items-center justify-center select-none">
          W
        </div>
      </Html>

      {/* Compass Circular Dial Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[radius * 0.98, radius, 48]} />
        <meshBasicMaterial color="#475569" opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

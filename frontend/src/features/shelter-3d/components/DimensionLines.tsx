"use client";

import React from "react";
import { Html, Line } from "@react-three/drei";
import { ShelterModel } from "@/types/shelter";

export function DimensionLines({ model }: { model: ShelterModel }) {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;

  const halfL = L / 2;
  const halfW = W / 2;
  const offset = 0.6; // distance from building face

  // Length line points (along X at front of South Wall)
  const lengthPoints: [number, number, number][] = [
    [-halfL, 0.05, halfW + offset],
    [halfL, 0.05, halfW + offset],
  ];

  // Width line points (along Z on East side)
  const widthPoints: [number, number, number][] = [
    [halfL + offset, 0.05, -halfW],
    [halfL + offset, 0.05, halfW],
  ];

  // Height line points (along Y on vertical corner)
  const heightPoints: [number, number, number][] = [
    [-halfL - offset, 0, halfW + offset],
    [-halfL - offset, H, halfW + offset],
  ];

  return (
    <group>
      {/* Length Line (X) */}
      <Line points={lengthPoints} color="#38bdf8" lineWidth={2} />
      <Html position={[0, 0.1, halfW + offset + 0.15]} center distanceFactor={12}>
        <div className="rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sky-400 border border-sky-500/30 whitespace-nowrap shadow select-none">
          L: {L.toFixed(2)}m
        </div>
      </Html>

      {/* Width Line (Z) */}
      <Line points={widthPoints} color="#34d399" lineWidth={2} />
      <Html position={[halfL + offset + 0.15, 0.1, 0]} center distanceFactor={12}>
        <div className="rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow select-none">
          W: {W.toFixed(2)}m
        </div>
      </Html>

      {/* Height Line (Y) */}
      <Line points={heightPoints} color="#f59e0b" lineWidth={2} />
      <Html position={[-halfL - offset - 0.2, H / 2, halfW + offset]} center distanceFactor={12}>
        <div className="rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 whitespace-nowrap shadow select-none">
          H: {H.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
}

"use client";

import { Html, Line } from "@react-three/drei";
import type { ShelterModel } from "@/types/shelter";
import type { SelectedElement } from "../types";

function Dimension({ points, label, position }: { points: [number, number, number][]; label: string; position: [number, number, number] }) {
  return <><Line points={points} color="#263640" lineWidth={1} /><Html position={position} center distanceFactor={11}><span className="cad-dimension">{label}</span></Html></>;
}

export function DimensionLines({ model, selected }: { model: ShelterModel; selected: SelectedElement }) {
  const { length: l, width: w, height: h } = model.geometry;
  const offset = 0.7;
  const showEnvelope = !selected || selected.type === "shelter" || selected.type === "floor" || selected.type === "roof";
  return <group>
    {showEnvelope ? <>
      <Dimension points={[[-l / 2, .05, w / 2 + offset], [l / 2, .05, w / 2 + offset]]} label={`${l.toFixed(2)} m`} position={[0, .12, w / 2 + offset + .12]} />
      <Dimension points={[[l / 2 + offset, .05, -w / 2], [l / 2 + offset, .05, w / 2]]} label={`${w.toFixed(2)} m`} position={[l / 2 + offset + .12, .12, 0]} />
      <Dimension points={[[-l / 2 - offset, 0, w / 2], [-l / 2 - offset, h, w / 2]]} label={`${h.toFixed(2)} m`} position={[-l / 2 - offset - .12, h / 2, w / 2]} />
    </> : null}
    {selected?.type === "window" ? model.windows.filter((item) => item.id === selected.id).map((window) => <Html key={window.id} position={[0, h + .8, 0]} center><span className="cad-dimension">Window {window.width.toFixed(2)} × {window.height.toFixed(2)} m · sill {window.sillHeight.toFixed(2)} m</span></Html>) : null}
  </group>;
}

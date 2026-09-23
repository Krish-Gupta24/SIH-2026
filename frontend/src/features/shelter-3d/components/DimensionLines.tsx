"use client";

import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import type { ShelterModel } from "@/types/shelter";
import type { SelectedElement } from "../types";
import { deriveShelter3DGeometry } from "../geometry-math";

function Dimension({
  points,
  label,
  position,
}: {
  points: [number, number, number][];
  label: string;
  position: [number, number, number];
}) {
  return (
    <group>
      <Line points={points} color="#0f172a" lineWidth={1.8} />
      <Html position={position} center distanceFactor={15} zIndexRange={[10, 0]}>
        <span className="cad-dimension">{label}</span>
      </Html>
    </group>
  );
}

export function DimensionLines({
  model,
  selected,
}: {
  model: ShelterModel;
  selected: SelectedElement;
}) {
  const { length: l, width: w, height: h } = model.geometry;
  const geom = useMemo(() => deriveShelter3DGeometry(model), [model]);
  const offset = 0.95;
  const showEnvelope =
    !selected ||
    selected.type === "shelter" ||
    selected.type === "floor" ||
    selected.type === "roof";

  const selectedWin =
    selected?.type === "window" ? geom.windows.find((item) => item.id === selected.id) : null;
  const selectedDoor =
    selected?.type === "door" ? geom.doors.find((item) => item.id === selected.id) : null;

  return (
    <group>
      {/* Primary Shelter Dimensions */}
      {showEnvelope ? (
        <>
          <Dimension
            points={[
              [-l / 2, 0.06, w / 2 + offset],
              [l / 2, 0.06, w / 2 + offset],
            ]}
            label={`Length: ${l.toFixed(2)} m`}
            position={[0, 0.22, w / 2 + offset + 0.35]}
          />
          <Dimension
            points={[
              [l / 2 + offset, 0.06, -w / 2],
              [l / 2 + offset, 0.06, w / 2],
            ]}
            label={`Width: ${w.toFixed(2)} m`}
            position={[l / 2 + offset + 0.35, 0.22, 0]}
          />
          <Dimension
            points={[
              [-l / 2 - offset, 0.06, w / 2 + 0.1],
              [-l / 2 - offset, h, w / 2 + 0.1],
            ]}
            label={`Height: ${h.toFixed(2)} m`}
            position={[-l / 2 - offset - 0.35, h / 2, w / 2 + 0.1]}
          />
        </>
      ) : null}

      {/* Selected Window Precise In-Situ Dimension Lines */}
      {selectedWin && (
        <group position={selectedWin.worldPosition} rotation={selectedWin.rotation}>
          {/* Width Dimension along Top */}
          <Dimension
            points={[
              [-selectedWin.dimensions[0] / 2, selectedWin.dimensions[1] / 2 + 0.15, selectedWin.dimensions[2] / 2 + 0.05],
              [selectedWin.dimensions[0] / 2, selectedWin.dimensions[1] / 2 + 0.15, selectedWin.dimensions[2] / 2 + 0.05],
            ]}
            label={`Width ${selectedWin.dimensions[0].toFixed(2)} m`}
            position={[0, selectedWin.dimensions[1] / 2 + 0.28, selectedWin.dimensions[2] / 2 + 0.05]}
          />
          {/* Height Dimension along Side */}
          <Dimension
            points={[
              [selectedWin.dimensions[0] / 2 + 0.15, -selectedWin.dimensions[1] / 2, selectedWin.dimensions[2] / 2 + 0.05],
              [selectedWin.dimensions[0] / 2 + 0.15, selectedWin.dimensions[1] / 2, selectedWin.dimensions[2] / 2 + 0.05],
            ]}
            label={`Height ${selectedWin.dimensions[1].toFixed(2)} m`}
            position={[selectedWin.dimensions[0] / 2 + 0.28, 0, selectedWin.dimensions[2] / 2 + 0.05]}
          />
          {/* Sill Height Dimension down to floor */}
          <Dimension
            points={[
              [-selectedWin.dimensions[0] / 2 - 0.15, -selectedWin.dimensions[1] / 2, selectedWin.dimensions[2] / 2 + 0.05],
              [-selectedWin.dimensions[0] / 2 - 0.15, -selectedWin.worldPosition[1], selectedWin.dimensions[2] / 2 + 0.05],
            ]}
            label={`Sill ${(selectedWin.original as any).sillHeight?.toFixed(2) || "0.90"} m`}
            position={[-selectedWin.dimensions[0] / 2 - 0.32, -selectedWin.worldPosition[1] / 2, selectedWin.dimensions[2] / 2 + 0.05]}
          />
        </group>
      )}

      {/* Selected Door Precise Dimension Lines */}
      {selectedDoor && (
        <group position={selectedDoor.worldPosition} rotation={selectedDoor.rotation}>
          {/* Width Dimension */}
          <Dimension
            points={[
              [-selectedDoor.dimensions[0] / 2, selectedDoor.dimensions[1] / 2 + 0.15, selectedDoor.dimensions[2] / 2 + 0.05],
              [selectedDoor.dimensions[0] / 2, selectedDoor.dimensions[1] / 2 + 0.15, selectedDoor.dimensions[2] / 2 + 0.05],
            ]}
            label={`Width ${selectedDoor.dimensions[0].toFixed(2)} m`}
            position={[0, selectedDoor.dimensions[1] / 2 + 0.28, selectedDoor.dimensions[2] / 2 + 0.05]}
          />
          {/* Clear Height Dimension */}
          <Dimension
            points={[
              [selectedDoor.dimensions[0] / 2 + 0.15, -selectedDoor.dimensions[1] / 2, selectedDoor.dimensions[2] / 2 + 0.05],
              [selectedDoor.dimensions[0] / 2 + 0.15, selectedDoor.dimensions[1] / 2, selectedDoor.dimensions[2] / 2 + 0.05],
            ]}
            label={`Height ${selectedDoor.dimensions[1].toFixed(2)} m`}
            position={[selectedDoor.dimensions[0] / 2 + 0.32, 0, selectedDoor.dimensions[2] / 2 + 0.05]}
          />
        </group>
      )}
    </group>
  );
}

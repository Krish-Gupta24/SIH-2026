export type WallOrientation = "north" | "south" | "east" | "west";
export type VisualizationMode = "model" | "thermal" | "solar" | "heat-flow";
export type CameraPreset = "iso" | "top" | "south" | "north" | "east" | "west";

export type SelectedElement =
  | { type: "shelter" }
  | { type: "wall"; orientation: WallOrientation }
  | { type: "roof" }
  | { type: "floor" }
  | { type: "window"; id: string }
  | { type: "door"; id: string }
  | { type: "thermalMass"; id: string }
  | null;

export interface ViewerSettings {
  showGrid: boolean;
  showDimensions: boolean;
  showCompass: boolean;
  showSunShadows: boolean;
  showEnvironment: boolean;
  explodedView: boolean;
  wireframe: boolean;
  transparentWalls: boolean;
  revealLayers: boolean;
  visualization: VisualizationMode;
}

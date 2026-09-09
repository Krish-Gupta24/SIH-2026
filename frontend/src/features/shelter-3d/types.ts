export type SelectedElementType = "wall" | "roof" | "floor" | "window" | "door";

export type SelectedElement =
  | { type: "wall"; orientation: "north" | "south" | "east" | "west" }
  | { type: "roof" }
  | { type: "floor" }
  | { type: "window"; id: string }
  | { type: "door"; id: string }
  | null;

export type CameraPreset = "iso" | "top" | "south" | "north" | "east" | "west";

export interface ViewerSettings {
  showGrid: boolean;
  showDimensions: boolean;
  showCompass: boolean;
  showSunShadows: boolean;
  wireframe: boolean;
  transparentWalls: boolean;
}

/**
 * Shelter Editor Feature Module
 * Responsible for 3D viewport (Three.js / React Three Fiber),
 * geometric transformation gizmos, dimension inputs, and orientation azimuth controls.
 */

export interface ShelterEditorState {
  selectedSurfaceId: string | null;
  cameraMode: "perspective" | "orthographic";
  wireframe: boolean;
  sunPositionVisible: boolean;
}

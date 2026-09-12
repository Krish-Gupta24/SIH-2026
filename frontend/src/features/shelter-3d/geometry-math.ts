import { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";

export interface Wall3DGeometry {
  id: "north" | "south" | "east" | "west";
  name: string;
  position: [number, number, number]; // [x, y, z] center of wall
  rotation: [number, number, number]; // [rx, ry, rz] Euler angles in radians
  dimensions: [number, number, number]; // [width, height, thickness]
  area: number;
  normal: [number, number, number];
}

export interface Roof3DGeometry {
  type: "Flat" | "Shed" | "Gable";
  center: [number, number, number];
  dimensions: [number, number, number]; // [width, depth, thickness]
  slopeDeg: number;
  rotation: [number, number, number];
  area: number;
  peakHeight: number;
}

export interface Floor3DGeometry {
  center: [number, number, number];
  dimensions: [number, number, number]; // [length, thickness, width]
  area: number;
}

export interface Opening3DPlacement {
  id: string;
  type: "window" | "door";
  wall: "north" | "south" | "east" | "west";
  worldPosition: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number]; // [width, height, depth]
  area: number;
  original: WindowModel | DoorModel;
  localWallPosition: [number, number]; // [x, y] relative to host wall center
  exteriorPosition: [number, number, number];
  normal: [number, number, number];
  wallThickness: number;
}

export interface Shelter3DRepresentation {
  floor: Floor3DGeometry;
  walls: Record<"north" | "south" | "east" | "west", Wall3DGeometry>;
  roof: Roof3DGeometry;
  windows: Opening3DPlacement[];
  doors: Opening3DPlacement[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    dimensions: [number, number, number];
  };
  totalEnvelopeArea: number;
  volume: number;
}

/**
 * Derives exact 3D spatial coordinates and geometry from canonical ShelterModel.
 * Coordinate conventions (Three.js standard):
 * - X: Width along East-West axis
 * - Y: Height (UP)
 * - Z: Depth along North-South axis
 * - Shelter center footprint is at (0, 0, 0)
 */
export function deriveShelter3DGeometry(model: ShelterModel): Shelter3DRepresentation {
  const L = model.geometry.length;
  const W = model.geometry.width;
  const H = model.geometry.height;
  const wallAssemblies = Object.values(model.envelope.walls);
  const wallThickness = Math.max(
    0.15,
    wallAssemblies.reduce(
      (sum, assembly) => sum + assembly.layers.reduce((total, layer) => total + layer.thickness, 0),
      0,
    ) / wallAssemblies.length,
  );
  const floorThickness = Math.max(
    0.15,
    model.envelope.floor.layers.reduce((sum, layer) => sum + layer.thickness, 0),
  );
  const roofThickness = Math.max(
    0.12,
    model.envelope.roof.layers.reduce((sum, layer) => sum + layer.thickness, 0),
  );
  const roofAngle = model.geometry.roofAngle || 0;
  const roofType = model.geometry.roofType || "Flat";

  const halfL = L / 2;
  const halfW = W / 2;
  const halfH = H / 2;

  // 1. Floor Slab (centered under the walls at grade)
  const floor: Floor3DGeometry = {
    center: [0, -floorThickness / 2, 0],
    dimensions: [L + wallThickness * 2, floorThickness, W + wallThickness * 2],
    area: L * W,
  };

  // 2. Four Walls
  // South Wall: faces +Z (towards South), spans along X
  const southWall: Wall3DGeometry = {
    id: "south",
    name: model.envelope.walls.south.name || "South Wall",
    position: [0, halfH, halfW + wallThickness / 2],
    rotation: [0, 0, 0],
    dimensions: [L, H, wallThickness],
    area: L * H,
    normal: [0, 0, 1],
  };

  // North Wall: faces -Z (towards North), spans along X
  const northWall: Wall3DGeometry = {
    id: "north",
    name: model.envelope.walls.north.name || "North Wall",
    position: [0, halfH, -(halfW + wallThickness / 2)],
    rotation: [0, Math.PI, 0],
    dimensions: [L, H, wallThickness],
    area: L * H,
    normal: [0, 0, -1],
  };

  // East Wall: faces +X (towards East), spans along Z
  const eastWall: Wall3DGeometry = {
    id: "east",
    name: model.envelope.walls.east.name || "East Wall",
    position: [halfL + wallThickness / 2, halfH, 0],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [W, H, wallThickness],
    area: W * H,
    normal: [1, 0, 0],
  };

  // West Wall: faces -X (towards West), spans along Z
  const westWall: Wall3DGeometry = {
    id: "west",
    name: model.envelope.walls.west.name || "West Wall",
    position: [-(halfL + wallThickness / 2), halfH, 0],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [W, H, wallThickness],
    area: W * H,
    normal: [-1, 0, 0],
  };

  const walls = { north: northWall, south: southWall, east: eastWall, west: westWall };

  // 3. Roof Geometry
  const rad = (roofAngle * Math.PI) / 180;
  let roofCenterY = H + roofThickness / 2;
  let peakHeight = H;
  let roofRotX = 0;
  let roofArea = L * W;

  if (roofType === "Shed" && roofAngle > 0) {
    const deltaH = W * Math.tan(rad);
    roofCenterY = H + deltaH / 2;
    peakHeight = H + deltaH;
    roofRotX = rad;
    roofArea = L * (W / Math.cos(rad));
  } else if (roofType === "Gable" && roofAngle > 0) {
    const deltaH = 0.5 * W * Math.tan(rad);
    roofCenterY = H + deltaH / 2;
    peakHeight = H + deltaH;
    roofArea = 2 * (L * ((0.5 * W) / Math.cos(rad)));
  }

  const overhang = model.envelope.roof.overhang || 0.4;
  const roof: Roof3DGeometry = {
    type: roofType,
    center: [0, roofCenterY, 0],
    dimensions: [L + overhang * 2, roofThickness, W + overhang * 2],
    slopeDeg: roofAngle,
    rotation: [roofRotX, 0, 0],
    area: roofArea,
    peakHeight,
  };

  // Assembly depth spans through the host wall thickness with a 4cm outer/inner architectural protrusion
  const windowDepth = wallThickness + 0.06;
  const doorDepth = wallThickness + 0.08;

  // 4. Windows Placement on Host Walls
  const windows3D: Opening3DPlacement[] = (model.windows || []).map((win) => {
    const winW = win.width;
    const winH = win.height;
    const sill = win.sillHeight;
    const posY = sill + winH / 2;
    const localY = -halfH + posY;
    let localX = 0;
    let posX = 0;
    let posZ = 0;
    let extX = 0;
    let extZ = 0;
    let rotY = 0;
    let normal: [number, number, number] = [0, 0, 1];

    if (win.wall === "south") {
      localX = -halfL + win.positionX + winW / 2;
      posX = localX;
      posZ = halfW + wallThickness / 2;
      extX = posX;
      extZ = halfW + wallThickness;
      rotY = 0;
      normal = [0, 0, 1];
    } else if (win.wall === "north") {
      localX = -halfL + win.positionX + winW / 2;
      posX = halfL - (win.positionX + winW / 2);
      posZ = -(halfW + wallThickness / 2);
      extX = posX;
      extZ = -(halfW + wallThickness);
      rotY = Math.PI;
      normal = [0, 0, -1];
    } else if (win.wall === "east") {
      localX = -halfW + win.positionX + winW / 2;
      posX = halfL + wallThickness / 2;
      posZ = halfW - (win.positionX + winW / 2);
      extX = halfL + wallThickness;
      extZ = posZ;
      rotY = Math.PI / 2;
      normal = [1, 0, 0];
    } else if (win.wall === "west") {
      localX = -halfW + win.positionX + winW / 2;
      posX = -(halfL + wallThickness / 2);
      posZ = -halfW + win.positionX + winW / 2;
      extX = -(halfL + wallThickness);
      extZ = posZ;
      rotY = -Math.PI / 2;
      normal = [-1, 0, 0];
    }

    return {
      id: win.id,
      type: "window",
      wall: win.wall,
      worldPosition: [posX, posY, posZ],
      exteriorPosition: [extX, posY, extZ],
      localWallPosition: [localX, localY],
      rotation: [0, rotY, 0],
      dimensions: [winW, winH, windowDepth],
      area: winW * winH,
      original: win,
      normal,
      wallThickness,
    };
  });

  // 5. Doors Placement on Host Walls
  const doors3D: Opening3DPlacement[] = (model.doors || []).map((door) => {
    const doorW = door.width;
    const doorH = door.height;
    const posY = doorH / 2;
    const localY = -halfH + posY;
    let localX = 0;
    let posX = 0;
    let posZ = 0;
    let extX = 0;
    let extZ = 0;
    let rotY = 0;
    let normal: [number, number, number] = [0, 0, 1];

    if (door.wall === "south") {
      localX = -halfL + door.positionX + doorW / 2;
      posX = localX;
      posZ = halfW + wallThickness / 2;
      extX = posX;
      extZ = halfW + wallThickness;
      rotY = 0;
      normal = [0, 0, 1];
    } else if (door.wall === "north") {
      localX = -halfL + door.positionX + doorW / 2;
      posX = halfL - (door.positionX + doorW / 2);
      posZ = -(halfW + wallThickness / 2);
      extX = posX;
      extZ = -(halfW + wallThickness);
      rotY = Math.PI;
      normal = [0, 0, -1];
    } else if (door.wall === "east") {
      localX = -halfW + door.positionX + doorW / 2;
      posX = halfL + wallThickness / 2;
      posZ = halfW - (door.positionX + doorW / 2);
      extX = halfL + wallThickness;
      extZ = posZ;
      rotY = Math.PI / 2;
      normal = [1, 0, 0];
    } else if (door.wall === "west") {
      localX = -halfW + door.positionX + doorW / 2;
      posX = -(halfL + wallThickness / 2);
      posZ = -halfW + door.positionX + doorW / 2;
      extX = -(halfL + wallThickness);
      extZ = posZ;
      rotY = -Math.PI / 2;
      normal = [-1, 0, 0];
    }

    return {
      id: door.id,
      type: "door",
      wall: door.wall,
      worldPosition: [posX, posY, posZ],
      exteriorPosition: [extX, posY, extZ],
      localWallPosition: [localX, localY],
      rotation: [0, rotY, 0],
      dimensions: [doorW, doorH, doorDepth],
      area: doorW * doorH,
      original: door,
      normal,
      wallThickness,
    };
  });

  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const totalArea = L * W + roofArea + totalWallArea;
  const volume = L * W * H;

  return {
    floor,
    walls,
    roof,
    windows: windows3D,
    doors: doors3D,
    boundingBox: {
      min: [-halfL - overhang, -floorThickness, -halfW - overhang],
      max: [halfL + overhang, peakHeight + roofThickness, halfW + overhang],
      dimensions: [L + overhang * 2, peakHeight + roofThickness + floorThickness, W + overhang * 2],
    },
    totalEnvelopeArea: totalArea,
    volume,
  };
}

/**
 * Calculates a clean, non-overlapping position along a host wall for a new window or door.
 */
export function findNextAvailableOpeningPosition(
  wallLength: number,
  existingOpenings: { positionX: number; width: number }[],
  newWidth: number,
  margin = 0.35
): number {
  if (existingOpenings.length === 0) {
    return Number(Math.max(margin, (wallLength - newWidth) / 2).toFixed(2));
  }

  // Sort existing openings from left to right along the wall
  const sorted = [...existingOpenings].sort((a, b) => a.positionX - b.positionX);

  // 1. Check gap before first opening
  if (sorted[0].positionX >= margin + newWidth + margin) {
    const candidate = margin + (sorted[0].positionX - margin - newWidth) / 2;
    return Number(candidate.toFixed(2));
  }

  // 2. Check gaps between adjacent openings
  for (let i = 0; i < sorted.length - 1; i++) {
    const endA = sorted[i].positionX + sorted[i].width;
    const startB = sorted[i + 1].positionX;
    const gap = startB - endA;
    if (gap >= newWidth + margin * 2) {
      const candidate = endA + (gap - newWidth) / 2;
      return Number(candidate.toFixed(2));
    }
  }

  // 3. Check gap after last opening
  const lastEnd = sorted[sorted.length - 1].positionX + sorted[sorted.length - 1].width;
  if (wallLength - lastEnd >= newWidth + margin) {
    const candidate = lastEnd + margin;
    return Number(candidate.toFixed(2));
  }

  // Fallback: place in largest available slot clamped within wall boundary
  return Number(Math.max(margin, Math.min(wallLength - newWidth - margin, lastEnd + 0.2)).toFixed(2));
}

/**
 * Validates and clamps opening coordinates to ensure it stays strictly within the host wall boundaries.
 */
export function clampOpeningPlacement(
  wallLength: number,
  wallHeight: number,
  positionX: number,
  width: number,
  sillHeight: number,
  height: number,
  isDoor: boolean
): { positionX: number; width: number; sillHeight: number; height: number } {
  const safeMargin = 0.2;
  const clampedWidth = Math.max(0.4, Math.min(wallLength - safeMargin * 2, width));
  const clampedPositionX = Math.max(
    safeMargin,
    Math.min(wallLength - clampedWidth - safeMargin, positionX)
  );

  if (isDoor) {
    const clampedHeight = Math.max(1.6, Math.min(wallHeight - safeMargin, height));
    return {
      positionX: Number(clampedPositionX.toFixed(2)),
      width: Number(clampedWidth.toFixed(2)),
      sillHeight: 0,
      height: Number(clampedHeight.toFixed(2)),
    };
  }

  const clampedHeight = Math.max(0.4, Math.min(wallHeight - 0.5, height));
  const clampedSill = Math.max(
    0.2,
    Math.min(wallHeight - clampedHeight - safeMargin, sillHeight)
  );

  return {
    positionX: Number(clampedPositionX.toFixed(2)),
    width: Number(clampedWidth.toFixed(2)),
    sillHeight: Number(clampedSill.toFixed(2)),
    height: Number(clampedHeight.toFixed(2)),
  };
}


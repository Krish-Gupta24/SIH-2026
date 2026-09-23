import * as THREE from "three";

function noise(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

export type LandscapeKind = "ladakh" | "desert" | "plains";

export function createLandscapeGroundTexture(kind: LandscapeKind): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const palette: Record<LandscapeKind, { base: string; fleck: [number, number, number]; accent: [number, number, number] }> = {
    ladakh: { base: "#a59a84", fleck: [92, 83, 67], accent: [197, 186, 158] },
    desert: { base: "#c8a36d", fleck: [157, 116, 68], accent: [232, 201, 143] },
    plains: { base: "#81956e", fleck: [71, 96, 61], accent: [158, 178, 124] },
  };
  const colors = palette[kind];
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    for (let x = 0; x < size; x += 3) {
      const n = noise(x * 0.17, y * 0.17, kind.length);
      const color = n > 0.57 ? colors.accent : colors.fleck;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.08 + n * 0.2})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  if (kind === "desert") {
    ctx.strokeStyle = "rgba(130, 91, 50, 0.16)";
    ctx.lineWidth = 5;
    for (let y = 40; y < size; y += 75) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(120, y - 22, 310, y + 24, size, y - 7);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = 4;
  return texture;
}

export function createLadakhGroundTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#b8c4bc";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 140 + Math.floor(Math.random() * 40);
    ctx.fillStyle = `rgba(${g - 20}, ${g}, ${g - 15}, ${0.15 + Math.random() * 0.25})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(220, 228, 235, 0.35)");
    grad.addColorStop(1, "rgba(220, 228, 235, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 4;
  return tex;
}

export function createMudPlasterWallTexture(
  variant: "south" | "north" | "east" | "west"
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base: Record<typeof variant, string> = {
    south: "#d4cbb8",
    north: "#c8c2b4",
    east: "#cfc7b8",
    west: "#c5bfb0",
  };
  ctx.fillStyle = base[variant];
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const n = noise(x * 0.08, y * 0.08, variant.length);
      const shade = Math.floor(n * 28);
      ctx.fillStyle = `rgba(${180 + shade}, ${170 + shade}, ${150 + shade}, 0.35)`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  ctx.strokeStyle = "rgba(90, 80, 70, 0.08)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 6; row++) {
    const y = 18 + row * 42 + (variant === "south" ? 0 : row * 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  if (variant === "south") {
    ctx.fillStyle = "rgba(180, 140, 90, 0.12)";
    ctx.fillRect(0, 80, 256, 96);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.2, 1.8);
  return tex;
}

export function createStoneFoundationTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#4a5560";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 48; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 20 + Math.random() * 40;
    const h = 12 + Math.random() * 24;
    ctx.fillStyle = `rgba(${70 + Math.random() * 40}, ${75 + Math.random() * 35}, ${85 + Math.random() * 30}, 0.85)`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(20, 24, 28, 0.35)";
    ctx.strokeRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createMetalRoofTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  for (let i = 0; i < 16; i++) {
    const y = i * 4;
    const g = 45 + (i % 2) * 12;
    ctx.fillStyle = `rgb(${g}, ${g + 5}, ${g + 10})`;
    ctx.fillRect(0, y, 256, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

export function materialAppearance(materialId: string, materialName = "") {
  const key = `${materialId} ${materialName}`.toLowerCase();
  if (key.includes("steel") || key.includes("metal")) return { color: "#69747c", roughness: 0.32, metalness: 0.78, texture: "metal" as const };
  if (key.includes("timber") || key.includes("wood") || key.includes("pine")) return { color: "#9a6c43", roughness: 0.72, metalness: 0.02, texture: "timber" as const };
  if (key.includes("stone") || key.includes("concrete") || key.includes("masonry")) return { color: "#63717a", roughness: 0.92, metalness: 0, texture: "stone" as const };
  if (key.includes("earth") || key.includes("rammed") || key.includes("mud")) return { color: "#a88968", roughness: 0.9, metalness: 0, texture: "earth" as const };
  if (key.includes("aerogel")) return { color: "#b9dbe5", roughness: 0.5, metalness: 0.03, texture: "insulation" as const };
  if (key.includes("eps") || key.includes("xps") || key.includes("insulation")) return { color: "#c7d7df", roughness: 0.82, metalness: 0, texture: "insulation" as const };
  return { color: "#d4cbb8", roughness: 0.78, metalness: 0, texture: "earth" as const };
}

export function createMaterialTexture(materialId: string, materialName = ""): THREE.CanvasTexture | null {
  const appearance = materialAppearance(materialId, materialName);
  if (appearance.texture === "metal") return createMetalRoofTexture();
  if (appearance.texture === "stone") return createStoneFoundationTexture();
  if (appearance.texture === "earth") return createMudPlasterWallTexture("south");
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = appearance.color;
  ctx.fillRect(0, 0, 256, 256);

  if (appearance.texture === "timber") {
    for (let y = 12; y < 256; y += 26) {
      ctx.fillStyle = "rgba(70, 42, 21, 0.28)";
      ctx.fillRect(0, y, 256, 2);
      ctx.fillStyle = "rgba(255, 224, 172, 0.18)";
      ctx.fillRect(0, y + 4, 256, 1);
    }
  } else {
    for (let y = 0; y < 256; y += 12) {
      for (let x = (y / 12) % 2 ? 6 : 0; x < 256; x += 12) {
        const alpha = 0.08 + noise(x, y, 4) * 0.14;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 7, 7);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

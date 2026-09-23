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
    // Sinusoidal sand ripple lines — more realistic wind-blown erg dune pattern
    ctx.strokeStyle = "rgba(130, 91, 50, 0.18)";
    ctx.lineWidth = 4;
    for (let y = 35; y < size; y += 62) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < size; x += 4) {
        const dy = Math.sin(x * 0.045) * 14 + Math.sin(x * 0.019) * 8;
        ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }
    // Cross-shadow lines between ridges
    ctx.strokeStyle = "rgba(100, 65, 30, 0.08)";
    ctx.lineWidth = 2;
    for (let y = 66; y < size; y += 62) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < size; x += 4) {
        const dy = Math.sin(x * 0.045 + 1.5) * 14 + Math.sin(x * 0.019 + 0.8) * 8;
        ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }
  }

  if (kind === "ladakh") {
    // Rocky ground — small angular stones scattered
    for (let i = 0; i < 180; i++) {
      const x = noise(i * 3.7, i * 1.2, 5) * size;
      const y = noise(i * 1.8, i * 4.1, 7) * size;
      const r = 2 + noise(i, i * 0.3, 2) * 8;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r * 0.65, noise(i, i, 0) * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60, 50, 40, ${0.08 + noise(i, i * 2, 1) * 0.14})`;
      ctx.fill();
    }
  }

  if (kind === "plains") {
    // Subtle grass blade clusters
    ctx.strokeStyle = "rgba(50, 80, 40, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 300; i++) {
      const x = noise(i * 2.3, i * 0.7, 3) * size;
      const y = noise(i * 0.9, i * 3.1, 6) * size;
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + (noise(i, i, 0) - 0.5) * 3, y - 5);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = 4;
  return texture;
}

export function createSnowLandscapeGroundTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Crisp high-albedo winter snow base with subtle glacial ice-blue undertone
  ctx.fillStyle = "#f5f8fb";
  ctx.fillRect(0, 0, size, size);

  // Sub-surface ice crystal speckles & sparkles
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = 240 + Math.floor(Math.random() * 15);
    const alpha = 0.2 + Math.random() * 0.4;
    ctx.fillStyle = `rgba(${brightness}, ${brightness + 3}, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Wind-sculpted snow sastrugi (curved snow waves formed by cold mountain winds)
  ctx.strokeStyle = "rgba(195, 218, 235, 0.45)";
  ctx.lineWidth = 3.5;
  for (let y = 20; y < size; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 6) {
      const dy = Math.sin(x * 0.035) * 8 + Math.sin(x * 0.012) * 5;
      ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }

  // Soft powder snow drifts & depressions
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 28;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(224, 238, 248, 0.4)");
    grad.addColorStop(0.7, "rgba(235, 244, 252, 0.15)");
    grad.addColorStop(1, "rgba(245, 248, 251, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Occasional dark granite frost-covered gravel pebbles peeking through snow
  for (let i = 0; i < 45; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3;
    ctx.fillStyle = "rgba(65, 75, 85, 0.35)";
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

  // Rammed-earth horizontal lift lines (construction joint pattern)
  ctx.strokeStyle = "rgba(90, 80, 70, 0.12)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 6; row++) {
    const y = 18 + row * 42 + (variant === "south" ? 0 : row * 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // Fine vertical formwork tie-hole marks
  ctx.fillStyle = "rgba(80, 68, 58, 0.1)";
  for (let row = 0; row < 6; row++) {
    const y = 18 + row * 42;
    for (let col = 0; col < 5; col++) {
      const x = 30 + col * 50;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // Irregular stone blocks with mortar joint lines
  const rows = [0, 40, 82, 124, 168, 210, 256];
  for (let r = 0; r < rows.length - 1; r++) {
    const rowY = rows[r];
    const rowH = rows[r + 1] - rowY;
    const staggerOffset = r % 2 === 0 ? 0 : 28;
    // Stone fill
    const stoneWidths = [32, 48, 38, 44, 36, 58] as const;
    let x = -staggerOffset;
    let si = 0;
    while (x < 256) {
      const w = stoneWidths[si % stoneWidths.length];
      const g = 70 + Math.floor(noise(x * 0.12, rowY * 0.15, si) * 42);
      ctx.fillStyle = `rgb(${g}, ${g + 5}, ${g + 10})`;
      ctx.fillRect(x + 2, rowY + 2, w - 4, rowH - 4);
      x += w;
      si++;
    }
    // Horizontal mortar joint
    ctx.fillStyle = "rgba(28, 30, 35, 0.55)";
    ctx.fillRect(0, rowY, 256, 2);
  }
  // Vertical mortar lines — staggered
  for (let r = 0; r < rows.length - 1; r++) {
    const rowY = rows[r];
    const rowH = rows[r + 1] - rowY;
    const staggerOffset = r % 2 === 0 ? 0 : 28;
    const stoneWidths = [32, 48, 38, 44, 36, 58] as const;
    let x = -staggerOffset;
    let si = 0;
    while (x < 256) {
      ctx.fillStyle = "rgba(28, 30, 35, 0.4)";
      ctx.fillRect(x, rowY, 2, rowH);
      x += stoneWidths[si % stoneWidths.length];
      si++;
    }
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

  // Standing-seam corrugated metal — alternating dark/mid/light bands
  const bandH = 4;
  const bands = 16;
  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    const isPeak = i % 4 === 0;
    const isValley = i % 4 === 2;
    const g = isPeak ? 78 : isValley ? 34 : 52;
    ctx.fillStyle = `rgb(${g}, ${g + 5}, ${g + 10})`;
    ctx.fillRect(0, y, 256, bandH);
  }
  // Highlight line at peak
  ctx.strokeStyle = "rgba(200, 220, 240, 0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i < bands; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i * bandH + 1);
    ctx.lineTo(256, i * bandH + 1);
    ctx.stroke();
  }
  // Seam dots (fastener heads)
  ctx.fillStyle = "rgba(20, 22, 28, 0.5)";
  for (let x = 20; x < 256; x += 40) {
    ctx.beginPath();
    ctx.arc(x, 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

export function createInsulationTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // EPS/XPS board — stippled square grid pattern
  ctx.fillStyle = "#c7d7df";
  ctx.fillRect(0, 0, 256, 256);
  const gridSize = 14;
  ctx.strokeStyle = "rgba(80, 120, 145, 0.28)";
  ctx.lineWidth = 1;
  for (let y = 0; y < 256; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  for (let x = 0; x < 256; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  // Stipple dots at intersections
  ctx.fillStyle = "rgba(60, 100, 130, 0.18)";
  for (let y = 0; y < 256; y += gridSize) {
    for (let x = 0; x < 256; x += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createTimberTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#9a6c43";
  ctx.fillRect(0, 0, 256, 256);

  // Wood grain — curved bezier arcs following growth rings
  ctx.strokeStyle = "rgba(70, 42, 21, 0.32)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const cy = 20 + i * 20;
    ctx.beginPath();
    ctx.moveTo(0, cy + (noise(i, 0, 1) - 0.5) * 6);
    ctx.bezierCurveTo(64, cy + (noise(i, 1, 2) - 0.5) * 10, 192, cy + (noise(i, 2, 3) - 0.5) * 10, 256, cy + (noise(i, 3, 4) - 0.5) * 6);
    ctx.stroke();
  }
  // Fine highlight lines
  ctx.strokeStyle = "rgba(255, 200, 140, 0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const cy = 10 + i * 30;
    ctx.beginPath();
    ctx.moveTo(0, cy + 3);
    ctx.bezierCurveTo(80, cy + (noise(i, 0, 5) - 0.5) * 8 + 3, 180, cy + (noise(i, 1, 6) - 0.5) * 8 + 3, 256, cy + 3);
    ctx.stroke();
  }
  // Knot
  ctx.fillStyle = "rgba(50, 30, 15, 0.22)";
  ctx.beginPath();
  ctx.ellipse(150, 100, 12, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  return tex;
}

export function createMembraneTexture(kind: "weather" | "vapor"): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base color differs between weather barrier (dark blue-grey) and vapor barrier (magenta-tinted)
  ctx.fillStyle = kind === "vapor" ? "#5a3f60" : "#3f5360";
  ctx.fillRect(0, 0, 256, 256);

  // Cross-hatch pattern to distinguish the two membrane types
  const lineColor = kind === "vapor" ? "rgba(200, 160, 220, 0.25)" : "rgba(160, 200, 226, 0.22)";
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  const spacing = 18;
  // 45° diagonal lines
  for (let i = -256; i < 512; i += spacing) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 256); ctx.lineTo(i + 256, 0); ctx.stroke();
  }
  // Faint horizontal lines for weather barrier
  if (kind === "weather") {
    ctx.strokeStyle = "rgba(200, 220, 240, 0.12)";
    for (let y = 0; y < 256; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function materialAppearance(
  materialId: string,
  materialName = ""
): { color: string; roughness: number; metalness: number; texture: string } {
  const key = `${materialId} ${materialName}`.toLowerCase();
  if (key.includes("vapor") || key.includes("vapour")) return { color: "#7d4e8c", roughness: 0.42, metalness: 0.05, texture: "vapor-membrane" as const };
  if (key.includes("weather") || key.includes("membrane") || key.includes("air barrier")) return { color: "#3f5360", roughness: 0.48, metalness: 0.08, texture: "weather-membrane" as const };
  if (key.includes("frame")) return { color: "#755033", roughness: 0.72, metalness: 0.02, texture: "timber" as const };
  if (key.includes("steel") || key.includes("metal") || key.includes("galvanized")) return { color: "#69747c", roughness: 0.32, metalness: 0.78, texture: "metal" as const };
  if (key.includes("timber") || key.includes("wood") || key.includes("pine") || key.includes("deck")) return { color: "#9a6c43", roughness: 0.72, metalness: 0.02, texture: "timber" as const };
  if (key.includes("stone") || key.includes("concrete") || key.includes("masonry") || key.includes("brick")) return { color: "#63717a", roughness: 0.92, metalness: 0, texture: "stone" as const };
  if (key.includes("earth") || key.includes("rammed") || key.includes("mud") || key.includes("adobe")) return { color: "#a88968", roughness: 0.9, metalness: 0, texture: "earth" as const };
  if (key.includes("aerogel")) return { color: "#b9dbe5", roughness: 0.5, metalness: 0.03, texture: "insulation" as const };
  if (key.includes("eps") || key.includes("xps") || key.includes("pir") || key.includes("insulation")) return { color: "#c7d7df", roughness: 0.82, metalness: 0, texture: "insulation" as const };
  if (key.includes("pcm") || key.includes("phase change")) return { color: "#9ecfd8", roughness: 0.55, metalness: 0.04, texture: "insulation" as const };
  return { color: "#d4cbb8", roughness: 0.78, metalness: 0, texture: "earth" as const };
}

export function createMaterialTexture(materialId: string, materialName = ""): THREE.CanvasTexture | null {
  const appearance = materialAppearance(materialId, materialName);
  if (appearance.texture === "metal") return createMetalRoofTexture();
  if (appearance.texture === "stone") return createStoneFoundationTexture();
  if (appearance.texture === "earth") return createMudPlasterWallTexture("south");
  if (appearance.texture === "timber") return createTimberTexture();
  if (appearance.texture === "insulation") return createInsulationTexture();
  if (appearance.texture === "weather-membrane") return createMembraneTexture("weather");
  if (appearance.texture === "vapor-membrane") return createMembraneTexture("vapor");
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = appearance.color;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createSolarPanelTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const width = 512;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Deep anti-reflective solar glass background in rich cobalt/sapphire blue
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#081b3d");
  grad.addColorStop(0.5, "#0f2f6a");
  grad.addColorStop(1, "#174394");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 6 columns x 10 rows of silicon wafer cells
  const cols = 6;
  const rows = 10;
  const margin = 12;
  const cellGap = 4;
  const cellW = (width - margin * 2 - cellGap * (cols - 1)) / cols;
  const cellH = (height - margin * 2 - cellGap * (rows - 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = margin + c * (cellW + cellGap);
      const cy = margin + r * (cellH + cellGap);

      // Wafer cell background in vivid crystalline silicon blue (anti-reflective SiN coating)
      const cellGrad = ctx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
      cellGrad.addColorStop(0, "#194586");
      cellGrad.addColorStop(1, "#1e529e");
      ctx.fillStyle = cellGrad;

      ctx.beginPath();
      const cut = 5;
      ctx.moveTo(cx + cut, cy);
      ctx.lineTo(cx + cellW - cut, cy);
      ctx.lineTo(cx + cellW, cy + cut);
      ctx.lineTo(cx + cellW, cy + cellH - cut);
      ctx.lineTo(cx + cellW - cut, cy + cellH);
      ctx.lineTo(cx + cut, cy + cellH);
      ctx.lineTo(cx, cy + cellH - cut);
      ctx.lineTo(cx, cy + cut);
      ctx.closePath();
      ctx.fill();

      // Micro finger grid lines in crystalline silver-cyan
      ctx.strokeStyle = "rgba(186, 230, 253, 0.35)";
      ctx.lineWidth = 0.8;
      for (let y = cy + 4; y < cy + cellH - 2; y += 4.5) {
        ctx.beginPath();
        ctx.moveTo(cx + 2, y);
        ctx.lineTo(cx + cellW - 2, y);
        ctx.stroke();
      }

      // 3 vertical silver busbars through cell
      ctx.strokeStyle = "rgba(240, 249, 255, 0.88)";
      ctx.lineWidth = 1.4;
      for (let b = 1; b <= 3; b++) {
        const bx = cx + (cellW / 4) * b;
        ctx.beginPath();
        ctx.moveTo(bx, cy);
        ctx.lineTo(bx, cy + cellH);
        ctx.stroke();
      }
    }
  }

  // Subtle diagonal glass glare reflection across the entire PV module
  const glareGrad = ctx.createLinearGradient(0, 0, width, height);
  glareGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  glareGrad.addColorStop(0.35, "rgba(56, 189, 248, 0.12)");
  glareGrad.addColorStop(0.48, "rgba(255, 255, 255, 0.18)");
  glareGrad.addColorStop(0.6, "rgba(56, 189, 248, 0.06)");
  glareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glareGrad;
  ctx.fillRect(0, 0, width, height);

  // Aluminum frame outer rim
  ctx.strokeStyle = "rgba(203, 213, 225, 0.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

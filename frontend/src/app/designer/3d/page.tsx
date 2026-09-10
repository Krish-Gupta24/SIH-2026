"use client";

import dynamic from "next/dynamic";
import { Box, Loader2 } from "lucide-react";

// Dynamically import the 3D designer with SSR disabled for WebGL canvas compatibility
const Shelter3DDesigner = dynamic(
  () => import("@/features/shelter-3d/Shelter3DDesigner").then((mod) => mod.Shelter3DDesigner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-slate-950 text-slate-400">
        <div className="relative">
          <Box className="h-12 w-12 text-sky-500 animate-pulse" />
          <Loader2 className="absolute -bottom-2 -right-2 h-5 w-5 text-sky-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Initializing Three.js WebGL Engine...</p>
          <p className="text-xs text-slate-500">Loading parametric 3D shelter geometry & shaders</p>
        </div>
      </div>
    ),
  }
);

export default function Shelter3DPage() {
  return <Shelter3DDesigner />;
}

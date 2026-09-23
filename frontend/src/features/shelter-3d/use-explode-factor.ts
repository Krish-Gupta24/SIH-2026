"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";

/** Smooth 0–1 explode animation for assembly views. */
export function useExplodeFactor(active: boolean): number {
  const factor = useRef(0);
  const [renderFactor, setRenderFactor] = useState(0);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    const speed = 2.8;
    if (Math.abs(factor.current - target) < 0.002) {
      if (factor.current !== target) {
        factor.current = target;
        setRenderFactor(target);
        invalidate();
      }
      return;
    }
    factor.current += (target - factor.current) * Math.min(1, delta * speed);
    setRenderFactor(factor.current);
    invalidate();
  });

  return renderFactor;
}

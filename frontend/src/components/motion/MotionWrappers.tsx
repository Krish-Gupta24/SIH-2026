"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, HTMLMotionProps, type Transition } from "framer-motion";

// Spring transition presets for snappy, Apple/Linear-grade motion
export const springs = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  bouncy: { type: "spring", stiffness: 350, damping: 20 },
  gentle: { type: "spring", stiffness: 220, damping: 24 },
  smooth: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
} as const satisfies Record<string, Transition>;

// 1. Page / View Entrance Wrapper
export function PageMotionWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 2. Interactive Card with subtle 3D lift & border glow
export function MotionCard({
  children,
  className = "",
  onClick,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={`transition-shadow hover:shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
}

// 3. Stagger Container for Grids, Lists, Metric Cards
export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 4. Stagger Item child
export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 5. Tactile Micro-Button
export function TactileButton({
  children,
  className = "",
  onClick,
  disabled = false,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <motion.button
      type={type}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// 6. Animated Counter (Animates numbers smoothly from 0 to value)
export function AnimatedCounter({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// 7. Pulse Beacon (Living Radar Dot for Active Simulation, Telemetry, and Defense status)
export function PulseBeacon({
  color = "emerald",
  size = "md",
}: {
  color?: "emerald" | "amber" | "sky" | "rose" | "indigo";
  size?: "sm" | "md" | "lg";
}) {
  const colorMap = {
    emerald: {
      ping: "bg-emerald-400",
      dot: "bg-emerald-500",
    },
    amber: {
      ping: "bg-amber-400",
      dot: "bg-amber-500",
    },
    sky: {
      ping: "bg-sky-400",
      dot: "bg-sky-500",
    },
    rose: {
      ping: "bg-rose-400",
      dot: "bg-rose-500",
    },
    indigo: {
      ping: "bg-indigo-400",
      dot: "bg-indigo-500",
    },
  };

  const sizeMap = {
    sm: "size-1.5",
    md: "size-2",
    lg: "size-2.5",
  };

  const c = colorMap[color] || colorMap.emerald;
  const s = sizeMap[size] || sizeMap.md;

  return (
    <span className={`relative flex ${s} shrink-0`}>
      <motion.span
        animate={{ scale: [1, 2, 2.4], opacity: [0.75, 0.35, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        className={`absolute inline-flex h-full w-full rounded-full ${c.ping}`}
      />
      <span className={`relative inline-flex ${s} rounded-full ${c.dot}`} />
    </span>
  );
}

// 8. Confetti Trigger Helper (Celebrates simulation runs & energy optimization milestones)
export function triggerMilestoneCelebration() {
  if (typeof window === "undefined") return;
  import("canvas-confetti").then((confettiModule) => {
    const confetti = confettiModule.default;
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#10b981", "#38bdf8", "#fbbf24", "#6366f1"],
    });
  }).catch(() => {
    // Graceful fallback
  });
}

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onValueChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  label,
  className,
  ...props
}: SliderProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {label && (
        <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>{label}</span>
          <span className="font-mono text-blue-600 dark:text-blue-400">
            {value} {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 dark:bg-slate-700"
        {...props}
      />
    </div>
  );
}

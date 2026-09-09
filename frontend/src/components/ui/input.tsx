import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  unit?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, unit, ...props }, ref) => {
    if (unit) {
      return (
        <div className="relative flex items-center">
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 pr-14 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500",
              className
            )}
            ref={ref}
            {...props}
          />
          <span className="pointer-events-none absolute right-3 text-xs font-medium text-slate-400 dark:text-slate-500">
            {unit}
          </span>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

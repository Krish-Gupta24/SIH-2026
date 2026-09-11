import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 select-none",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-[#6E818F] shadow-sm",
        destructive: "bg-black text-white hover:bg-red-600 shadow-sm",
        outline: "border border-black/20 bg-white text-black hover:bg-[#CBDCE6]",
        secondary: "border border-black/20 bg-white text-black hover:bg-[#CBDCE6]",
        ghost: "hover:bg-black/5 text-[#6E818F] hover:text-black",
        link: "text-black underline-offset-4 hover:underline",
        accent: "bg-[#CBDCE6] text-black hover:bg-white shadow-sm",
        signal: "bg-[#CBDCE6] text-black hover:bg-white",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-sm",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "shine relative inline-flex items-center justify-center overflow-hidden rounded-lg text-sm font-semibold transition-all duration-300 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-white shadow-lg shadow-[hsl(var(--glow)/0.25)] hover:-translate-y-0.5 hover:shadow-glow",
        outline:
          "gradient-border bg-card/60 text-primary backdrop-blur hover:-translate-y-0.5 hover:bg-muted hover:shadow-md",
        ghost: "text-foreground/80 hover:-translate-y-0.5 hover:bg-muted",
        accent:
          "bg-gradient-to-br from-accent to-[hsl(var(--grad-via))] text-white shadow-lg shadow-[hsl(var(--glow)/0.25)] hover:-translate-y-0.5 hover:shadow-glow",
        destructive:
          "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

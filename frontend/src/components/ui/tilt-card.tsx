"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Maximum rotation in degrees applied at the edges. */
  max?: number;
  /** Adds a moving glare highlight that follows the cursor. */
  glare?: boolean;
};

/**
 * Decorative interactive 3D tilt wrapper.
 *
 * Tracks the cursor over the element and writes rotation into CSS custom
 * properties consumed by the `.tilt` utility (see globals.css). Purely visual:
 * it forwards all props/children unchanged and never alters behaviour.
 */
export function TiltCard({ className, children, max = 10, glare = true, style, ...props }: TiltCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<number>(0);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-y", `${(px - 0.5) * max * 2}deg`);
      node.style.setProperty("--tilt-x", `${(0.5 - py) * max * 2}deg`);
      node.style.setProperty("--glare-x", `${px * 100}%`);
      node.style.setProperty("--glare-y", `${py * 100}%`);
    });
  };

  const reset = () => {
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn("tilt group/tilt relative", className)}
      style={style}
      {...props}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{
            background:
              "radial-gradient(220px circle at var(--glare-x, 50%) var(--glare-y, 50%), hsl(0 0% 100% / 0.28), transparent 60%)",
          }}
        />
      )}
    </div>
  );
}

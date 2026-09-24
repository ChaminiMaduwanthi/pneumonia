import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[100px] w-full rounded-lg border border-border bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur transition-all duration-300 placeholder:text-slate-400 hover:border-accent/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };

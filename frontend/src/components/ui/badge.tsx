import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  const toneClass = {
    default: "bg-muted text-primary ring-border/60",
    success: "bg-emerald-100 text-emerald-700 ring-emerald-300/50 dark:bg-emerald-500/15 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 ring-amber-300/50 dark:bg-amber-500/15 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 ring-red-300/50 dark:bg-red-500/15 dark:text-red-300",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset backdrop-blur transition-transform duration-300 hover:scale-105",
        toneClass,
        className
      )}
      {...props}
    />
  );
}

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={`relative h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner ${className ?? ""}`}
    >
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] via-accent to-[hsl(var(--grad-via))] shadow-[0_0_12px_hsl(var(--glow)/0.6)] transition-all duration-500 ease-spring"
        style={{ width: `${clamped}%` }}
      >
        <span className="shine absolute inset-0 rounded-full" />
      </div>
    </div>
  );
}

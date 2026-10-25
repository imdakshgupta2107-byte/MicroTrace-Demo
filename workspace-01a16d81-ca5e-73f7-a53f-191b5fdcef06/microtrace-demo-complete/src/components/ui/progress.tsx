import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("h-1.5 rounded-full bg-slate-100 overflow-hidden", className)}>
      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${v * 100}%` }} />
    </div>
  );
}

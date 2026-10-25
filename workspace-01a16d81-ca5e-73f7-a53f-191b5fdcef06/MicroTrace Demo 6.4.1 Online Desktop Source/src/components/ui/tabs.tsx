// tabs — simple controlled tab strip.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ value, onChange, items, className }: {
  value: string; onChange: (v: string) => void;
  items: { id: string; label: ReactNode }[]; className?: string;
}) {
  return (
    <div className={cn("inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl bg-navy-50 p-1", className)}>
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => onChange(it.id)}
          className={cn("touch-button px-3 min-h-7 rounded-lg text-[12px] font-bold transition",
            value === it.id ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Switch({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("h-5 w-9 rounded-full transition relative",
          checked ? "bg-gold" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-0.5")} />
      </button>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
    </label>
  );
}

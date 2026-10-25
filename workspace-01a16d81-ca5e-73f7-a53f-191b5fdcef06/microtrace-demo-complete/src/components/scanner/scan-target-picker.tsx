// scan-target-picker — when a scan should go to a specific job (e.g. register a bottle).
import type { ReactNode } from "react";
import { ScanLine, Search, PackagePlus } from "lucide-react";

export type ScanTarget = "find" | "register";

export function ScanTargetPicker({ value, onChange }: { value: ScanTarget; onChange: (t: ScanTarget) => void }) {
  const opts: { id: ScanTarget; icon: ReactNode; label: string; hint: string }[] = [
    { id: "find", icon: <Search size={15} />, label: "Find a bottle", hint: "Look up which chemical this barcode belongs to" },
    { id: "register", icon: <PackagePlus size={15} />, label: "Register new bottle", hint: "Attach this pre-printed code to a new container" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`text-left rounded-xl border-2 p-3 transition ${value === o.id ? "border-gold bg-gold-100/50" : "border-slate-200 hover:border-slate-300"}`}>
          <span className="inline-flex items-center gap-1.5 font-bold text-[12.5px] text-ink"><ScanLine size={13} className="text-gold-600" />{o.icon}{o.label}</span>
          <div className="text-[10.5px] text-slate-500 mt-1 leading-snug">{o.hint}</div>
        </button>
      ))}
    </div>
  );
}

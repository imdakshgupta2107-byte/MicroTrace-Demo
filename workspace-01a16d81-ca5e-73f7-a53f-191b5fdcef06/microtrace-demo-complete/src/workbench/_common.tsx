// _common — shared bits for workbench tools (not part of the shipped spec count,
// keeps the 11 tool files lean).
import type { ReactNode } from "react";
import { sci } from "@/lib/calculations";
import { sup } from "./sup-src";

export function NumField({ label, value, onChange, step = "any", suffix, min }: {
  label: string; value: number | ""; onChange: (v: number | "") => void; step?: string; suffix?: string; min?: number;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[11.5px] font-bold text-slate-600">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" step={step} min={min} value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] bg-white" />
        {suffix && <span className="text-[12px] font-semibold text-slate-500 whitespace-nowrap">{suffix}</span>}
      </span>
    </label>
  );
}

export function SciResult({ label, value, sub }: { label: string; value: number | null; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4">
      <div className="text-[11px] font-extrabold tracking-wide text-navy-500 uppercase">{label}</div>
      {value === null || !Number.isFinite(value) ? (
        <div className="text-[13px] text-slate-400 mt-1">— fill the inputs —</div>
      ) : (
        <div className="text-xl font-extrabold text-ink mt-0.5" dangerouslySetInnerHTML={{ __html: sci(value) }} />
      )}
      {sub && <div className="text-[11.5px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export function ToolCard({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="font-extrabold text-[15px] text-ink">{title}</h3>
        <p className="text-[12px] text-slate-500 mt-0.5">{blurb}</p>
      </div>
      {children}
    </div>
  );
}

export { sup };

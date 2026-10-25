// command — search-input with matched dropdown (used by pickers).
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "./input";

export function Command<T extends { id: string; label: string; hint?: string }>({ items, placeholder, onPick, max = 8 }: {
  items: T[]; placeholder: string; onPick: (item: T) => void; max?: number;
}) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, max);
    return items.filter((it) => (it.label + " " + (it.hint ?? "")).toLowerCase().includes(s)).slice(0, max);
  }, [q, items, max]);
  return (
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-8" />
      {(q || matches.length > 0) && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {matches.length === 0 && <div className="px-3 py-2.5 text-[12px] text-slate-500">No matches.</div>}
          {matches.map((it) => (
            <button key={it.id} type="button" onClick={() => { onPick(it); setQ(""); }}
              className="w-full px-3 py-2 text-left hover:bg-gold-100/60">
              <div className="text-[12.5px] font-semibold text-ink">{it.label}</div>
              {it.hint && <div className="text-[11px] text-slate-500">{it.hint}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

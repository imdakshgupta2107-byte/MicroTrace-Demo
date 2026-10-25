// doubling-time — growth rate from two OD/CFU readings.
import { useState } from "react";
import { NumField, ToolCard } from "../_common";
import { fmtNum } from "@/lib/format";

export function DoublingTimeTool() {
  const [n0, setN0] = useState<number | "">("");
  const [nt, setNt] = useState<number | "">("");
  const [hrs, setHrs] = useState<number | "">("");
  const ready = n0 !== "" && nt !== "" && hrs !== "" && n0 > 0 && nt > n0 && hrs > 0;
  const gens = ready ? Math.log2((nt as number) / (n0 as number)) : null;
  const g = gens !== null ? (hrs as number) * 60 / gens : null;
  return (
    <ToolCard title="Doubling time" blurb="From a start and end reading (OD or CFU — any consistent unit).">
      <div className="grid grid-cols-3 gap-3">
        <NumField label="N₀ (start)" value={n0} onChange={setN0} />
        <NumField label="N (at time t)" value={nt} onChange={setNt} />
        <NumField label="Elapsed" value={hrs} onChange={setHrs} suffix="hours" />
      </div>
      {g !== null && (
        <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
          <b className="text-ink">{fmtNum(gens ?? 0, 2)}</b> generations · doubling time{" "}
          <b className="text-ink">{g >= 60 ? `${fmtNum(g / 60, 2)} h` : `${fmtNum(g, 1)} min`}</b>
          {g > 0 && g <= 30 && <div className="text-[11px] text-slate-500 mt-1">Very fast — typical of E. coli in rich medium. Sanity-check the readings.</div>}
        </div>
      )}
    </ToolCard>
  );
}

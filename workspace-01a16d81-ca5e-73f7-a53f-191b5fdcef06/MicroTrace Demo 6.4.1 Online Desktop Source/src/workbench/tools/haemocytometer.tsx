// haemocytometer — cells/mL from grid counts, plus trypan-blue viability.
import { useState } from "react";
import { cellsPerMl, viabilityPct } from "@/lib/calculations";
import { fmtNum } from "@/lib/format";
import { NumField, SciResult, ToolCard } from "../_common";

export function HaemocytometerTool() {
  const [count, setCount] = useState<number | "">("");
  const [squares, setSquares] = useState<number | "">(4);
  const [dil, setDil] = useState<number | "">(1);
  const [live, setLive] = useState<number | "">("");
  const [dead, setDead] = useState<number | "">("");
  const ready = count !== "" && squares !== "" && squares > 0 && dil !== "" && dil > 0;
  const ml = ready ? cellsPerMl(count, squares, dil) : null;
  const viab = live !== "" && dead !== "" && live + dead > 0 ? viabilityPct(live, dead) : null;
  return (
    <ToolCard title="Haemocytometer" blurb="Count cells on a 0.1 mm deep chamber (10⁴ factor built in).">
      <div className="grid grid-cols-3 gap-3">
        <NumField label="Total counted" value={count} onChange={setCount} step="1" />
        <NumField label="Squares used" value={squares} onChange={setSquares} step="1" />
        <NumField label="Dilution" value={dil} onChange={setDil} />
      </div>
      <SciResult label="Cells per mL" value={ml}
        sub={ml !== null ? `(${fmtNum(count as number)} / ${squares}) × 10⁴ × ${fmtNum(dil as number)}` : undefined} />
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Live (unstained)" value={live} onChange={setLive} step="1" />
        <NumField label="Dead (blue)" value={dead} onChange={setDead} step="1" />
      </div>
      {viab !== null && (
        <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
          Viability: <b className="text-ink">{fmtNum(viab, 1)}%</b>
          {ml !== null && <> · live density <b className="text-ink">{fmtNum(ml * viab / 100)}</b> cells/mL</>}
        </div>
      )}
    </ToolCard>
  );
}

// plate-mapper — 96-well plate: tap wells to assign samples; printable summary.
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

const ROWS = "ABCDEFGH".split("");
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);
const FILL_TINTS = ["gold", "green", "violet", "blue", "red"] as const;
const FILL_CSS: Record<string, string> = {
  gold: "bg-gold-100 border-gold-600 text-gold-700",
  green: "bg-green-100 border-green-600 text-green-800",
  violet: "bg-violet-100 border-violet-500 text-violet-800",
  blue: "bg-blue-100 border-blue-500 text-blue-800",
  red: "bg-red-100 border-red-500 text-red-800",
};

interface WellAssign { sample: string; tint: string; }

export function PlateMapperTool() {
  const [map, setMap] = useState<Record<string, WellAssign>>({});
  const [sample, setSample] = useState("Sample 1");
  const [tint, setTint] = useState<string>(FILL_TINTS[0]);
  const samples = useMemo(() => [...new Set(Object.values(map).map((w) => w.sample))], [map]);

  const toggle = (well: string) => {
    setMap((m) => {
      const next = { ...m };
      if (next[well]?.sample === sample && next[well]?.tint === tint) delete next[well];
      else next[well] = { sample: sample.trim() || "?", tint };
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-extrabold text-[15px] text-ink">96-well plate map</h3>
        <p className="text-[12px] text-slate-500">Tap wells to stamp the current sample; tap again to clear.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={sample} onChange={(e) => setSample(e.target.value)} className="w-44" placeholder="Sample name" />
        <Select value={tint} onChange={(e) => setTint(e.target.value)}>
          {FILL_TINTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Button variant="ghost" size="sm" onClick={() => setMap({})}><Trash2 size={13} /> Clear plate</Button>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: "auto repeat(12, minmax(0,1fr))" }}>
          <span />
          {COLS.map((c) => <span key={c} className="text-center text-[10px] font-bold text-slate-400">{c}</span>)}
          {ROWS.map((r) => (
            <Fragment key={r}>
              <span className="self-center text-[10px] font-bold text-slate-400 pr-1">{r}</span>
              {COLS.map((c) => {
                const well = `${r}${c}`;
                const a = map[well];
                return (
                  <button key={well} type="button" onClick={() => toggle(well)} aria-label={`well ${well}${a ? ` = ${a.sample}` : ""}`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 text-[8px] font-bold transition ${a ? FILL_CSS[a.tint] : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    {well}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {samples.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[11.5px]">
          {samples.map((s) => (
            <Badge key={s} tone="navy">{s}: {Object.values(map).filter((w) => w.sample === s).length} wells</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

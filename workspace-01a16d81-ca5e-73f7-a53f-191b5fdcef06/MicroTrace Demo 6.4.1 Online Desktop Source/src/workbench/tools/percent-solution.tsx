// percent-solution — dynamic % w/v, v/v and w/w preparation using SI-normalized totals.
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { QuantityInput } from "@/components/units/quantity-input";
import { UnitDropdown } from "@/components/units/unit-dropdown";
import { decimalInput, displayFromBase, isPositive, normalizedInput } from "@/lib/quantity";
import { findUnit } from "@/lib/units";
import { ToolCard } from "../_common";

export function PercentSolutionTool() {
  const [kind, setKind] = useState<"w/v" | "v/v" | "w/w">("w/v");
  const [percent, setPercent] = useState("1");
  const [total, setTotal] = useState("");
  const [totalUnit, setTotalUnit] = useState("mL");
  const [outputUnit, setOutputUnit] = useState("g");

  const percentValue = decimalInput(percent);
  const totalBase = normalizedInput(total, totalUnit);
  const isMass = kind === "w/w";
  const finalDimension = isMass ? "mass" : "volume" as const;
  const soluteDimension = kind === "v/v" ? "volume" : "mass" as const;
  const soluteBase = useMemo(() => {
    if (!isPositive(percentValue) || !isPositive(totalBase)) return null;
    if (kind === "w/v") return percentValue.div(100).mul(totalBase).mul(1000); // g per 100 mL, volume base is L.
    return percentValue.div(100).mul(totalBase);
  }, [kind, percentValue, totalBase]);
  const solventBase = soluteBase && totalBase ? totalBase.minus(soluteBase) : null;
  const outputSymbol = findUnit(outputUnit)?.symbol ?? (soluteDimension === "mass" ? "g" : "L");

  const switchKind = (next: typeof kind) => {
    setKind(next);
    setTotalUnit(next === "w/w" ? "g" : "mL");
    setOutputUnit(next === "v/v" ? "mL" : "g");
  };

  return (
    <ToolCard title="Percent solution" blurb="Prepare % w/v, v/v and w/w solutions with selectable scientific mass and volume units.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Type</span>
          <Select value={kind} onChange={(event) => switchKind(event.target.value as typeof kind)}>
            <option value="w/v">% w/v (mass per 100 mL final volume)</option>
            <option value="v/v">% v/v (volume per 100 final volume)</option>
            <option value="w/w">% w/w (mass per 100 final mass)</option>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Percent</span>
          <Input inputMode="decimal" type="text" value={percent} onChange={(event) => setPercent(event.target.value)} placeholder="e.g. 1" />
        </label>
        <QuantityInput id="percent-total" label={isMass ? "Final mass" : "Final volume"} value={total} onValueChange={setTotal}
          unitCode={totalUnit} onUnitChange={setTotalUnit} dimension={finalDimension} />
        <UnitDropdown id="percent-output" label="Show solute as" dimension={soluteDimension} value={outputUnit} onChange={setOutputUnit} />
      </div>
      {soluteBase && totalBase && <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
        Use <b className="text-ink">{displayFromBase(soluteBase, outputUnit)} {outputSymbol}</b> solute. {kind === "w/v" ? <>Then make up to <b>{displayFromBase(totalBase, totalUnit)} {findUnit(totalUnit)?.symbol}</b> with solvent.</> : kind === "v/v" ? <>Top up with solvent to <b>{displayFromBase(totalBase, totalUnit)} {findUnit(totalUnit)?.symbol}</b>.</> : <>Add <b>{displayFromBase(solventBase!, totalUnit)} {findUnit(totalUnit)?.symbol}</b> solvent by mass.</>}
        <div className="mt-1 text-[11px] text-slate-500">The percentage relationship is calculated against canonical L or g values; the selected units only control entry and display.</div>
      </div>}
    </ToolCard>
  );
}

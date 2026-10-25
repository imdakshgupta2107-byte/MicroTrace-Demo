// cell-culture — dynamic final-volume entry; densities are explicitly cells per mL.
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { QuantityInput } from "@/components/units/quantity-input";
import { UnitDropdown } from "@/components/units/unit-dropdown";
import { displayFromBase, decimalInput, isPositive, normalizedInput } from "@/lib/quantity";
import { findUnit } from "@/lib/units";
import { ToolCard } from "../_common";

export function CellCultureTool() {
  const [target, setTarget] = useState("");
  const [stock, setStock] = useState("");
  const [finalVolume, setFinalVolume] = useState("");
  const [finalVolumeUnit, setFinalVolumeUnit] = useState("mL");
  const [outputVolumeUnit, setOutputVolumeUnit] = useState("uL");
  const targetDensity = decimalInput(target);
  const stockDensity = decimalInput(stock);
  const volumeL = normalizedInput(finalVolume, finalVolumeUnit);
  const result = useMemo(() => isPositive(targetDensity) && isPositive(stockDensity) && isPositive(volumeL) && stockDensity.gte(targetDensity)
    ? volumeL.mul(targetDensity).div(stockDensity) : null, [targetDensity, stockDensity, volumeL]);

  return (
    <ToolCard title="Cell culture seeding" blurb="Calculate cell-stock and medium volumes. Final volume accepts any supported scientific volume unit.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Target density (cells/mL)</span><Input inputMode="decimal" type="text" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 2e5" /></label>
        <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Stock density (cells/mL)</span><Input inputMode="decimal" type="text" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="e.g. 1e6" /></label>
        <QuantityInput id="cell-final-volume" label="Final volume" value={finalVolume} onValueChange={setFinalVolume} unitCode={finalVolumeUnit} onUnitChange={setFinalVolumeUnit} dimension="volume" />
        <UnitDropdown id="cell-output-unit" label="Show result volume as" value={outputVolumeUnit} onChange={setOutputVolumeUnit} dimension="volume" />
      </div>
      {stockDensity && targetDensity && stockDensity.lt(targetDensity) && <p className="text-[12px] font-semibold text-red-700">Stock is below target density — concentrate cells first.</p>}
      {result && volumeL && <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
        Add <b className="text-ink">{displayFromBase(result, outputVolumeUnit)} {findUnit(outputVolumeUnit)?.symbol}</b> cell suspension + <b className="text-ink">{displayFromBase(volumeL.minus(result), outputVolumeUnit)} {findUnit(outputVolumeUnit)?.symbol}</b> medium.
      </div>}
    </ToolCard>
  );
}

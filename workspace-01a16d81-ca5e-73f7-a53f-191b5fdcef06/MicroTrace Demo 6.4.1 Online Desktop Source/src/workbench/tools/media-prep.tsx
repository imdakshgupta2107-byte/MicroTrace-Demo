// media-prep — dynamic concentration × volume with canonical g/L and L math.
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { QuantityInput } from "@/components/units/quantity-input";
import { UnitDropdown } from "@/components/units/unit-dropdown";
import { displayFromBase, decimalInput, isPositive, normalizedInput } from "@/lib/quantity";
import { findUnit } from "@/lib/units";
import { ToolCard } from "../_common";

export function MediaPrepTool() {
  const [strength, setStrength] = useState("");
  const [strengthUnit, setStrengthUnit] = useState("g_per_L");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState("mL");
  const [outputMassUnit, setOutputMassUnit] = useState("g");
  const [batches, setBatches] = useState("1");

  const concentration = normalizedInput(strength, strengthUnit); // g/L
  const volumeL = normalizedInput(volume, volumeUnit); // L
  const batchCount = decimalInput(batches);
  const massPerBatchG = useMemo(() => isPositive(concentration) && isPositive(volumeL) ? concentration.mul(volumeL) : null, [concentration, volumeL]);
  const totalMassG = useMemo(() => massPerBatchG && isPositive(batchCount) ? massPerBatchG.mul(batchCount) : null, [massPerBatchG, batchCount]);
  const massSymbol = findUnit(outputMassUnit)?.symbol ?? "g";
  const volumeSymbol = findUnit(volumeUnit)?.symbol ?? "L";

  return (
    <ToolCard title="Media prep" blurb="Enter any supported concentration and batch volume. Calculations normalize to g/L and L before deriving powder mass.">
      <div className="grid gap-3 sm:grid-cols-2">
        <QuantityInput id="media-strength" label="Label strength" value={strength} onValueChange={setStrength}
          unitCode={strengthUnit} onUnitChange={setStrengthUnit} dimension="mass_concentration"
          hint="Examples: 28 g/L, 14 mg/mL, or 1e-6 g/gal (US)." />
        <QuantityInput id="media-volume" label="Batch volume" value={volume} onValueChange={setVolume}
          unitCode={volumeUnit} onUnitChange={setVolumeUnit} dimension="volume"
          hint="Scientific notation is accepted, for example 2.5e-6 L." />
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Batches</span>
          <Input inputMode="decimal" type="text" value={batches} onChange={(event) => setBatches(event.target.value)} placeholder="1" />
        </label>
        <UnitDropdown id="media-output-mass" label="Show powder as" dimension="mass" value={outputMassUnit} onChange={setOutputMassUnit} />
      </div>
      {massPerBatchG && totalMassG && (
        <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px] space-y-1.5">
          <div>Per batch: <b className="text-ink">{displayFromBase(massPerBatchG, outputMassUnit)} {massSymbol}</b> powder + <b>{displayFromBase(volumeL!, volumeUnit)} {volumeSymbol}</b> distilled water.</div>
          {batchCount && batchCount.gt(1) && <div>For {batchCount.toString()} batches: <b className="text-ink">{displayFromBase(totalMassG, outputMassUnit)} {massSymbol}</b> total powder.</div>}
          <div className="pt-1 text-[11px] text-slate-500">Formula: normalized concentration (g/L) × normalized volume (L). Dissolve, then sterilize only according to the medium label and your SOP.</div>
        </div>
      )}
      {strength && volume && (!isPositive(concentration) || !isPositive(volumeL)) && <p className="text-[12px] font-semibold text-red-700">Enter positive, valid scientific quantities.</p>}
    </ToolCard>
  );
}

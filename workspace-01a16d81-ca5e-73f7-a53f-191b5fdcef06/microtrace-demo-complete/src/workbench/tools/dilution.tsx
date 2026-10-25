// dilution — C₁V₁ = C₂V₂ with normalized concentration and volume units.
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { QuantityInput } from "@/components/units/quantity-input";
import { UnitDropdown } from "@/components/units/unit-dropdown";
import { displayFromBase, isPositive, normalizedInput } from "@/lib/quantity";
import { findUnit, type UnitDimension } from "@/lib/units";
import { ToolCard } from "../_common";

type ConcentrationDimension = Extract<UnitDimension, "mass_concentration" | "molar_concentration">;

export function DilutionTool() {
  const [dimension, setDimension] = useState<ConcentrationDimension>("molar_concentration");
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [c1Unit, setC1Unit] = useState("M");
  const [c2Unit, setC2Unit] = useState("M");
  const [finalVolume, setFinalVolume] = useState("");
  const [finalVolumeUnit, setFinalVolumeUnit] = useState("mL");
  const [outputVolumeUnit, setOutputVolumeUnit] = useState("mL");

  const c1Base = normalizedInput(c1, c1Unit);
  const c2Base = normalizedInput(c2, c2Unit);
  const v2L = normalizedInput(finalVolume, finalVolumeUnit);
  const result = useMemo(() => {
    if (!isPositive(c1Base) || !isPositive(c2Base) || !isPositive(v2L) || c2Base.gt(c1Base)) return null;
    const stockL = c2Base.mul(v2L).div(c1Base);
    return { stockL, diluentL: v2L.minus(stockL) };
  }, [c1Base, c2Base, v2L]);

  const changeDimension = (next: ConcentrationDimension) => {
    setDimension(next);
    const first = next === "molar_concentration" ? "M" : "g_per_L";
    setC1Unit(first);
    setC2Unit(first);
  };
  const outputSymbol = findUnit(outputVolumeUnit)?.symbol ?? "L";

  return (
    <ToolCard title="Dilution (C₁V₁ = C₂V₂)" blurb="Use molar or mass concentration units. Both concentrations are normalized before the dilution calculation.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Concentration type</span>
          <Select value={dimension} onChange={(event) => changeDimension(event.target.value as ConcentrationDimension)}>
            <option value="molar_concentration">Molar concentration</option>
            <option value="mass_concentration">Mass concentration</option>
          </Select>
        </label>
        <QuantityInput id="dilution-final-volume" label="Final volume (V₂)" value={finalVolume} onValueChange={setFinalVolume}
          unitCode={finalVolumeUnit} onUnitChange={setFinalVolumeUnit} dimension="volume" />
        <QuantityInput id="dilution-c1" label="Stock concentration (C₁)" value={c1} onValueChange={setC1}
          unitCode={c1Unit} onUnitChange={setC1Unit} dimension={dimension} />
        <QuantityInput id="dilution-c2" label="Target concentration (C₂)" value={c2} onValueChange={setC2}
          unitCode={c2Unit} onUnitChange={setC2Unit} dimension={dimension} />
        <UnitDropdown id="dilution-output-volume" label="Show volumes as" dimension="volume" value={outputVolumeUnit} onChange={setOutputVolumeUnit} />
      </div>
      {c1Base && c2Base && c2Base.gt(c1Base) && <p className="text-[12px] font-semibold text-red-700">The target concentration is stronger than the stock after normalization; it cannot be made by dilution.</p>}
      {result && <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
        Take <b className="text-ink">{displayFromBase(result.stockL, outputVolumeUnit)} {outputSymbol}</b> stock, add <b className="text-ink">{displayFromBase(result.diluentL, outputVolumeUnit)} {outputSymbol}</b> diluent → <b>{displayFromBase(v2L!, outputVolumeUnit)} {outputSymbol}</b> at C₂.
        <div className="mt-1 text-[11px] text-slate-500">C₁ and C₂ are normalized to the selected shared concentration dimension; volumes are normalized to litres.</div>
      </div>}
    </ToolCard>
  );
}

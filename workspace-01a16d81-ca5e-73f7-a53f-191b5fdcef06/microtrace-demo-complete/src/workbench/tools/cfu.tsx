// cfu — colonies × dilution ÷ plated volume, with dynamic scientific volume units.
import Decimal from "decimal.js";
import { useMemo, useState } from "react";
import { QuantityInput } from "@/components/units/quantity-input";
import { decimalInput, isPositive, normalizedInput } from "@/lib/quantity";
import { fmtNum } from "@/lib/format";
import { SciResult, ToolCard } from "../_common";
import { Input } from "@/components/ui/input";
import { PlateCanvas } from "../plate-canvas";

export function CfuTool() {
  const [colonies, setColonies] = useState<number | "">("");
  const [dilutionFactor, setDilutionFactor] = useState("");
  const [volume, setVolume] = useState("100");
  const [volumeUnit, setVolumeUnit] = useState("uL");
  const dilution = decimalInput(dilutionFactor);
  const volumeL = normalizedInput(volume, volumeUnit);
  const result = useMemo(() => colonies !== "" && isPositive(dilution) && isPositive(volumeL)
    ? Number(new Decimal(colonies).mul(dilution).div(volumeL.mul(1000)).toString()) : null, [colonies, dilution, volumeL]);

  return (
    <ToolCard title="CFU / mL" blurb="Viable count from your spread plate. Choose any plated-volume scale; it is normalized to litres before CFU/mL is derived.">
      <PlateCanvas onCount={setColonies} />
      <div className="space-y-1">
        <span className="text-[11.5px] font-bold text-slate-600">Colonies counted (tap plate image or type)</span>
        <Input type="number" min={0} value={colonies} onChange={(event) => setColonies(event.target.value === "" ? "" : parseInt(event.target.value, 10))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1"><span className="block text-[11.5px] font-bold text-slate-600">Dilution factor</span><Input inputMode="decimal" type="text" value={dilutionFactor} onChange={(event) => setDilutionFactor(event.target.value)} placeholder="e.g. 1e5" /></label>
        <QuantityInput id="cfu-volume" label="Plated volume" value={volume} onValueChange={setVolume} unitCode={volumeUnit} onUnitChange={setVolumeUnit} dimension="volume" />
      </div>
      {colonies !== "" && (colonies < 30 || colonies > 300) && <p className="text-[12px] font-semibold text-amber-700">Outside the reliable 30–300 colony window — interpret with care.</p>}
      <SciResult label="CFU per mL" value={result} sub={result !== null && volumeL ? `= ${fmtNum(colonies as number)} colonies × ${dilutionFactor} ÷ ${fmtNum(Number(volumeL.mul(1000).toString()), 8)} mL` : undefined} />
    </ToolCard>
  );
}

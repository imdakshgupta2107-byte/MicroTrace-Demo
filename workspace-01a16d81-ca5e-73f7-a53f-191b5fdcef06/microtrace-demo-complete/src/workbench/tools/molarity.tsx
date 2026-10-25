// molarity — M (mol/L) × molar mass (g/mol) × volume (L) = solute mass (g).
import { useMemo, useState } from "react";
import { QuantityInput } from "@/components/units/quantity-input";
import { UnitDropdown } from "@/components/units/unit-dropdown";
import { displayFromBase, isPositive, normalizedInput } from "@/lib/quantity";
import { findUnit } from "@/lib/units";
import { ToolCard } from "../_common";

export function MolarityTool() {
  const [molarity, setMolarity] = useState("");
  const [molarityUnit, setMolarityUnit] = useState("M");
  const [molarMass, setMolarMass] = useState("");
  const [molarMassUnit, setMolarMassUnit] = useState("g");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState("mL");
  const [outputMassUnit, setOutputMassUnit] = useState("g");

  const molPerL = normalizedInput(molarity, molarityUnit);
  // A selected mass unit here means that mass per mole: mg = mg/mol, kg = kg/mol.
  const gramsPerMol = normalizedInput(molarMass, molarMassUnit);
  const volumeL = normalizedInput(volume, volumeUnit);
  const massG = useMemo(() => isPositive(molPerL) && isPositive(gramsPerMol) && isPositive(volumeL)
    ? molPerL.mul(gramsPerMol).mul(volumeL) : null, [molPerL, gramsPerMol, volumeL]);

  return (
    <ToolCard title="Molar solution" blurb="Choose concentration, molar-mass and volume units freely; the calculation always uses mol/L, g/mol and L internally.">
      <div className="grid gap-3 sm:grid-cols-2">
        <QuantityInput id="molarity-concentration" label="Target molarity" value={molarity} onValueChange={setMolarity}
          unitCode={molarityUnit} onUnitChange={setMolarityUnit} dimension="molar_concentration" />
        <QuantityInput id="molarity-mass" label="Molar mass (per mol)" value={molarMass} onValueChange={setMolarMass}
          unitCode={molarMassUnit} onUnitChange={setMolarMassUnit} dimension="mass"
          hint="For example, choose g and enter 58.44 for 58.44 g/mol; choose mg for mg/mol." />
        <QuantityInput id="molarity-volume" label="Final volume" value={volume} onValueChange={setVolume}
          unitCode={volumeUnit} onUnitChange={setVolumeUnit} dimension="volume" />
        <UnitDropdown id="molarity-output" label="Show mass as" dimension="mass" value={outputMassUnit} onChange={setOutputMassUnit} />
      </div>
      {massG && <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-[13.5px]">
        Weigh <b className="text-ink">{displayFromBase(massG, outputMassUnit)} {findUnit(outputMassUnit)?.symbol ?? "g"}</b>, dissolve and make up to <b>{displayFromBase(volumeL!, volumeUnit)} {findUnit(volumeUnit)?.symbol ?? "L"}</b>.
        <div className="mt-1 text-[11px] text-slate-500">Formula uses normalized M × g/mol × L values, so changing display units never changes the chemistry.</div>
      </div>}
    </ToolCard>
  );
}

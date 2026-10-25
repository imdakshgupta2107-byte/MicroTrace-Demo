// unit-converter — v3.5 scientific dimension converter with SI prefixes and exact decimal arithmetic.
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { UnitSelector } from "@/components/units/unit-selector";
import { ToolCard } from "../_common";
import { canonicalUnitLabel, convertUnitValue, findUnit, unitsForDimension, type UnitDimension } from "@/lib/units";

const DIMENSIONS: Array<{ value: UnitDimension; label: string }> = [
  { value: "mass", label: "Mass" },
  { value: "volume", label: "Volume" },
  { value: "length", label: "Length" },
  { value: "substance_amount", label: "Amount of substance" },
  { value: "mass_concentration", label: "Mass concentration" },
  { value: "molar_concentration", label: "Molar concentration" },
  { value: "count", label: "Count / packs" },
];

const DEFAULT_UNITS: Record<UnitDimension, [string, string]> = {
  mass: ["mg", "g"],
  volume: ["mL", "L"],
  length: ["nm", "mm"],
  substance_amount: ["mmol", "mol"],
  mass_concentration: ["mg_per_mL", "g_per_L"],
  molar_concentration: ["uM", "mM"],
  count: ["pcs", "units"],
};

export function UnitConverterTool() {
  const [dimension, setDimension] = useState<UnitDimension>("volume");
  const [fromCode, setFromCode] = useState("mL");
  const [toCode, setToCode] = useState("L");
  const [value, setValue] = useState("1");
  const from = findUnit(fromCode);
  const to = findUnit(toCode);
  const converted = useMemo(() => {
    if (!from || !to || !value.trim()) return null;
    try { return convertUnitValue(value, from, to); } catch { return null; }
  }, [from, to, value]);

  const switchDimension = (next: UnitDimension) => {
    const [nextFrom, nextTo] = DEFAULT_UNITS[next];
    setDimension(next);
    setFromCode(nextFrom);
    setToCode(nextTo);
  };

  return (
    <ToolCard
      title="Scientific unit converter"
      blurb="Laboratory, extended SI, cubic and US/imperial units—from ultra-small scales through industrial volumes—using exact decimal normalization."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Scientific dimension</span>
          <Select value={dimension} onChange={(event) => switchDimension(event.target.value as UnitDimension)}>
            {DIMENSIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11.5px] font-bold text-slate-600">Value</span>
          <input
            inputMode="decimal"
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-2.5 text-base font-medium outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20 sm:h-9 sm:text-[13px]"
          />
        </label>
        <UnitSelector id="converter-from" label="From" dimension={dimension} value={fromCode} onChange={setFromCode} />
        <UnitSelector id="converter-to" label="To" dimension={dimension} value={toCode} onChange={setToCode} />
      </div>

      <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 text-ink">
        {converted !== null && from && to ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-600">Conversion result</p>
            <p className="mt-1 text-lg font-extrabold">
              {value} {from.symbol} = {converted} {to.symbol}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Canonical storage unit: {canonicalUnitLabel(dimension)}. Unit selection only changes display and entry scale; it does not silently cross physical dimensions.
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-600">Enter a valid non-negative value to convert.</p>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Safety guardrail: mass-to-volume conversion requires recorded density; mass-to-mole conversion requires molecular weight. Use the dedicated molarity tool for those transformations.
      </p>
      <span className="sr-only">{unitsForDimension(dimension).length} units available.</span>
    </ToolCard>
  );
}

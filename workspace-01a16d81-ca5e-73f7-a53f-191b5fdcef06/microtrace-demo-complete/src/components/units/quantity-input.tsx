import { Input } from "@/components/ui/input";
import { UnitDropdown } from "./unit-dropdown";
import type { UnitDimension } from "@/lib/units";

type QuantityInputProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  unitCode: string;
  onUnitChange: (code: string) => void;
  dimension: UnitDimension;
  disabled?: boolean;
  hint?: string;
  className?: string;
};

/** A numeric scientific-notation field with a compact normalized unit picker. */
export function QuantityInput({
  id, label, value, onValueChange, unitCode, onUnitChange, dimension, disabled, hint, className,
}: QuantityInputProps) {
  return (
    <div className={className}>
      <span id={`${id}-label`} className="mb-1 block text-[11.5px] font-bold text-slate-600">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.25rem,.9fr)] gap-2">
        <Input
          id={id}
          aria-labelledby={`${id}-label`}
          inputMode="decimal"
          type="text"
          value={value}
          disabled={disabled}
          placeholder="e.g. 2.5e-6"
          onChange={(event) => onValueChange(event.target.value)}
        />
        <UnitDropdown id={`${id}-unit`} dimension={dimension} value={unitCode} onChange={onUnitChange} disabled={disabled} />
      </div>
      {hint && <p className="pt-1 text-[10.5px] leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

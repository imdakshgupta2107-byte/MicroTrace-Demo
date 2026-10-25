import { Select } from "@/components/ui/select";
import { unitsForDimension, type UnitDefinition, type UnitDimension } from "@/lib/units";

type UnitDropdownProps = {
  id: string;
  dimension: UnitDimension;
  value: string;
  onChange: (code: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Optional server-defined catalog; system definitions are the offline fallback. */
  units?: UnitDefinition[];
};

const FAMILY_LABEL: Record<NonNullable<UnitDefinition["family"]>, string> = {
  laboratory: "Common laboratory units",
  extended: "Extended SI micro / nano scale",
  industrial: "Large / industrial SI scale",
  customary: "Cubic, US & imperial units",
};

/**
 * Compact universal unit picker. Native select keeps it fast and accessible on
 * phones, while optgroups provide keyboard type-ahead and logical grouping.
 */
export function UnitDropdown({ id, dimension, value, onChange, label, disabled, className, units }: UnitDropdownProps) {
  const choices = (units ?? unitsForDimension(dimension)).filter((definition) => definition.dimension === dimension);
  const grouped = choices.reduce<Record<string, UnitDefinition[]>>((result, definition) => {
    const family = definition.family ?? "laboratory";
    (result[family] ??= []).push(definition);
    return result;
  }, {});

  return (
    <label className="min-w-0 space-y-1" htmlFor={id}>
      {label && <span className="block text-[11.5px] font-bold text-slate-600">{label}</span>}
      <Select
        id={id}
        aria-label={label ?? "Scientific unit"}
        title="Choose a unit; keyboard type-ahead is supported"
        value={value}
        disabled={disabled}
        className={className}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(grouped).map(([family, definitions]) => (
          <optgroup key={family} label={FAMILY_LABEL[family as keyof typeof FAMILY_LABEL] ?? family}>
            {definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.symbol} — {definition.label}</option>)}
          </optgroup>
        ))}
      </Select>
    </label>
  );
}

export type { UnitDropdownProps };

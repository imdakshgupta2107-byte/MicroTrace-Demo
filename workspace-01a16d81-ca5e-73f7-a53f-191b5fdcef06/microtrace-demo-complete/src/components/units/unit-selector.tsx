import { UnitDropdown, type UnitDropdownProps } from "./unit-dropdown";

/** Backward-compatible name for existing inventory forms. */
export type UnitSelectorProps = UnitDropdownProps;
export function UnitSelector(props: UnitSelectorProps) {
  return <UnitDropdown {...props} />;
}

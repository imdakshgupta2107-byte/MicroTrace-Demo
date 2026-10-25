import Decimal from "decimal.js";
import { convertFromBase, findUnit, normalizeToBase } from "./units";

/** Parse user-entered decimal/scientific notation without Number precision loss. */
export function decimalInput(value: string): Decimal | null {
  if (!value.trim()) return null;
  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() ? parsed : null;
  } catch { return null; }
}

/** Normalize a numeric entry to the canonical unit of its selected dimension. */
export function normalizedInput(value: string, unitCode: string): Decimal | null {
  const definition = findUnit(unitCode);
  const input = decimalInput(value);
  if (!definition || !input) return null;
  try { return new Decimal(normalizeToBase(input.toString(), definition)); } catch { return null; }
}

/** Render a canonical base quantity in a selected display unit. */
export function displayFromBase(baseValue: Decimal, unitCode: string, significantDigits = 8): string {
  const definition = findUnit(unitCode);
  if (!definition) return "—";
  return new Decimal(convertFromBase(baseValue.toString(), definition)).toSignificantDigits(significantDigits).toString();
}

export function isPositive(value: Decimal | null): value is Decimal {
  return Boolean(value && value.gt(0));
}

// safety — GHS pictograms, PPE lists, first-aid helpers.
import { GHS_CODES, PPE_ITEMS } from "./constants";

export const ghsLabel = (code: string): string => `${code} — ${GHS_CODES[code]?.label ?? "Hazard"}`;
export const ghsSym = (code: string): string => GHS_CODES[code]?.sym ?? "?";
export const allGhs = (): { code: string; sym: string; label: string }[] =>
  Object.entries(GHS_CODES).map(([code, v]) => ({ code, sym: v.sym, label: v.label }));
export const ppeOptions = () => [...PPE_ITEMS];
export const parsePpe = (txt: string): string[] =>
  txt ? txt.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [];
export const encodePpe = (items: string[]): string => items.join(", ");

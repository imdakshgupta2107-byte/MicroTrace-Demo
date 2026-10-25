// expiry + degradation states.
// exp: sealed/shelf life; use_by: user override; opened_at: opened bottles
// degrade ("recommended 6 months after opening" style hinting).
import { daysUntil } from "./format";
import type { Container } from "./types";

export interface ExpiryInfo {
  state: "expired" | "soon" | "watch" | "ok" | "none";
  label: string;
  days: number | null;
  typicalUseMonths: number | null;   // after opening
}

export function expiryState(c: Container): ExpiryInfo {
  const effective = c.use_by || c.expiry;
  if (!effective) return { state: "none", label: "No expiry", days: null, typicalUseMonths: null };
  const d = daysUntil(effective);
  if (d < 0)  return { state: "expired", label: `Expired ${-d}d ago`, days: d, typicalUseMonths: null };
  if (d <= 30) return { state: "soon",  label: `${d}d left`, days: d, typicalUseMonths: null };
  if (d <= 90) return { state: "watch", label: `${d}d left`, days: d, typicalUseMonths: null };
  return { state: "ok", label: `${d}d left`, days: d, typicalUseMonths: null };
}

/** opened containers degrade faster than their printed expiry */
export function degradationState(c: Container): { label: string; pct: number } | null {
  if (c.state !== "opened" || !c.opened_at) return null;
  const DAYS = 180; // rule of thumb: 6 months after opening for most stains/reagents
  const since = -daysUntil(c.opened_at); // days since opened
  const pct = Math.min(1, Math.max(0, 1 - since / DAYS));
  const left = Math.max(0, Math.round((DAYS - since) / 30));
  return { label: left <= 0 ? "Opened >6 months — degrading" : `Opened — ~${left} mo left`, pct };
}

export const expiryBadge = (e: ExpiryInfo): string =>
  ({ expired: "bg-red-100 text-red-700", soon: "bg-amber-100 text-amber-700",
     watch: "bg-slate-100 text-slate-600", ok: "bg-green-100 text-green-700",
     none: "bg-slate-100 text-slate-500" } as const)[e.state];

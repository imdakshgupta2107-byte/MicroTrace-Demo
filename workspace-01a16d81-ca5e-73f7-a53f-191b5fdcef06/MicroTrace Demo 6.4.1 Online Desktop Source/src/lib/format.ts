// date, number, currency formatters (Indian locale)
export const fmtDate = (iso?: string | null): string =>
  !iso ? "—" : new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

export const fmtDateTime = (iso?: string | null): string =>
  !iso ? "—" : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    ", " + new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });

/** Calendar dates use the device timezone, not the previous UTC day in India. */
export const localISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const todayISO = (): string => localISODate(new Date());

export const addDays = (n: number): string => {
  const t = new Date(); t.setDate(t.getDate() + n); return localISODate(t);
};

export const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime()) / 86400000);

export const fmtNum = (n: number, maxFrac = 2): string =>
  n.toLocaleString("en-IN", { maximumFractionDigits: maxFrac });

export const fmtINR = (n: number, maxFrac = 0): string =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: maxFrac });

export const fmtPct = (n: number): string => `${Math.round(n * 100)}%`;

export const mmss = (s: number): string =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

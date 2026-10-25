import { useMemo, useSyncExternalStore } from "react";
import { DEMO_DATA_EVENT, DEMO_STORE_KEY } from "@/demo/config";
import type { Role } from "@/lib/types";

export type DailyCheckKind = "opening" | "closing";

export interface DailyCheckRecord {
  id: string;
  kind: DailyCheckKind;
  date: string;
  completed: Record<string, boolean>;
  notes: string;
  signed_off_by: string | null;
  signed_off_role: Role | null;
  signed_off_at: string | null;
  updated_at: string;
}

interface DailyCheckStore {
  version: 1;
  records: DailyCheckRecord[];
}

const STORE_KEY = `${DEMO_STORE_KEY}_daily_checks`;
const EMPTY: DailyCheckStore = Object.freeze({ version: 1, records: [] });
let cachedRaw: string | null | undefined;
let cached: DailyCheckStore = EMPTY;

export const DAILY_CHECKS: Record<DailyCheckKind, Array<{ id: string; label: string; help: string }>> = {
  opening: [
    { id: "emergency", label: "Emergency route and safety equipment checked", help: "Confirm exits, eyewash, spill kit and fire equipment are unobstructed." },
    { id: "cold-chain", label: "Cold storage conditions reviewed", help: "Review refrigerator/freezer temperature log and investigate exceptions under the lab SOP." },
    { id: "priority", label: "Urgent requests and expiring stock reviewed", help: "Review the action queue before preparing issues or practicals." },
    { id: "work-area", label: "Benches are ready for planned work", help: "Confirm cleaning, PPE availability and required controlled areas." },
    { id: "equipment", label: "Planned instruments are available", help: "Check maintenance restrictions and report any out-of-service equipment." },
  ],
  closing: [
    { id: "returns", label: "Issues, returns and handovers reconciled", help: "Close or flag outstanding material custody records." },
    { id: "waste", label: "Waste and breakage have been recorded", help: "Use the discrepancy workflow for all reportable losses." },
    { id: "storage", label: "Stock and controlled storage are secured", help: "Confirm chemicals, cultures and keys are stored according to the local SOP." },
    { id: "cold-chain", label: "Cold storage handover reviewed", help: "Confirm temperature exceptions and corrective actions are documented." },
    { id: "workspace", label: "Benches and equipment left safe", help: "Confirm cleanup, shutdown and any maintenance notes." },
  ],
};

const today = () => new Date().toISOString().slice(0, 10);
const recordId = (kind: DailyCheckKind, date: string) => `${kind}:${date}`;

function normalize(value: unknown): DailyCheckStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY;
  const candidate = value as Partial<DailyCheckStore>;
  if (!Array.isArray(candidate.records)) return EMPTY;
  return {
    version: 1,
    records: candidate.records.filter((entry): entry is DailyCheckRecord => Boolean(
      entry && typeof entry === "object" && typeof entry.id === "string" &&
      (entry.kind === "opening" || entry.kind === "closing") && typeof entry.date === "string",
    )),
  };
}

function read(): DailyCheckStore {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(STORE_KEY); } catch { return EMPTY; }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try { cached = normalize(raw ? JSON.parse(raw) : null); } catch { cached = EMPTY; }
  return cached;
}

function commit(next: DailyCheckStore) {
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORE_KEY, raw);
    cachedRaw = raw;
    cached = next;
    window.dispatchEvent(new Event(DEMO_DATA_EVENT));
  } catch {
    throw new Error("Unable to save the daily check. Device storage may be unavailable.");
  }
}

function ensureRecord(store: DailyCheckStore, kind: DailyCheckKind, date = today()): DailyCheckRecord {
  return store.records.find((record) => record.id === recordId(kind, date)) ?? {
    id: recordId(kind, date), kind, date, completed: {}, notes: "",
    signed_off_by: null, signed_off_role: null, signed_off_at: null, updated_at: new Date().toISOString(),
  };
}

function update(kind: DailyCheckKind, patch: (record: DailyCheckRecord) => DailyCheckRecord) {
  const current = read();
  const base = ensureRecord(current, kind);
  const nextRecord = patch(base);
  const next: DailyCheckStore = {
    version: 1,
    records: [...current.records.filter((record) => record.id !== base.id), nextRecord],
  };
  commit(next);
}

const subscribe = (listener: () => void) => {
  const onChange = () => { cachedRaw = undefined; listener(); };
  window.addEventListener(DEMO_DATA_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DEMO_DATA_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const serverSnapshot = () => EMPTY;

export function useDailyChecks() {
  const data = useSyncExternalStore(subscribe, read, serverSnapshot);
  return useMemo(() => ({
    opening: ensureRecord(data, "opening"),
    closing: ensureRecord(data, "closing"),
    actions: {
      setCheck(kind: DailyCheckKind, checkId: string, value: boolean) {
        update(kind, (record) => ({
          ...record,
          completed: { ...record.completed, [checkId]: value },
          signed_off_by: null,
          signed_off_role: null,
          signed_off_at: null,
          updated_at: new Date().toISOString(),
        }));
      },
      setNotes(kind: DailyCheckKind, notes: string) {
        update(kind, (record) => ({ ...record, notes, updated_at: new Date().toISOString() }));
      },
      signOff(kind: DailyCheckKind, actor: { name: string; role: Role }) {
        const current = read();
        const record = ensureRecord(current, kind);
        const missing = DAILY_CHECKS[kind].some((check) => !record.completed[check.id]);
        if (missing) throw new Error("Complete every required check before signing off.");
        update(kind, (entry) => ({
          ...entry,
          signed_off_by: actor.name,
          signed_off_role: actor.role,
          signed_off_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      },
      reset(kind: DailyCheckKind) {
        update(kind, (record) => ({
          ...record,
          completed: {},
          notes: "",
          signed_off_by: null,
          signed_off_role: null,
          signed_off_at: null,
          updated_at: new Date().toISOString(),
        }));
      },
    },
  }), [data]);
}

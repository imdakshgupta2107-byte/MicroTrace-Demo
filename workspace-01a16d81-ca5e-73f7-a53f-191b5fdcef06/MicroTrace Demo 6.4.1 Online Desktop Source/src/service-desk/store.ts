import { useMemo, useSyncExternalStore } from "react";
import { DEMO_DATA_EVENT, DEMO_STORE_KEY } from "@/demo/config";
import type { DeskActor, ServiceDeskStore } from "./types";
import {
  acknowledgeDeskTicket, completeDeskTicket, createDeskReport, createDeskRequest,
  declineDeskTicket, endorseDeskRequirement, getServiceDesk, startDeskWork,
  withdrawDeskTicket, type DemoRoot,
} from "./ledger";

const EMPTY: ServiceDeskStore = Object.freeze({ version: 1, tickets: [], audit: [] });
let cachedRaw: string | null | undefined;
let cachedDesk: ServiceDeskStore = EMPTY;

function rootFromStorage(): DemoRoot {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as DemoRoot : {};
  } catch { return {}; }
}
function read(): ServiceDeskStore {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(DEMO_STORE_KEY); } catch { return EMPTY; }
  if (raw === cachedRaw) return cachedDesk;
  cachedRaw = raw; cachedDesk = getServiceDesk(rootFromStorage());
  return cachedDesk;
}
function commit(next: DemoRoot): void {
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(DEMO_STORE_KEY, raw);
    cachedRaw = raw; cachedDesk = getServiceDesk(next);
    window.dispatchEvent(new Event(DEMO_DATA_EVENT));
  } catch { throw new Error("Unable to save this lab desk record. Device storage may be unavailable."); }
}
function perform(fn: (root: DemoRoot) => DemoRoot): void { commit(fn(rootFromStorage())); }
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

export function useServiceDesk() {
  const data = useSyncExternalStore(subscribe, read, serverSnapshot);
  return useMemo(() => ({ data, actions: serviceDeskActions }), [data]);
}

export const serviceDeskActions = {
  createReport: (actor: DeskActor, input: Parameters<typeof createDeskReport>[2]) => perform((root) => createDeskReport(root, actor, input)),
  createRequest: (actor: DeskActor, input: Parameters<typeof createDeskRequest>[2]) => perform((root) => createDeskRequest(root, actor, input)),
  acknowledge: (actor: DeskActor, ticketId: string) => perform((root) => acknowledgeDeskTicket(root, actor, ticketId)),
  endorse: (actor: DeskActor, ticketId: string, note?: string) => perform((root) => endorseDeskRequirement(root, actor, ticketId, note)),
  start: (actor: DeskActor, ticketId: string) => perform((root) => startDeskWork(root, actor, ticketId)),
  complete: (actor: DeskActor, ticketId: string, outcome: string) => perform((root) => completeDeskTicket(root, actor, ticketId, outcome)),
  decline: (actor: DeskActor, ticketId: string, outcome: string) => perform((root) => declineDeskTicket(root, actor, ticketId, outcome)),
  withdraw: (actor: DeskActor, ticketId: string) => perform((root) => withdrawDeskTicket(root, actor, ticketId)),
};

import { useMemo, useSyncExternalStore } from "react";
import { DEMO_DATA_EVENT, DEMO_STORE_KEY } from "@/demo/config";
import type { ControlActor, RegisterStore } from "./types";
import { acknowledgeHandover, createIndent, createReceipt, decideIndent, getRegisters, prepareHandover, recountAndInvestigate, resolveInvestigation, reviewClosure, startBlindCount, submitBlindCount, submitClosure, verifyReceipt, type DemoRoot } from "./ledger";

const EMPTY: RegisterStore = Object.freeze({ version: 1, indents: [], receipts: [], handovers: [], closures: [], counts: [], investigations: [], control_audit: [] });
let cachedRaw: string | null | undefined;
let cachedRegisters: RegisterStore = EMPTY;
function rootFromStorage(): DemoRoot {
  try { const parsed: unknown = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as DemoRoot : {}; } catch { return {}; }
}
function read(): RegisterStore {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null; try { raw = window.localStorage.getItem(DEMO_STORE_KEY); } catch { return EMPTY; }
  if (raw === cachedRaw) return cachedRegisters;
  cachedRaw = raw; cachedRegisters = getRegisters(rootFromStorage()); return cachedRegisters;
}
function commit(next: DemoRoot): void {
  try { const raw = JSON.stringify(next); window.localStorage.setItem(DEMO_STORE_KEY, raw); cachedRaw = raw; cachedRegisters = getRegisters(next); window.dispatchEvent(new Event(DEMO_DATA_EVENT)); } catch { throw new Error("Unable to save this demo record. Device storage may be unavailable."); }
}
function perform(fn: (root: DemoRoot) => DemoRoot): void { commit(fn(rootFromStorage())); }
const subscribe = (listener: () => void) => { const onChange = () => { cachedRaw = undefined; listener(); }; window.addEventListener(DEMO_DATA_EVENT, onChange); window.addEventListener("storage", onChange); return () => { window.removeEventListener(DEMO_DATA_EVENT, onChange); window.removeEventListener("storage", onChange); }; };
const serverSnapshot = () => EMPTY;
export function useRegisters() { const data = useSyncExternalStore(subscribe, read, serverSnapshot); return useMemo(() => ({ data, actions: registerActions }), [data]); }
export const registerActions = {
  createIndent: (actor: ControlActor, input: Parameters<typeof createIndent>[2]) => perform((root) => createIndent(root, actor, input)),
  decideIndent: (actor: ControlActor, indentId: string, decision: "approved" | "rejected", qty: number, note: string) => perform((root) => decideIndent(root, actor, indentId, decision, qty, note)),
  createReceipt: (actor: ControlActor, input: Parameters<typeof createReceipt>[2]) => perform((root) => createReceipt(root, actor, input)),
  verifyReceipt: (actor: ControlActor, receiptId: string, accept: boolean, note: string) => perform((root) => verifyReceipt(root, actor, receiptId, accept, note)),
  prepareHandover: (actor: ControlActor, indentId: string, qty: number) => perform((root) => prepareHandover(root, actor, indentId, qty)),
  acknowledgeHandover: (actor: ControlActor, handoverId: string) => perform((root) => acknowledgeHandover(root, actor, handoverId)),
  submitClosure: (actor: ControlActor, handoverId: string, input: Parameters<typeof submitClosure>[3]) => perform((root) => submitClosure(root, actor, handoverId, input)),
  reviewClosure: (actor: ControlActor, closureId: string, note: string) => perform((root) => reviewClosure(root, actor, closureId, note)),
  startBlindCount: (actor: ControlActor, itemId: string, location: string) => perform((root) => startBlindCount(root, actor, itemId, location)),
  submitBlindCount: (actor: ControlActor, countId: string, observed: number) => perform((root) => submitBlindCount(root, actor, countId, observed)),
  recountAndInvestigate: (actor: ControlActor, countId: string, recount: number, note: string) => perform((root) => recountAndInvestigate(root, actor, countId, recount, note)),
  resolveInvestigation: (actor: ControlActor, id: string, input: Parameters<typeof resolveInvestigation>[3]) => perform((root) => resolveInvestigation(root, actor, id, input)),
};

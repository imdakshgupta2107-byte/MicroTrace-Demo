import { useMemo, useSyncExternalStore } from "react";

export interface Toast { id: number; msg: string; kind: "ok" | "err" | "info"; }

const SERVER_TOASTS: readonly Toast[] = Object.freeze([]);
let toasts: readonly Toast[] = SERVER_TOASTS;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((listener) => listener()); }
function push(msg: string, kind: Toast["kind"] = "ok") {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, msg, kind }];
  emit();
  setTimeout(() => {
    if (!toasts.some((toast) => toast.id === id)) return;
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }, 3200);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => toasts; // Return the existing array; never map/copy here.
const getServerSnapshot = () => SERVER_TOASTS;
const toast = (message: string, kind: Toast["kind"] = "ok") => push(message, kind);
const err = (message: string) => push(message, "err");
const info = (message: string) => push(message, "info");

export function useToast() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => ({ toasts: list, toast, err, info }), [list]);
}

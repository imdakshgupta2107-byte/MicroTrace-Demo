import { DEMO_BUILD, DEMO_AUTH_KEY } from "@/demo/config";
import { readLiveAuth, subscribeLive, signOutLive } from "@/live/session";
// Device-level role/PIN convenience, not server-side authentication.
// Separate demo namespace: never overwrite sessions from the non-demo app.
import type { Role } from "./types";

export const AUTH_STORAGE_KEY = DEMO_AUTH_KEY;
const AUTH_EVENT = "mt-auth";

export interface AuthState {
  readonly role: Role | null;
  readonly unlockedAt: string | null;
}

const LOCKED_AUTH: AuthState = Object.freeze({ role: null, unlockedAt: null });
const PIN_FOR: Partial<Record<Role, string>> = {
  staff: import.meta.env.VITE_STAFF_PIN || "1111",
  teacher: import.meta.env.VITE_TEACHER_PIN || "2222",
  principal: import.meta.env.VITE_PRINCIPAL_PIN || "0000",
};

let cachedRaw: string | null | undefined;
let cachedSnapshot: AuthState = LOCKED_AUTH;
let memoryRaw: string | null = null;
let memoryOnly = false;

function isRole(value: unknown): value is Role {
  return value === "student" || value === "teacher" || value === "staff" || value === "principal";
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  if (memoryOnly) return memoryRaw;
  try {
    memoryRaw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    // A restricted WebView can block storage. Keep a stable in-memory session
    // rather than crashing or repeatedly allocating a fallback object.
    memoryOnly = true;
  }
  return memoryRaw;
}

function parseAuth(raw: string | null): AuthState {
  if (!raw) return LOCKED_AUTH;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "role" in value && isRole(value.role)) {
      return Object.freeze({
        role: value.role,
        unlockedAt: "unlockedAt" in value && typeof value.unlockedAt === "string" ? value.unlockedAt : null,
      });
    }
  } catch {
    // Corrupt/old local data fails closed without breaking the startup route.
  }
  return LOCKED_AUTH;
}

/**
 * useSyncExternalStore requires Object.is(getSnapshot(), getSnapshot()) to be
 * true while the underlying state is unchanged. Memoizing only the function
 * does NOT satisfy that contract: the returned object must also be cached.
 */
export function readAuth(): AuthState {
  if (!DEMO_BUILD) return readLiveAuth();
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSnapshot;
  const next = parseAuth(raw);
  cachedRaw = raw;
  // Even whitespace/key-order changes in storage should not trigger a render.
  if (next.role !== cachedSnapshot.role || next.unlockedAt !== cachedSnapshot.unlockedAt) {
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

/** A single immutable server snapshot; never read browser storage during SSR. */
export function readServerAuth(): AuthState {
  return LOCKED_AUTH;
}

/** Stable subscription function with matching cleanup and filtered storage events. */
export function subscribeAuth(listener: () => void): () => void {
  if (!DEMO_BUILD) return subscribeLive(listener);
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeAuth(next: AuthState): void {
  const previous = readAuth();
  if (next.role === previous.role && next.unlockedAt === previous.unlockedAt) return;
  const raw = JSON.stringify(next);
  memoryRaw = raw;
  if (typeof window !== "undefined" && !memoryOnly) {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, raw);
    } catch {
      memoryOnly = true;
    }
  }
  // Publish the new snapshot BEFORE notifying React. Readers see the same
  // immutable object throughout this update, including StrictMode checks.
  cachedRaw = raw;
  cachedSnapshot = next.role === null ? LOCKED_AUTH : Object.freeze({ ...next });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Validate a PIN without starting a session during the onboarding form. */
export function verifyPin(role: Role, pin: string): boolean {
  if (!DEMO_BUILD) return false;
  return role === "student" || Boolean(PIN_FOR[role] && pin === PIN_FOR[role]);
}

export function unlock(role: Role, pin: string): boolean {
  if (!verifyPin(role, pin)) return false;
  if (readAuth().role === role) return true;
  writeAuth({ role, unlockedAt: new Date().toISOString() });
  return true;
}

export function lock(): void {
  if (!DEMO_BUILD) { signOutLive(); return; }
  writeAuth(LOCKED_AUTH);
}

export const canManage = (role: Role | null) => role === "staff" || role === "principal";
export const canApprove = (role: Role | null) => role === "staff" || role === "principal";
export const canSchedule = (role: Role | null) => role === "teacher" || role === "principal";
export const canSeeReportsFiles = (role: Role | null) => role === "teacher" || role === "staff" || role === "principal";

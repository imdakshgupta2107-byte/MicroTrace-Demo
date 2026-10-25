import { DEMO_BUILD, DEMO_PROFILE_KEY } from "@/demo/config";
import { readLiveProfile, readLiveSession, subscribeLive } from "@/live/session";
// Local profile; retain the existing key when upgrading MicroTrace.
export interface StudentProfile { name: string; roll: string; className: string; setupDone: boolean; }
export const STUDENT_STORAGE_KEY = DEMO_PROFILE_KEY;
const PROFILE_EVENT = "mt-profile";
let cachedRaw: string | null | undefined;
let cachedProfile: StudentProfile | null = null;

export function readStudent(): StudentProfile | null {
  if (!DEMO_BUILD) return readLiveProfile();
  let raw: string | null = null;
  try {
    if (typeof window !== "undefined") raw = window.localStorage.getItem(STUDENT_STORAGE_KEY);
  } catch { /* restricted storage returns a stable null snapshot */ }
  if (raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  let next: StudentProfile | null = null;
  try {
    const value = JSON.parse(raw || "null");
    if (value && typeof value.name === "string" && value.name.trim()) {
      next = Object.freeze({
        name: value.name,
        roll: typeof value.roll === "string" ? value.roll : "",
        className: typeof value.className === "string" ? value.className : "",
        setupDone: value.setupDone !== false,
      });
    }
  } catch { /* ignore invalid profiles without preventing sign-in */ }
  if (next?.name !== cachedProfile?.name || next?.roll !== cachedProfile?.roll ||
      next?.className !== cachedProfile?.className || next?.setupDone !== cachedProfile?.setupDone) {
    cachedProfile = next;
  }
  return cachedProfile;
}

export function readServerStudent(): null { return null; }

export function subscribeStudent(listener: () => void): () => void {
  if (!DEMO_BUILD) return subscribeLive(listener);
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STUDENT_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(PROFILE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROFILE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveStudent(profile: Omit<StudentProfile, "setupDone">): void {
  if (!DEMO_BUILD) throw new Error("Live profiles and roles are managed by the principal, not a device PIN.");
  const next = { ...profile, name: profile.name.trim(), setupDone: true };
  if (!next.name) throw new Error("Your name cannot be empty.");
  try {
    window.localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Unable to save your profile. Device storage may be full or disabled.");
  }
  readStudent(); // Publish a cached snapshot before notifying subscribed components.
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

export const displayName = (): string => readStudent()?.name ?? "Guest";

/** Names are labels; only the authenticated UID establishes ownership live. */
export function isMyRecord(ownerId: string | undefined, name: string): boolean {
  return DEMO_BUILD ? name === displayName() : Boolean(ownerId && ownerId === readLiveSession().userId);
}

import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { window.localStorage.clear(); vi.resetModules(); });

describe("cached authentication external store (#185 regression)", () => {
  it("returns exactly the same locked snapshot on every read", async () => {
    const { readAuth } = await import("@/lib/auth");
    const initial = readAuth();
    for (let i = 0; i < 200; i++) expect(readAuth()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial.role).toBeNull();
  });

  it.each(["student", "teacher", "staff", "principal"])("caches an existing %s session", async (role) => {
    const { AUTH_STORAGE_KEY, readAuth } = await import("@/lib/auth");
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, unlockedAt: "2026-10-15T00:00:00.000Z" }));
    const snapshot = readAuth();
    expect(snapshot.role).toBe(role);
    for (let i = 0; i < 50; i++) expect(readAuth()).toBe(snapshot);
  });

  it("preserves reference identity for a semantically identical storage rewrite", async () => {
    const { AUTH_STORAGE_KEY, readAuth } = await import("@/lib/auth");
    localStorage.setItem(AUTH_STORAGE_KEY, '{"role":"student","unlockedAt":"saved"}');
    const snapshot = readAuth();
    localStorage.setItem(AUTH_STORAGE_KEY, '{ "unlockedAt": "saved", "role": "student" }');
    expect(readAuth()).toBe(snapshot);
  });

  it.each(["{invalid-json", "null", "[]", '{"role":"admin"}', '{"role":null}', '{"role":9}'])("fails closed and stays stable with corrupt data: %s", async (raw) => {
    const { AUTH_STORAGE_KEY, readAuth } = await import("@/lib/auth");
    localStorage.setItem(AUTH_STORAGE_KEY, raw);
    const snapshot = readAuth();
    expect(snapshot.role).toBeNull();
    expect(readAuth()).toBe(snapshot);
  });

  it.each([['staff', '1111'], ['teacher', '2222'], ['principal', '0000']] as const)("validates %s PIN without writing auth", async (role, pin) => {
    const { AUTH_STORAGE_KEY, verifyPin, readAuth } = await import("@/lib/auth");
    expect(verifyPin(role, pin)).toBe(true);
    expect(verifyPin(role, "wrong")).toBe(false);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(readAuth().role).toBeNull();
  });

  it("notifies only for real state transitions; unlock/lock are idempotent", async () => {
    const { readAuth, unlock, lock, subscribeAuth } = await import("@/lib/auth");
    const notify = vi.fn();
    const unsubscribe = subscribeAuth(notify);
    expect(unlock("staff", "wrong")).toBe(false);
    expect(notify).not.toHaveBeenCalled();
    expect(unlock("student", "")).toBe(true);
    const unlocked = readAuth();
    expect(notify).toHaveBeenCalledTimes(1);
    unlock("student", "");
    expect(readAuth()).toBe(unlocked);
    expect(notify).toHaveBeenCalledTimes(1);
    lock();
    const locked = readAuth();
    expect(notify).toHaveBeenCalledTimes(2);
    lock();
    expect(readAuth()).toBe(locked);
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    unlock("student", "");
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("filters unrelated storage events and removes both listeners", async () => {
    const { AUTH_STORAGE_KEY, subscribeAuth, readAuth } = await import("@/lib/auth");
    const notify = vi.fn();
    const unsubscribe = subscribeAuth(notify);
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(notify).not.toHaveBeenCalled();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: "teacher", unlockedAt: "saved" }));
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    expect(notify).toHaveBeenCalledTimes(1);
    expect(readAuth().role).toBe("teacher");
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    window.dispatchEvent(new Event("mt-auth"));
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("has a stable, always-locked server snapshot", async () => {
    const { unlock, readServerAuth } = await import("@/lib/auth");
    const initial = readServerAuth();
    unlock("student", "");
    expect(readServerAuth()).toBe(initial);
    expect(readServerAuth().role).toBeNull();
  });

  it("keeps a stable in-memory session if reading storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    const { readAuth, unlock, lock } = await import("@/lib/auth");
    const locked = readAuth();
    expect(readAuth()).toBe(locked);
    expect(unlock("student", "")).toBe(true);
    const unlocked = readAuth();
    expect(unlocked.role).toBe("student");
    expect(readAuth()).toBe(unlocked);
    lock();
    expect(readAuth()).toBe(locked);
  });

  it("does not revert a session when writing storage throws", async () => {
    const { readAuth, unlock } = await import("@/lib/auth");
    readAuth();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(unlock("staff", "1111")).toBe(true);
    const snapshot = readAuth();
    expect(snapshot.role).toBe("staff");
    expect(readAuth()).toBe(snapshot);
  });
});

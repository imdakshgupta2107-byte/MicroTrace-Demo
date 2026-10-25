import { StrictMode, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { AUTH_STORAGE_KEY, lock, unlock } from "@/lib/auth";
import { readStudent, saveStudent } from "@/lib/student";

const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe("external store hooks in React StrictMode", () => {
  it("renders without an uncached-getSnapshot loop and keeps stable actions/results", () => {
    lock();
    let renders = 0;
    const { result } = renderHook(() => { renders++; return useAuth(); }, { wrapper });
    const initial = result.current;
    const initialRenders = renders;
    act(() => {
      for (let i = 0; i < 50; i++) window.dispatchEvent(new Event("mt-auth"));
    });
    expect(renders).toBe(initialRenders);
    expect(result.current).toBe(initial);
    act(() => { unlock("student", ""); });
    expect(result.current.role).toBe("student");
    expect(result.current.unlock).toBe(initial.unlock);
    expect(result.current.lock).toBe(initial.lock);
    expect(renders).toBeLessThan(10);
    act(() => { lock(); });
    expect(result.current.role).toBeNull();
  });

  it("updates a subscribed hook when another tab changes the role", () => {
    lock();
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: "principal", unlockedAt: "saved" }));
      window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    });
    expect(result.current.role).toBe("principal");
  });

  it("keeps profile snapshots stable and reacts to profile saves", () => {
    const { result } = renderHook(() => useStudent(), { wrapper });
    expect(result.current.profile).toBeNull();
    act(() => { saveStudent({ name: "Anaya", roll: "1", className: "SY B" }); });
    const profile = readStudent();
    expect(readStudent()).toBe(profile);
    expect(result.current.profile).toBe(profile);
    const hook = result.current;
    act(() => { saveStudent({ name: "Anaya", roll: "1", className: "SY B" }); });
    expect(result.current).toBe(hook);
    expect(result.current.profile?.name).toBe("Anaya");
  });
});

import { useMemo, useSyncExternalStore } from "react";
import { lock, readAuth, readServerAuth, subscribeAuth, unlock } from "@/lib/auth";
import type { Role } from "@/lib/types";

export interface UseAuthResult {
  role: Role | null;
  isUnlocked: boolean;
  unlock: (role: Role, pin: string) => boolean;
  lock: () => void;
}

export function useAuth(): UseAuthResult {
  const auth = useSyncExternalStore(subscribeAuth, readAuth, readServerAuth);
  // The store owns snapshot identity; the hook also exposes stable actions and
  // a stable result object while that snapshot is unchanged.
  return useMemo(() => ({
    role: auth.role,
    isUnlocked: auth.role !== null,
    unlock,
    lock,
  }), [auth]);
}

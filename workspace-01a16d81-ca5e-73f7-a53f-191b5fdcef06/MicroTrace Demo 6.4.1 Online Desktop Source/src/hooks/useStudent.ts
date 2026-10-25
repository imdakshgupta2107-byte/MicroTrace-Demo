import { useMemo, useSyncExternalStore } from "react";
import { readServerStudent, readStudent, saveStudent, subscribeStudent } from "@/lib/student";

export function useStudent() {
  const profile = useSyncExternalStore(subscribeStudent, readStudent, readServerStudent);
  return useMemo(() => ({ profile, save: saveStudent }), [profile]);
}

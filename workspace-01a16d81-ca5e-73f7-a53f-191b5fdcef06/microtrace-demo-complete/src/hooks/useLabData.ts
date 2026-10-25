// useLabData — main React Query hook: whole-lab snapshot + realtime
// invalidation + typed mutations.
import { DEMO_BUILD } from "@/demo/config";
import { readLiveSession } from "@/live/session";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLabData, insert, update, del, audit, type TableName } from "@/lib/db";
import { subscribeAll } from "@/lib/realtime";
import { displayName } from "@/lib/student";
import type { LabData } from "@/lib/types";

export const LAB_KEY = ["lab-data"];

export function useLabData() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const queryKey = DEMO_BUILD ? LAB_KEY : [...LAB_KEY, "live", readLiveSession().userId, role];
  const query = useQuery<LabData>({ queryKey, queryFn: fetchLabData, staleTime: 5_000, enabled: DEMO_BUILD || Boolean(role) });

  useEffect(() => subscribeAll(() => qc.invalidateQueries({ queryKey: LAB_KEY })), [qc]);

  const mutateRow = useMutation({
    mutationFn: async (op:
      | { kind: "insert"; table: TableName; row: Record<string, unknown>; audit?: string }
      | { kind: "update"; table: TableName; id: string | number; patch: Record<string, unknown>; audit?: string }
      | { kind: "delete"; table: TableName; id: string | number; audit?: string }) => {
      let result: unknown = null;
      if (op.kind === "insert") result = await insert(op.table, op.row);
      if (op.kind === "update") { await update(op.table, op.id, op.patch); result = { id: op.id, ...op.patch }; }
      if (op.kind === "delete") await del(op.table, op.id);
      if (op.audit) await audit(displayName(), op.audit, op.table, String((result as { id?: unknown })?.id ?? ""));
      return result;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: LAB_KEY }),
  });

  return { ...query, mutate: mutateRow.mutateAsync, pending: mutateRow.isPending };
}

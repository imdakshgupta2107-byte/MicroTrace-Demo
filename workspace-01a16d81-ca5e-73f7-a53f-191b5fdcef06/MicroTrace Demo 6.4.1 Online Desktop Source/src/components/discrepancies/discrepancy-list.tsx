import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
// discrepancy-list — who reported, kind, status; staff/principal approve & write off.
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import { fmtDate, fmtNum } from "@/lib/format";
import type { DiscrepancyStatus, Role } from "@/lib/types";
import { DiscrepancyForm } from "./discrepancy-form";

const TONE: Record<DiscrepancyStatus, "amber" | "green" | "red"> = { reported: "amber", "written-off": "green", declined: "red" };
export type DiscrepancyFilter = DiscrepancyStatus | "all";

export function DiscrepancyList({ role, status = "all" }: { role: Role | null; status?: DiscrepancyFilter }) {
  const { data, mutate, pending } = useLabData();
  const { toast, err } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const working = useRef(false);
  const canDecide = role === "staff" || role === "principal";
  const allDiscrepancies = data?.discrepancies ?? [];
  const ds = status === "all" ? allDiscrepancies : allDiscrepancies.filter((row) => row.status === status);

  const resolve = async (id: string, status: DiscrepancyStatus) => {
    const d = ds.find((x) => x.id === id);
    if (working.current || !canDecide || !d || d.status !== "reported") return;
    working.current = true;
    try {
      if (supabase) {
        const result=await supabase.rpc("resolve_discrepancy",{p_id:id,p_decision:status});
        if(result.error)throw new Error(result.error.message);
        await qc.invalidateQueries({queryKey:["lab-data"]});
        toast(status==="written-off"?"Written off atomically; stock updated.":"Report declined.");
        return;
      }
      if (status === "written-off" && d) {
        // deduct stock FIFO
        let remain = d.qty_lost;
        const fifo = (data?.containers ?? [])
          .filter((c) => c.chemical_id === d.chemical_id && c.state !== "disposed" && c.qty > 0)
          .sort((a, b) => (a.expiry ?? "9999") < (b.expiry ?? "9999") ? -1 : 1);
        if (fifo.reduce((sum, container) => sum + container.qty, 0) + 0.0001 < remain) {
          throw new Error("Available stock is lower than this loss. Review the count before approving.");
        }
        for (const c of fifo) {
          if (remain <= 0) break;
          const take = Math.min(remain, c.qty);
          await mutate({ kind: "update", table: "containers", id: c.id, patch: { qty: +(c.qty - take).toFixed(4), state: c.qty - take <= 0 ? "depleted" : c.state } });
          remain -= take;
        }
      }
      await mutate({
        kind: "update", table: "discrepancies", id,
        patch: { status, decided_by: displayName(), resolved_at: new Date().toISOString() },
        audit: `Discrepancy ${status}`,
      });
      toast(status === "written-off" ? "Written off and stock adjusted." : "Declined.", status === "declined" ? "info" : "ok");
    } catch (e) { err(String(e)); } finally { working.current = false; }
  };

  return (
    <div id="discrepancy-register" className="space-y-4" tabIndex={-1}>
      <div className="flex justify-end">
        <Button variant="danger" onClick={() => setFormOpen(true)}><Plus size={15} /> Record verified loss</Button>
      </div>
      {ds.length === 0 ? (
        <EmptyState title="No discrepancies" hint="Breakage, waste or count issues you report will show here and in the audit trail." />
      ) : (
        <div className="space-y-2.5">
          {ds.map((d) => {
            const chem = data?.chemicals.find((c) => c.id === d.chemical_id);
            return (
              <div key={d.id} data-discrepancy-id={d.id} className="min-w-0 bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-bold text-[13.5px] text-ink min-w-0 flex-1 basis-48 break-words">
                    {d.kind.replace("-", " ")} — {fmtNum(d.qty_lost)} {chem?.unit}{" "}
                    <span className="text-slate-500 font-semibold">{chem?.name}</span>{" "}
                    <Badge tone={TONE[d.status]}>{d.status}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">{fmtDate(d.created_at)}</span>
                </div>
                <div className="text-[12px] text-slate-600">{d.reason}</div>
                <div className="text-[11px] text-slate-400">reported by {d.reported_by}{d.decided_by ? ` · decided by ${d.decided_by}` : ""}</div>
                {canDecide && d.status === "reported" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="green" disabled={pending} onClick={() => resolve(d.id, "written-off")}>Approve & write off</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => resolve(d.id, "declined")}>Decline</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {formOpen && <DiscrepancyForm open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

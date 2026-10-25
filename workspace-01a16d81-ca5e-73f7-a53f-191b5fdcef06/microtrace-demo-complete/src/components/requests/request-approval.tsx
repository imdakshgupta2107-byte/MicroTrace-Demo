import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
// request-approval — staff/principal action buttons for a request row.
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, X } from "lucide-react";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { usableChemicalStock } from "@/lib/procurement";
import { expiryState } from "@/lib/expiry";
import { displayName } from "@/lib/student";
import { addDays } from "@/lib/format";
import type { LabRequest } from "@/lib/types";

export function RequestApproval({ req }: { req: LabRequest }) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const qc = useQueryClient();
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const chem = data.chemicals.find((c) => c.id === req.chemical_id);
  if (!chem) return null;
  const stock = usableChemicalStock(chem, data.containers);
  const isInstrument = chem.category === "Instrument" || chem.category === "Glassware";

  const act = async (kind: "issue" | "reject" | "return") => {
    if (working.current) return; working.current=true; setBusy(true);
    try {
      if (supabase) {
        const result = await supabase.rpc("request_action", { p_id: req.id, p_action: kind });
        if (result.error) throw new Error(result.error.message);
        await qc.invalidateQueries({queryKey:["lab-data"]});
        toast(kind === "issue" ? "Request issued atomically." : kind === "return" ? "Returned and restocked." : "Request rejected.");
        return;
      }
      if (kind === "issue") {
        if (req.qty > stock) return err(`Only ${stock} ${chem.unit} left — cannot issue ${req.qty}.`);
        // pull from containers FIFO (earliest expiry first)
        let remain = req.qty;
        const fifo = data.containers
          .filter((c) => c.chemical_id === chem.id && c.state !== "disposed" && c.state !== "depleted" && c.state !== "quarantined" && c.qty > 0 && expiryState(c).state !== "expired")
          .sort((a, b) => (a.expiry ?? "9999") < (b.expiry ?? "9999") ? -1 : 1);
        for (const ctl of fifo) {
          if (remain <= 0) break;
          const take = Math.min(remain, ctl.qty);
          await mutate({ kind: "update", table: "containers", id: ctl.id, patch: { qty: +(ctl.qty - take).toFixed(4), state: ctl.qty - take <= 0 ? "depleted" : ctl.state } });
          remain -= take;
        }
        await mutate({
          kind: "update", table: "requests", id: req.id,
          patch: { status: "issued", decided_by: displayName(), issued_at: new Date().toISOString(), return_due: isInstrument ? addDays(7) : null },
          audit: `Issued ${req.qty} ${chem.unit} ${chem.name} to ${req.requester}`,
        });
        toast(`Issued ${req.qty} ${chem.unit} ${chem.name}.`);
      }
      if (kind === "reject") {
        await mutate({ kind: "update", table: "requests", id: req.id, patch: { status: "rejected", decided_by: displayName() }, audit: `Rejected request: ${chem.name}` });
        toast("Request rejected.", "info");
      }
      if (kind === "return") {
        // put the qty back into the first live container
        const target = data.containers.find((c) => c.chemical_id === chem.id && c.state !== "disposed");
        if (target) await mutate({ kind: "update", table: "containers", id: target.id, patch: { qty: +(target.qty + req.qty).toFixed(4), state: "opened" } });
        await mutate({ kind: "update", table: "requests", id: req.id, patch: { status: "returned", returned_at: new Date().toISOString() }, audit: `Marked returned: ${chem.name}` });
        toast("Restocked and marked returned.");
      }
    } catch (e) { err(String(e)); } finally { working.current=false; setBusy(false); }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {req.status === "pending" && (
        <>
          <Button disabled={busy} variant="green" size="sm" onClick={() => act("issue")}><Check size={13} /> Approve & issue</Button>
          <Button disabled={busy} variant="danger" size="sm" onClick={() => act("reject")}><X size={13} /> Reject</Button>
        </>
      )}
      {req.status === "issued" && isInstrument && (
        <Button disabled={busy} size="sm" onClick={() => act("return")}><RotateCcw size={13} /> Mark returned</Button>
      )}
    </div>
  );
}

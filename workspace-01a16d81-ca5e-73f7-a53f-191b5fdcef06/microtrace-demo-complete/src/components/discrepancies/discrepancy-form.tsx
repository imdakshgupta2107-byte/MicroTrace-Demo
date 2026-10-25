// discrepancy-form — report breakage / waste / contamination / count mismatch (write-off).
import { useMemo, useRef, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import type { DiscrepancyKind } from "@/lib/types";

const KINDS: { id: DiscrepancyKind; label: string }[] = [
  { id: "breakage", label: "Breakage" }, { id: "waste", label: "Waste" },
  { id: "contamination", label: "Contamination" }, { id: "count-mismatch", label: "Count mismatch" },
];

export function DiscrepancyForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, mutate, pending } = useLabData();
  const { toast, err } = useToast();
  const saving = useRef(false);
  const [chemId, setChemId] = useState("");
  const [kind, setKind] = useState<DiscrepancyKind>("breakage");
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");
  const chem = useMemo(() => data?.chemicals.find((c) => c.id === chemId), [data, chemId]);

  const save = async () => {
    if (saving.current) return;
    if (!chem) return err("Pick an inventory item.");
    if (!Number.isFinite(qty) || !(qty > 0)) return err("Quantity lost must be positive.");
    if (!reason.trim()) return err("Add a short reason.");
    saving.current = true;
    try {
      await mutate({
        kind: "insert", table: "discrepancies",
        row: {
          container_id: null, chemical_id: chemId, kind, qty_lost: qty,
          reason: reason.trim(), reported_by: displayName(),
          status: "reported", decided_by: null, resolved_at: null,
        },
        audit: `Discrepancy (${kind}): ${qty} ${chem.unit} ${chem.name}`,
      });
      toast("Reported — staff/principal will approve the write-off.");
      setChemId(""); setQty(0); setReason("");
      onClose();
    } catch (e) { err(String(e)); } finally { saving.current = false; }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Record a verified loss" onClose={onClose}
        sub="Use after physical review. For a new observation, submit a Lab Desk issue report first." />
      <DialogBody>
        <div className="space-y-1">
          <label htmlFor="loss-item" className="text-[11.5px] font-bold text-slate-600">Inventory item</label>
          <Select id="loss-item" value={chemId} onChange={(e) => setChemId(e.target.value)} className="w-full">
            <option value="">— pick —</option>
            {(data?.chemicals ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="loss-kind" className="text-[11.5px] font-bold text-slate-600">Kind</label>
            <Select id="loss-kind" value={kind} onChange={(e) => setKind(e.target.value as DiscrepancyKind)}>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="loss-qty" className="text-[11.5px] font-bold text-slate-600">Qty lost ({chem?.unit ?? "units"})</label>
            <Input id="loss-qty" type="number" min={0.1} step="any" value={qty || ""} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="loss-reason" className="text-[11.5px] font-bold text-slate-600">Reason</label>
          <Textarea id="loss-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="What happened, when, who else saw it…" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" disabled={pending} onClick={save}>Submit report</Button>
      </DialogFooter>
    </Dialog>
  );
}

// request-form — student/teacher asks for a chemical (qty + purpose; NO date field).
import { useMemo, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { usableChemicalStock } from "@/lib/procurement";
import { displayName } from "@/lib/student";
import { deviceTag } from "@/lib/supabase";
import type { Chemical, Role } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { CategoryBadge } from "@/components/chemicals/category-badge";

export function RequestForm({ open, onClose, prefill, role }: {
  open: boolean; onClose: () => void; prefill?: Chemical | null; role: Role;
}) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [chemId, setChemId] = useState<string>(prefill?.id ?? "");
  const [qty, setQty] = useState(1);
  const [purpose, setPurpose] = useState("");

  const inStock = useMemo(() => (data?.chemicals ?? [])
    .map((c) => ({ c, stock: usableChemicalStock(c, data?.containers ?? []) }))
    .filter((x) => x.stock > 0)
    .sort((a, b) => a.c.name.localeCompare(b.c.name)), [data]);

  const chem = inStock.find((x) => x.c.id === chemId) ?? (prefill ? { c: prefill, stock: usableChemicalStock(prefill, data?.containers ?? []) } : null);

  const submit = async () => {
    if (!chem) return err("Pick a chemical.");
    if (!(qty > 0)) return err("Quantity must be greater than zero.");
    if (qty > chem.stock) return err(`Only ${fmtNum(chem.stock)} ${chem.c.unit} available.`);
    if (!purpose.trim()) return err("Add a short purpose.");
    try {
      await mutate({
        kind: "insert", table: "requests",
        row: {
          chemical_id: chem.c.id, container_id: null, qty, purpose: purpose.trim(),
          requester: displayName(), requester_role: role, status: "pending",
          decided_by: null, note: null, requested_at: new Date().toISOString(),
          issued_at: null, return_due: null, returned_at: null, created_by_device: deviceTag(),
        },
        audit: `Requested ${qty} ${chem.c.unit} ${chem.c.name}`,
      });
      toast("Request sent to lab staff.");
      setPurpose(""); setQty(1); if (!prefill) setChemId("");
      onClose();
    } catch (e) { err(String(e)); }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Request an item" onClose={onClose}
        sub="Staff approve and issue from stock; returnables are tracked for return." />
      <DialogBody>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Chemical / item</label>
          {prefill ? (
            <div className="rounded-xl bg-navy-50 px-3 py-2 text-[13px] font-bold">{prefill.name}</div>
          ) : (
            <Select value={chemId} onChange={(e) => setChemId(e.target.value)} className="w-full">
              <option value="">— pick one —</option>
              {inStock.map(({ c, stock }) => (
                <option key={c.id} value={c.id}>{c.name} — {fmtNum(stock)} {c.unit} available</option>
              ))}
            </Select>
          )}
          {chem && <CategoryBadge category={chemicalInventoryCategory(chem.c)} className="mt-1.5" />}
        </div>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Quantity ({chem?.c.unit ?? "units"})</label>
          <Input type="number" min={0.1} step="any" value={qty} onChange={(e) => setQty(parseFloat(e.target.value))} />
          {chem && qty > chem.stock && <div className="text-[11.5px] text-red-700 font-semibold">Exceeds the {fmtNum(chem.stock)} {chem.c.unit} in stock.</div>}
        </div>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Purpose</label>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Gram staining practical, batch A" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="gold" onClick={submit}>Submit request</Button>
      </DialogFooter>
    </Dialog>
  );
}

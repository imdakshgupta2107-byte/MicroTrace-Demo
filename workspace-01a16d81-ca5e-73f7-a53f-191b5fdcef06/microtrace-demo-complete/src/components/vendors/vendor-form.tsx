import { useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import type { Vendor } from "@/lib/types";

export function VendorForm({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Vendor | null }) {
  const { mutate } = useLabData();
  const { toast, err } = useToast();
  const [f, setF] = useState<Omit<Vendor, "id">>(() => edit ? { ...edit } : { name: "", phone: "", email: "", address: "", notes: "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) return err("Vendor name is required.");
    try {
      if (edit) await mutate({ kind: "update", table: "vendors", id: edit.id, patch: f, audit: "Edited vendor " + f.name });
      else await mutate({ kind: "insert", table: "vendors", row: { ...f, name: f.name.trim() }, audit: "Added vendor " + f.name });
      toast(edit ? "Vendor updated." : "Vendor added."); onClose();
    } catch (e) { err(String(e)); }
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title={edit ? "Edit vendor" : "Add vendor"} onClose={onClose} />
      <DialogBody>
        <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Name *</label>
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. HiMedia Labs" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Phone</label>
            <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" /></div>
          <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Email</label>
            <Input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sales@…" /></div>
        </div>
        <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Address</label>
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="City, state" /></div>
        <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Notes</label>
          <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="GST no., terms…" /></div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>{edit ? "Save" : "Add vendor"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

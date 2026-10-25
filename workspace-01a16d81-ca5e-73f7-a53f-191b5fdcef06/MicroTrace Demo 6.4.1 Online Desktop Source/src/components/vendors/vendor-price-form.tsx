// vendor-price-form — record one quoted price for a chemical from a vendor.
import { useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { todayISO } from "@/lib/format";
import type { Chemical, Vendor } from "@/lib/types";

export function VendorPriceForm({ open, onClose, preChem, preVendor }: {
  open: boolean; onClose: () => void; preChem?: Chemical | null; preVendor?: Vendor | null;
}) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [chemId, setChemId] = useState(preChem?.id ?? "");
  const [vendorId, setVendorId] = useState(preVendor?.id ?? "");
  const [price, setPrice] = useState<number>(0);
  const [packQty, setPackQty] = useState<number>(500);
  const [packUnit, setPackUnit] = useState("mL");
  const save = async () => {
    const chem = data?.chemicals.find((c) => c.id === chemId);
    if (!chem) return err("Pick a chemical.");
    if (!vendorId) return err("Pick a vendor.");
    if (!(price > 0)) return err("Price must be greater than zero.");
    if (!(packQty > 0)) return err("Pack size must be positive.");
    try {
      await mutate({
        kind: "insert", table: "vendor_prices",
        row: {
          chemical_id: chemId, vendor_id: vendorId, price_inr: price,
          pack_label: `${packQty} ${packUnit || chem.unit}`,
          pack_size: packQty, // in chemical unit
          updated_at: todayISO(),
        },
        audit: `Price: ${chem.name} @ ₹${price}/${packQty}${packUnit}`,
      });
      toast("Price saved — comparison updated."); onClose();
    } catch (e) { err(String(e)); }
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Add vendor price" onClose={onClose} sub="Used for cross-seller comparison and purchase advice." />
      <DialogBody>
        <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Chemical</label>
          <Select value={chemId} onChange={(e) => setChemId(e.target.value)} className="w-full" disabled={!!preChem}>
            <option value="">— pick —</option>
            {(data?.chemicals ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select></div>
        <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Vendor</label>
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full" disabled={!!preVendor}>
            <option value="">— pick —</option>
            {(data?.vendors ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Price ₹</label>
            <Input type="number" min={0} step="any" value={price || ""} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} placeholder="450" /></div>
          <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Pack qty</label>
            <Input type="number" min={0} step="any" value={packQty} onChange={(e) => setPackQty(parseFloat(e.target.value) || 0)} /></div>
          <div className="space-y-1"><label className="text-[11.5px] font-bold text-slate-600">Pack unit</label>
            <Input value={packUnit} onChange={(e) => setPackUnit(e.target.value)} placeholder="mL / g / pcs" /></div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save price</Button>
      </DialogFooter>
    </Dialog>
  );
}

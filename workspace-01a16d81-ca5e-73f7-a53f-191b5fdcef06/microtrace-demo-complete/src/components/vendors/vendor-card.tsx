import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Phone, Mail } from "lucide-react";
import { fmtINR } from "@/lib/format";
import type { Chemical, Vendor, VendorPrice } from "@/lib/types";

export function VendorCard({ vendor, prices, chemicals, onEdit, onAddPrice }: {
  vendor: Vendor; prices: VendorPrice[]; chemicals: Chemical[];
  onEdit: () => void; onAddPrice: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mine = prices.filter((p) => p.vendor_id === vendor.id);
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button className="font-bold text-[14px] text-ink hover:text-navy-700" onClick={() => setOpen(!open)}>{vendor.name}</button>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-slate-500 mt-0.5">
            {vendor.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{vendor.phone}</span>}
            {vendor.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{vendor.email}</span>}
            {mine.length > 0 && <span>{mine.length} price{mine.length === 1 ? "" : "s"} quoted</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={onAddPrice}><Plus size={13} /> Price</Button>
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil size={13} /></Button>
        </div>
      </div>
      {open && (
        <ul className="space-y-1 pt-1">
          {mine.length === 0 && <li className="text-[12px] text-slate-500">No prices quoted yet.</li>}
          {mine.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px]">
              <span className="font-semibold text-ink">{chemicals.find((c) => c.id === p.chemical_id)?.name ?? "(removed)"}</span>
              <span className="flex items-center gap-2">
                <b>{fmtINR(p.price_inr)}</b> <Badge tone="gray">{p.pack_label}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

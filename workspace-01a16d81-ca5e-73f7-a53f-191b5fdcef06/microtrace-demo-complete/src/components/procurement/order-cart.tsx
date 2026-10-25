// order-cart — basket of picks (chem × vendor) grouped by slot, before raising POs.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, FileDown } from "lucide-react";
import { fmtINR, fmtNum } from "@/lib/format";
import type { SlotCode, VendorPrice, Chemical, Vendor } from "@/lib/types";
import { SlotBadge } from "./slot-badges";

export interface CartItem {
  chemical: Chemical;
  price: VendorPrice & { vendor_name: string; per_unit: number };
  packs: number;
  slot: SlotCode;
}

export function OrderCart({ items, vendors, onPacks, onRemove, onRaise, busy }: {
  items: CartItem[]; vendors: Vendor[];
  onPacks: (idx: number, packs: number) => void;
  onRemove: (idx: number) => void;
  onRaise: (slot: SlotCode, group: CartItem[]) => void;
  busy: boolean;
}) {
  void vendors;
  const groups: Partial<Record<SlotCode, CartItem[]>> = {};
  items.forEach((it) => { (groups[it.slot] ??= []).push(it); });
  const slots: SlotCode[] = ["weekly", "monthly", "yearly"];
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-3">
      <div className="font-bold text-[13.5px] text-ink">Order cart <Badge tone="gold">{items.length}</Badge></div>
      {items.length === 0 && <div className="text-[12.5px] text-slate-500">Pick a vendor price from the alerts to build a purchase order.</div>}
      {slots.filter((s) => groups[s]?.length).map((slot) => {
        const group = groups[slot]!;
        const total = group.reduce((s, it) => s + it.packs * it.price.price_inr, 0);
        return (
          <div key={slot} className="space-y-2">
            <div className="flex items-center justify-between">
              <SlotBadge slot={slot} />
              <span className="text-[12px] font-bold text-ink">{fmtINR(total)}</span>
            </div>
            <ul className="space-y-1.5">
              {group.map((it) => {
                const idx = items.indexOf(it);
                const covered = it.packs * it.price.pack_size;
                return (
                  <li key={idx} className="rounded-xl bg-slate-50 px-2.5 py-2 text-[12px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink truncate">{it.chemical.name}</span>
                      <button className="text-slate-400 hover:text-red-600" onClick={() => onRemove(idx)} aria-label="remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-slate-500 text-[11px]">
                      <span>{it.price.vendor_name} · {it.price.pack_label} @ {fmtINR(it.price.price_inr)}</span>
                      <span className="whitespace-nowrap">covers {fmtNum(covered)} {it.chemical.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Packs</span>
                      <input type="number" min={1} value={it.packs}
                        onChange={(e) => onPacks(idx, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
                      <span className="flex-1" />
                      <b className="text-[12px]">{fmtINR(it.packs * it.price.price_inr)}</b>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => onRaise(slot, group)}>
              <FileDown size={14} /> Raise {slot} PO + .docx
            </Button>
          </div>
        );
      })}
      {items.length > 0 && <><Separator />
        <div className="text-[11px] text-slate-400">POs are saved to the register and downloaded as a real .docx you can print or share.</div></>}
    </div>
  );
}

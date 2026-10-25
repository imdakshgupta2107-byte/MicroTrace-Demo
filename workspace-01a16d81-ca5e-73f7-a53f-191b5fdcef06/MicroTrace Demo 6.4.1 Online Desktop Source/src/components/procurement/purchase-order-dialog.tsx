// purchase-order-dialog — confirm + create purchase_order rows, then download the .docx.
import { useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import { fmtINR, todayISO } from "@/lib/format";
import type { SlotCode } from "@/lib/types";
import type { CartItem } from "./order-cart";
import type { PoLine } from "./po-export";
import { savePoDocx } from "./po-export";

export function PurchaseOrderDialog({ slot, group, onDone, onClose }: {
  slot: SlotCode | null; group: CartItem[];
  onDone: () => void; onClose: () => void;
}) {
  const { mutate } = useLabData();
  const { toast, err } = useToast();
  const [busy, setBusy] = useState(false);
  if (!slot) return null;
  const total = group.reduce((s, it) => s + it.packs * it.price.price_inr, 0);

  const raise = async () => {
    setBusy(true);
    try {
      const lines: PoLine[] = [];
      for (const it of group) {
        const row = {
          chemical_id: it.chemical.id, vendor_id: it.price.vendor_id,
          packs: it.packs, pack_size: it.price.pack_size,
          unit_price: it.price.price_inr,
          total_inr: it.packs * it.price.price_inr,
          status: "ordered" as const,
          created_by: displayName(),
          ordered_at: new Date().toISOString(),
          received_at: null,
        };
        const saved = await mutate({ kind: "insert", table: "purchase_orders", row, audit: `PO: ${it.packs}× ${it.chemical.name}` });
        lines.push({ po: { ...(row as object), id: (saved as { id?: string })?.id ?? "" } as PoLine["po"], chem: it.chemical, vendor: null });
      }
      const ref = await savePoDocx(lines, slot, displayName());
      toast(`PO ${ref} — ${group.length} item(s), .docx downloaded.`);
      onDone(); onClose();
    } catch (e) { err("Couldn't raise the PO: " + String(e)); }
    setBusy(false);
  };

  return (
    <Dialog open={!!slot} onClose={onClose}>
      <DialogHeader title={`Raise ${slot} purchase order`} onClose={onClose}
        sub="Creates register entries and downloads a real .docx for signature." />
      <DialogBody>
        <ul className="space-y-1.5">
          {group.map((it, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[12.5px]">
              <span className="font-semibold text-ink">{it.packs} × {it.chemical.name}
                <span className="text-slate-400 font-normal"> ({it.price.vendor_name})</span></span>
              <b>{fmtINR(it.packs * it.price.price_inr)}</b>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-[13px] font-extrabold px-1">
          <span>Total</span><span>{fmtINR(total)}</span>
        </div>
        <p className="text-[11.5px] text-slate-500">Date: {todayISO()} · Raised by: {displayName()}</p>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="gold" onClick={raise} disabled={busy}>{busy ? "Raising…" : "Raise & download .docx"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

// chemical-detail-sheet — right drawer: stock, containers, safety, prices, actions.
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { fmtNum, fmtINR } from "@/lib/format";
import { chemicalStock, priceComparisons } from "@/lib/procurement";
import type { Chemical, Container, Vendor, VendorPrice } from "@/lib/types";
import { StockIndicator } from "./stock-indicator";
import { SafetyProfile } from "./safety-profile";
import { CategoryBadge } from "./category-badge";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { ContainerTypeBadge } from "@/components/containers/container-type-badge";
import { containerTypeFromLabel, getContainerColor } from "@/lib/category-colors";

export function ChemicalDetailSheet({ chemical, containers, prices, vendors, onClose, onEdit, onRequest, onAddContainer, canManage }: {
  chemical: Chemical | null; containers: Container[]; prices: VendorPrice[]; vendors: Vendor[];
  onClose: () => void; onEdit?: () => void; onRequest?: () => void; onAddContainer?: () => void; canManage: boolean;
}) {
  const [tab, setTab] = useState("stock");
  const mine = useMemo(() => !chemical ? [] : containers.filter((c) => c.chemical_id === chemical.id && c.state !== "disposed"),
    [chemical, containers]);
  const comps = useMemo(() => !chemical ? [] : priceComparisons(chemical, prices, vendors), [chemical, prices, vendors]);

  return (
    <Sheet open={!!chemical} onClose={onClose}>
      {chemical && (
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-lg text-ink leading-tight">{chemical.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <CategoryBadge category={chemicalInventoryCategory(chemical)} />
                <Badge tone="gray">{chemical.supplier || "—"}</Badge>
                {chemical.pubchem_cid && <Badge tone="blue">PubChem {chemical.pubchem_cid}</Badge>}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 rounded-lg inline-flex justify-center items-center text-slate-400 hover:bg-slate-100 hover:text-ink text-xl leading-none">×</button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <div className="text-xl font-extrabold">{fmtNum(chemicalStock(chemical, containers))}</div>
              <div className="text-[10.5px] text-slate-500">{chemical.unit} total</div>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <div className="text-xl font-extrabold">{mine.length}</div>
              <div className="text-[10.5px] text-slate-500">containers</div>
            </div>
            <div className="rounded-xl bg-navy-50 p-3 text-center">
              <div className="text-xl font-extrabold">{comps.length ? fmtINR(comps[0].per_unit, 2) : "—"}</div>
              <div className="text-[10.5px] text-slate-500">best ₹/{chemical.unit}</div>
            </div>
          </div>

          <Tabs value={tab} onChange={setTab} items={[
            { id: "stock", label: "Stock" },
            { id: "safety", label: "Safety" },
            { id: "prices", label: "Prices" },
          ]} />

          {tab === "stock" && (
            <div className="space-y-2.5">
              <StockIndicator chemical={chemical} containers={containers} />
              {mine.length === 0 && <div className="text-[12.5px] text-slate-500">No live containers — add one to start stocking.</div>}
              <ul className="space-y-1.5">
                {mine.map((c) => {
                  const vesselType = c.container_type ?? containerTypeFromLabel(c.label);
                  const vesselTheme = getContainerColor(vesselType);
                  return (
                    <li key={c.id} className={`rounded-xl border border-slate-200 border-l-4 ${vesselTheme.accentBorder} px-3 py-2 text-[12.5px] flex items-center justify-between gap-2`}>
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{c.label || "Container"}</div>
                        <div className="mt-1"><ContainerTypeBadge type={vesselType} /></div>
                        <div className="mt-1 text-slate-500 text-[11px]">{c.location}{c.expiry ? ` · exp ${c.expiry}` : ""}{c.barcode ? " · ⌗" + c.barcode : ""}</div>
                      </div>
                      <Badge tone={c.qty <= 0 ? "red" : "green"}>{fmtNum(c.qty)} {chemical.unit}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {tab === "safety" && <SafetyProfile chemical={chemical} />}
          {tab === "prices" && (
            <div className="space-y-1.5">
              {comps.length === 0 && <div className="text-[12.5px] text-slate-500">No vendor prices recorded yet (Vendors page).</div>}
              {comps.map((c) => (
                <div key={c.id} className={`rounded-xl border px-3 py-2 text-[12.5px] ${c.is_best ? "border-gold bg-gold-100/50" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <b>{c.vendor_name}</b>
                    <b>{fmtINR(c.price_inr)} <span className="text-slate-500 font-semibold">/ {c.pack_label}</span></b>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {fmtINR(c.per_unit, 2)} per {chemical.unit} {c.is_best && "· best"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />
          <div className="flex flex-wrap gap-2">
            {onRequest && <Button variant="gold" onClick={onRequest}>Request this</Button>}
            {canManage && onAddContainer && <Button variant="primary" onClick={onAddContainer}>Add container</Button>}
            {canManage && onEdit && <Button onClick={onEdit}>Edit master</Button>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

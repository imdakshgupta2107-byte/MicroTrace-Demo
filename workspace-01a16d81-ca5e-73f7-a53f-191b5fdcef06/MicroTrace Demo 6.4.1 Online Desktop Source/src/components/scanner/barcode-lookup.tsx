// barcode-lookup — match a scanned code to a container, then show stock + actions.
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { barcodeKey, parseBarcode } from "@/lib/barcode";
import { fmtNum, fmtDate } from "@/lib/format";
import { chemicalStock } from "@/lib/procurement";
import type { Chemical, Container, LabData, Role } from "@/lib/types";

export interface BarcodeLookupResult {
  raw: string;
  container: Container | null;
  chemical: Chemical | null;
}

export function lookupBarcode(data: LabData, raw: string): BarcodeLookupResult {
  const key = barcodeKey(parseBarcode(raw)).toLowerCase();
  const rawLow = raw.toLowerCase();
  const container = data.containers.find((c) =>
    c.barcode && (c.barcode.toLowerCase() === key || c.barcode.toLowerCase() === rawLow || c.barcode.toLowerCase().includes(key))
  ) ?? null;
  return { raw, container, chemical: container ? data.chemicals.find((c) => c.id === container.chemical_id) ?? null : null };
}

export function BarcodeLookup({ result, data, role, onRequest, onRestock, onOpenChemical }: {
  result: BarcodeLookupResult; data: LabData; role: Role | null;
  onRequest?: () => void; onRestock?: () => void; onOpenChemical?: () => void;
}) {
  const stock = useMemo(
    () => result.chemical ? chemicalStock(result.chemical, data.containers) : 0,
    [result, data],
  );
  const canRequest = role === "student" || role === "teacher";
  const canManage = role === "staff" || role === "principal";
  return (
    <div className="space-y-3">
      {result.container && result.chemical ? (
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-1.5">
          <div className="font-extrabold text-ink">{result.chemical.name}</div>
          <div className="text-[12px] text-slate-500">
            {result.container.label} · {result.container.location} · {fmtNum(stock)} {result.chemical.unit} in stock
            {result.container.expiry && ` · expires ${fmtDate(result.container.expiry)}`}
          </div>
          <Badge tone={result.container.state === "disposed" ? "red" : "green"}>{result.container.state}</Badge>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-[12.5px] text-amber-800">
          No container is registered under this code yet.
          {canManage && " Add it as a new container — the barcode field accepts this exact code."}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {canRequest && result.chemical && onRequest && <Button variant="gold" onClick={onRequest}>Request</Button>}
        {canManage && onRestock && <Button variant="primary" onClick={onRestock}>{result.container ? "Open container card" : "Add container with this code"}</Button>}
        {result.chemical && onOpenChemical && <Button variant="outline" onClick={onOpenChemical}>Chemical card</Button>}
      </div>
    </div>
  );
}

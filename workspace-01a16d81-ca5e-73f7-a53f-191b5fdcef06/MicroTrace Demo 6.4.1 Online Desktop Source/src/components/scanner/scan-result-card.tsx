// scan-result-card — the decoded code laid out with GS1 fields if present.
import { Badge } from "@/components/ui/badge";
import { parseBarcode, barcodeKey } from "@/lib/barcode";

export function ScanResultCard({ raw }: { raw: string }) {
  const gs1 = parseBarcode(raw);
  const fields: [string, string | undefined][] = [
    ["Key", barcodeKey(gs1)], ["GTIN (01)", gs1.gtin],
    ["Expiry (17)", gs1.expiry], ["Batch (10)", gs1.batch], ["Serial (21)", gs1.serial],
  ];
  return (
    <div className="rounded-xl border border-navy-100 bg-navy-50 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge tone="navy">scanned</Badge>
        <code className="text-[12px] break-all">{raw}</code>
      </div>
      {(gs1.gtin || gs1.batch || gs1.serial || gs1.expiry) && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px]">
          {fields.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><span className="text-slate-400">{k}:</span> <b>{v}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

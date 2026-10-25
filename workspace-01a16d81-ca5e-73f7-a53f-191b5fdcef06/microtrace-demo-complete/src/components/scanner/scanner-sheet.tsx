// scanner-sheet — global camera overlay. Reads the lab's EXISTING pre-printed
// barcodes (CODE-128 / EAN / GS1); never generates or prints codes.
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { startScan, cameraSupported, type ScanHandle } from "@/lib/scanner";
import { useLabData } from "@/hooks/useLabData";
import type { Role } from "@/lib/types";
import { ScanResultCard } from "./scan-result-card";
import { BarcodeLookup, lookupBarcode, type BarcodeLookupResult } from "./barcode-lookup";
import { ScanTargetPicker, type ScanTarget } from "./scan-target-picker";
import { ScanLine } from "lucide-react";

function embeddedSrc(): string {
  return [
    "data:image/svg+xml,",
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='none' stroke='#d33' stroke-width='2'><polyline points='10,30 10,10 30,10'/><polyline points='70,10 90,10 90,30'/><polyline points='90,70 90,90 70,90'/><polyline points='30,90 10,90 10,70'/></g></svg>"),
  ].join("");
}

export function ScannerSheet({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role | null }) {
  const { data } = useLabData();
  const [raw, setRaw] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState<string | null>(null);
  const [target, setTarget] = useState<ScanTarget>("find");
  const [registerCode, setRegisterCode] = useState<string | null>(null);
  const handleRef = useRef<ScanHandle | null>(null);
  const watching = !raw && !registerCode;

  useEffect(() => {
    if (!open || !watching || !cameraSupported()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      startScan("mt-scan-box", (text) => {
        if (cancelled) return;
        if (target === "register") setRegisterCode(text); else setRaw(text);
      }).then((h) => {
        if (cancelled) { h.stop(); return; }
        handleRef.current = h;
      }).catch((e) => {
        if (!cancelled) setCamError(e?.name === "NotAllowedError"
          ? "Camera permission was denied — use typed entry below."
          : String(e));
      });
    }, 300); // wait for the sheet's mount + element
    return () => {
      cancelled = true;
      clearTimeout(t);
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, watching, target]);

  const result: BarcodeLookupResult | null = raw && data ? lookupBarcode(data, raw) : null;
  const reset = () => { setRaw(null); setRegisterCode(null); setCamError(null); setManual(""); };

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }}>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-ink inline-flex items-center gap-2">
            <ScanLine className="text-gold-600" /> Scan a bottle barcode
          </h2>
          <button onClick={() => { reset(); onClose(); }} aria-label="Close" className="text-slate-400 hover:text-ink text-xl leading-none">×</button>
        </div>
        {(role === "staff" || role === "principal") && (
          <ScanTargetPicker value={target} onChange={(t) => { setTarget(t); reset(); }} />
        )}

        {watching && (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
              <div id="mt-scan-box" className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
              <img src={embeddedSrc()} alt="" className="absolute inset-0 m-auto w-40 opacity-70 pointer-events-none" />
            </div>
            {camError && <Alert kind="warn">{camError}</Alert>}
            {!cameraSupported() && <Alert kind="info" title="No camera here">Type or paste the code below instead.</Alert>}
            <div className="flex gap-2">
              <Input value={manual} onChange={(e) => setManual(e.target.value)}
                placeholder="…or type / paste the code" aria-label="manual barcode entry"
                onKeyDown={(e) => { if (e.key === "Enter" && manual.trim()) { target === "register" ? setRegisterCode(manual.trim()) : setRaw(manual.trim()); } }} />
              <Button variant="primary" onClick={() => manual.trim() && (target === "register" ? setRegisterCode(manual.trim()) : setRaw(manual.trim()))}>Go</Button>
            </div>
          </>
        )}

        {registerCode && (
          <div className="space-y-3">
            <ScanResultCard raw={registerCode} />
            <p className="text-[12.5px] text-slate-600">Copy this code into the barcode field when you add the new container.</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => { navigator.clipboard?.writeText(registerCode); reset(); }}>Copy code</Button>
              <Button onClick={reset}>Scan another</Button>
            </div>
          </div>
        )}

        {raw && (
          <div className="space-y-3">
            <ScanResultCard raw={raw} />
            {data && result && (
              <BarcodeLookup result={result} data={data} role={role}
                onRestock={!result.container ? () => { navigator.clipboard?.writeText(raw); reset(); } : undefined} />
            )}
            <Button onClick={reset} className="w-full">Scan another</Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

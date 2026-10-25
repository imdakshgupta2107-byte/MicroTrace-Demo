// plate-canvas — load a plate photo, tap to toggle colonies, auto-detect button.
import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectColonies } from "@/lib/vision";
import { Sparkles, Upload, X } from "lucide-react";

export function PlateCanvas({ onCount }: { onCount: (n: number | "") => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const tap = (e: MouseEvent<HTMLDivElement>) => {
    if (busy) return;
    const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    const near = pts.findIndex((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < 0.0016);
    const next = near >= 0 ? pts.filter((_, i) => i !== near) : [...pts, { x, y }];
    setPts(next); onCount(next.length);
  };

  const auto = async () => {
    const img = imgRef.current;
    if (!img || !src) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30)); // let "Detecting…" paint
    const res = detectColonies(img, { threshold: 155, minArea: 12 });
    const w = res.centers.length ? Math.min(480, img.naturalWidth) : 1;
    void w;
    // vision works on a ≤480px virtual canvas; map back to fractions
    const vv = Math.min(480, img.naturalWidth);
    const vh = Math.max(1, Math.round(vv * (img.naturalHeight / img.naturalWidth)));
    const mapped = res.centers.map((c) => ({ x: c.x / vv, y: c.y / vh }));
    setPts(mapped); onCount(mapped.length);
    setBusy(false);
  };

  const pick = (f: File) => {
    const r = new FileReader();
    r.onload = () => { setSrc(String(r.result)); setPts([]); onCount(0); };
    r.readAsDataURL(f);
  };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      {!src ? (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-[12.5px] text-slate-500 hover:border-gold">
          <Upload size={18} className="mx-auto mb-1.5 text-slate-400" />
          Load a plate photo — tap colonies to count (everything stays on this device)
        </button>
      ) : (
        <>
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 select-none cursor-crosshair" onClick={tap}>
            <img ref={imgRef} src={src} alt="Plate" className="w-full block" draggable={false} />
            {pts.map((p, i) => (
              <span key={i} className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-gold bg-gold/25 pointer-events-none"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="gold">{pts.length} colonies</Badge>
            <Button size="sm" variant="outline" onClick={auto} disabled={busy}>
              <Sparkles size={13} /> {busy ? "Detecting…" : "Auto-detect"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setPts([]); onCount(0); }}>Clear marks</Button>
            <Button size="sm" variant="ghost" onClick={() => { setSrc(null); setPts([]); onCount(""); }} aria-label="remove photo"><X size={13} /></Button>
          </div>
        </>
      )}
    </div>
  );
}

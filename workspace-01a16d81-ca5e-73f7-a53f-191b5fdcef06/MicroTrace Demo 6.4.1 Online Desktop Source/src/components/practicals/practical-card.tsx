import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime, fmtNum, todayISO } from "@/lib/format";
import type { Chemical, Practical } from "@/lib/types";
import { XCircle } from "lucide-react";

export function PracticalCard({ p, chemicals, canCancel, onCancel }: {
  p: Practical; chemicals: Chemical[]; canCancel: boolean; onCancel: () => void;
}) {
  const past = p.scheduled_on.slice(0, 10) < todayISO();
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[13.5px] text-ink">{p.title}</div>
          <div className="text-[11.5px] text-slate-500">{p.class_name} · {fmtDate(p.scheduled_on)} · by {p.created_by}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={past ? "gray" : "violet"}>{past ? "held" : "upcoming"}</Badge>
          {canCancel && !past && (
            <Button size="sm" variant="ghost" onClick={onCancel} aria-label="cancel practical"><XCircle size={14} className="text-red-500" /></Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.chemicals.map((lc, i) => {
          const c = chemicals.find((x) => x.id === lc.chemical_id);
          return <Badge key={i} tone="slate">{c?.name ?? "?"} ×{fmtNum(lc.qty)} {c?.unit}</Badge>;
        })}
      </div>
    </div>
  );
}

export function PracticalNoticeStrip({ practicals, chemicals }: { practicals: Practical[]; chemicals: Chemical[] }) {
  const today = todayISO();
  const upcoming = practicals.filter((p) => p.scheduled_on.slice(0, 10) >= today).slice(0, 3);
  if (upcoming.length === 0) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 space-y-1" role="note">
      <div className="text-[11px] font-extrabold tracking-wide text-violet-800">UPCOMING PRACTICALS</div>
      {upcoming.map((p) => (
        <Link key={p.id} to="/practicals" aria-label={`Open practical: ${p.title}`} className="block rounded-md text-[12.5px] text-violet-900 transition hover:bg-violet-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <b>{p.title}</b> ({p.class_name}) — {fmtDate(p.scheduled_on)}.
          <span className="text-violet-700"> Bring: {p.chemicals.map((lc) => chemicals.find((c) => c.id === lc.chemical_id)?.name ?? "?").join(", ") || "—"}</span>
        </Link>
      ))}
    </div>
  );
}

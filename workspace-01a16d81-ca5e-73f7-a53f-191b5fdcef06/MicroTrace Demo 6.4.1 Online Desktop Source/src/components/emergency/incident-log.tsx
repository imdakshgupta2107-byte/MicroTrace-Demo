// incident-log — recorded safety incidents (from the emergency overlay).
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDateTime } from "@/lib/format";
import type { Chemical, Incident } from "@/lib/types";

export function IncidentLog({ incidents, chemicals }: { incidents: Incident[]; chemicals: Chemical[] }) {
  if (incidents.length === 0) {
    return <EmptyState title="No incidents recorded" hint="Anything logged from the red emergency screen lands here and in audit." />;
  }
  return (
    <div className="space-y-2.5">
      {incidents.map((i) => (
        <div key={i.id} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-[13.5px] text-ink">
              {i.kind} {i.chemical_id && <span className="text-slate-500 font-semibold">· {chemicals.find((c) => c.id === i.chemical_id)?.name}</span>}{" "}
              <Badge tone="red">{fmtDateTime(i.occurred_at)}</Badge>
            </div>
            <span className="text-[11px] text-slate-400">{i.reported_by}</span>
          </div>
          <div className="text-[12px] text-slate-600">{i.description}</div>
          {i.action_taken && <div className="text-[12px] text-red-800"><b>Action:</b> {i.action_taken}</div>}
          <div className="text-[11px] text-slate-400">{i.location}</div>
        </div>
      ))}
    </div>
  );
}

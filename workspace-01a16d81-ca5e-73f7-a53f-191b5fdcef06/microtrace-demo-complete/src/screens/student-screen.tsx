// student-screen — dashboard for students: notices, requests and routed Lab Desk entries.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardActionCard } from "@/components/ui/dashboard-action-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ScanLine, Send, Wrench } from "lucide-react";
import { useLabData } from "@/hooks/useLabData";
import { useServiceDesk } from "@/service-desk/store";
import { statusTone } from "@/service-desk/presentation";
import { displayName, isMyRecord } from "@/lib/student";
import { chemicalStock } from "@/lib/procurement";
import { fmtDate } from "@/lib/format";
import { PracticalNoticeStrip } from "@/components/practicals/practical-card";

export function StudentScreen() {
  const { data } = useLabData();
  const { data: desk } = useServiceDesk();
  const me = displayName();
  const mine = useMemo(() => (data?.requests ?? []).filter((r) => isMyRecord(r.owner_id, r.requester)), [data, me]);
  const deskMine = useMemo(() => desk.tickets.filter((ticket) => ticket.requester === me), [desk, me]);
  const inStock = (data?.chemicals ?? []).filter((c) => chemicalStock(c, data?.containers ?? []) > 0).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Items in stock" value={inStock} tint="navy" to="/chemicals" />
        <StatCard label="My pending requests" value={mine.filter((r) => r.status === "pending").length}
          tint={mine.some((r) => r.status === "pending") ? "gold" : "slate"} to="/requests?status=pending" />
        <StatCard label="Issued to me" value={mine.filter((r) => r.status === "issued").length} tint="blue" to="/requests?status=issued" />
        <StatCard label="Open Lab Desk entries" value={deskMine.filter((ticket) => ["submitted", "acknowledged", "endorsed", "in-progress"].includes(ticket.status)).length} tint={deskMine.some((ticket) => ticket.status === "submitted") ? "amber" : "slate"} to="/requests" />
      </div>
      <PracticalNoticeStrip practicals={data?.practicals ?? []} chemicals={data?.chemicals ?? []} />
      <div className="flex flex-wrap gap-2">
        <Link to="/chemicals"><Button variant="primary">Browse inventory</Button></Link>
        <Link to="/requests"><Button variant="gold"><Send size={14} /> New request</Button></Link>
        <Link to="/requests?desk=report"><Button variant="outline"><AlertTriangle size={14} /> Report an issue</Button></Link>
        <Link to="/workbench"><Button variant="outline"><Wrench size={14} /> Workbench</Button></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardActionCard to="/requests" label="Open my recent requests">
          <h3 className="font-extrabold text-[13px] text-ink">My recent requests</h3>
          {mine.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">None yet — request chemicals from the Chemicals page or here.</p>}
          <ul className="mt-2 space-y-1.5">
            {mine.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="font-semibold text-ink truncate min-w-0 flex-1">{data?.chemicals.find((c) => c.id === r.chemical_id)?.name ?? "?"}</span>
                <span className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2 shrink-0 text-slate-400 text-[11px]">
                  <ScanLine size={11} className="hidden" />{fmtDate(r.requested_at)}
                  <Badge tone={r.status === "issued" ? "blue" : r.status === "pending" ? "amber" : r.status === "rejected" ? "red" : "gray"}>{r.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </DashboardActionCard>
        <DashboardActionCard to="/requests" label="Open my Lab Desk entries">
          <h3 className="font-extrabold text-[13px] text-ink">My Lab Desk entries</h3>
          {deskMine.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">Use Report an issue for observations, or New request for material and culture requirements.</p>}
          <ul className="mt-2 space-y-1.5">
            {deskMine.slice(0, 5).map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate min-w-0 flex-1"><b className="text-ink">{ticket.channel === "report" ? "Report" : "Request"}</b> · {ticket.title}</span>
                <Badge tone={statusTone(ticket.status)}>{ticket.status.replace(/-/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </DashboardActionCard>
      </div>
    </div>
  );
}

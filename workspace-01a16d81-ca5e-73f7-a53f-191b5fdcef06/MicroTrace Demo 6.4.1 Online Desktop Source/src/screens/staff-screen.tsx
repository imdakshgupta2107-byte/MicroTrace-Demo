// staff-screen — approvals, inventory watch and the routed operational Lab Desk queue.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardActionCard } from "@/components/ui/dashboard-action-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLabData } from "@/hooks/useLabData";
import { useServiceDesk } from "@/service-desk/store";
import { usableChemicalStock } from "@/lib/procurement";
import { expiryState } from "@/lib/expiry";
import { daysUntil } from "@/lib/format";
import { fmtNum } from "@/lib/format";
import { AlertTriangle, CalendarClock, ClipboardCheck, PackagePlus, Truck } from "lucide-react";

export function StaffScreen() {
  const { data } = useLabData();
  const { data: desk } = useServiceDesk();
  const pending = data?.requests.filter((r) => r.status === "pending") ?? [];
  const expiring = useMemo(() => (data?.containers ?? [])
    .filter((c) => c.state !== "disposed")
    .map((c) => ({ c, exp: expiryState(c) }))
    .filter(({ exp }) => exp.state === "expired" || exp.state === "soon" || exp.state === "watch")
    .sort((a, b) => (a.c.expiry ?? "9999") < (b.c.expiry ?? "9999") ? -1 : 1), [data]);
  const low = useMemo(() => (data?.chemicals ?? [])
    .filter((c) => usableChemicalStock(c, data?.containers ?? []) <= c.min_stock), [data]);
  const openDesk = useMemo(() => desk.tickets.filter((ticket) => ticket.recipient_roles.includes("staff") && ["submitted", "acknowledged", "endorsed", "in-progress"].includes(ticket.status)), [desk]);
  const issueFlags = openDesk.filter((ticket) => ticket.channel === "report");
  const requirements = openDesk.filter((ticket) => ticket.channel === "request");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending stock approvals" value={pending.length} tint={pending.length ? "gold" : "slate"} to="/requests?status=pending" />
        <StatCard label="Lab issue reports" value={issueFlags.length} tint={issueFlags.length ? "red" : "green"} to="/requests?desk=report" />
        <StatCard label="Active requirements" value={requirements.length} tint={requirements.length ? "amber" : "slate"} to="/requests" />
        <StatCard label="Low / out of stock" value={low.length} tint={low.length ? "red" : "green"} to="/chemicals?status=low-stock" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/requests"><Button variant="gold"><ClipboardCheck size={14} /> Review Lab Desk</Button></Link>
        <Link to="/operations"><Button variant="outline"><ClipboardCheck size={14} /> Daily operations</Button></Link>
        <Link to="/projects"><Button variant="outline"><CalendarClock size={14} /> Project schedule</Button></Link>
        <Link to="/containers"><Button variant="primary"><PackagePlus size={14} /> Containers</Button></Link>
        <Link to="/procurement"><Button variant="outline"><Truck size={14} /> Order advice</Button></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardActionCard to="/requests" label="Open Lab Desk items requiring action">
          <h3 className="font-extrabold text-[13px] text-ink">Lab Desk requiring action</h3>
          {openDesk.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">No routed report or requirement is waiting.</p>}
          <ul className="mt-2 space-y-1.5">
            {openDesk.slice(0, 6).map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate min-w-0 flex-1"><b className="text-ink">{ticket.channel === "report" ? "Report" : "Request"}</b> · {ticket.title}</span>
                {ticket.priority === "priority" ? <Badge tone="red"><AlertTriangle size={10} /> priority</Badge> : <Badge tone="amber">{ticket.status}</Badge>}
              </li>
            ))}
          </ul>
        </DashboardActionCard>
        <DashboardActionCard to="/containers" label="Open expiring container inventory">
          <h3 className="font-extrabold text-[13px] text-ink">Expiry watch</h3>
          {expiring.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">Nothing near expiry.</p>}
          <ul className="mt-2 space-y-1.5">
            {expiring.slice(0, 6).map(({ c }) => {
              const chem = data?.chemicals.find((x) => x.id === c.chemical_id);
              const d = c.expiry ? daysUntil(c.expiry) : null;
              return (
                <li key={c.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="truncate"><b className="text-ink">{chem?.name}</b> · {c.label} ({fmtNum(c.qty)} {chem?.unit})</span>
                  <Badge tone={d !== null && d < 0 ? "red" : "amber"}>{d === null ? "?" : d < 0 ? `expired ${-d}d` : `${d}d left`}</Badge>
                </li>
              );
            })}
          </ul>
        </DashboardActionCard>
      </div>
    </div>
  );
}

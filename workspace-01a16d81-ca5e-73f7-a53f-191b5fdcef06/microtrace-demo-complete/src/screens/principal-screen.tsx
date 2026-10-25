// principal-screen — oversight: KPIs + GRAPHS of chemical data + audit feed.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/hooks/useLabData";
import { useServiceDesk } from "@/service-desk/store";
import { chemicalStock, usableChemicalStock } from "@/lib/procurement";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { getCategoryColor } from "@/lib/category-colors";
import { fmtDateTime, fmtINR, fmtNum } from "@/lib/format";
import { BarChart, DonutChart, Card } from "./_shared";
import { CalendarClock, ClipboardCheck, ClipboardList, FileBarChart, ScrollText } from "lucide-react";

const DONUT_COLORS = ["#7a1f2b", "#0e3a5d", "#b8892b", "#2f7d4f", "#5b2a86", "#64748b", "#0e7490", "#b45309"];

export function PrincipalScreen() {
  const { data } = useLabData();
  const { data: desk } = useServiceDesk();
  const low = (data?.chemicals ?? []).filter((c) => usableChemicalStock(c, data?.containers ?? []) <= c.min_stock);
  const pending = data?.requests.filter((r) => r.status === "pending").length ?? 0;
  const activeDesk = (desk.tickets ?? []).filter((ticket) => ["submitted", "acknowledged", "endorsed", "in-progress"].includes(ticket.status));
  const activeDeskReports = activeDesk.filter((ticket) => ticket.channel === "report");
  const facultyRequirements = activeDesk.filter((ticket) => ticket.channel === "request" && ticket.requester_role === "teacher");

  const byCategory = useMemo(() => {
    const groups = new Map<string, { label: string; value: number; color: string }>();
    (data?.chemicals ?? []).forEach((chemical) => {
      const category = chemicalInventoryCategory(chemical);
      const current = groups.get(category.key) ?? { label: category.display_name, value: 0, color: getCategoryColor(category.key).hex };
      current.value += 1;
      groups.set(category.key, current);
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const requestsByStatus = useMemo(() => {
    const g: Record<string, number> = {};
    (data?.requests ?? []).forEach((r) => { g[r.status] = (g[r.status] ?? 0) + 1; });
    return Object.entries(g).map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  }, [data]);

  const spendByMonth = useMemo(() => {
    const g: Record<string, number> = {};
    (data?.pos ?? []).filter((p) => p.status !== "cancelled").forEach((p) => {
      const m = (p.ordered_at ?? p.created_at ?? "").slice(0, 7);
      if (m) g[m] = (g[m] ?? 0) + p.total_inr;
    });
    return Object.entries(g).sort().slice(-8).map(([m, v]) => ({ label: m.slice(5), value: v }));
  }, [data]);

  const estValue = useMemo(() => (data?.chemicals ?? []).reduce((sum, c) => {
    const ps = (data?.prices ?? []).filter((p) => p.chemical_id === c.id && p.pack_size > 0);
    if (!ps.length) return sum;
    const per = Math.min(...ps.map((p) => p.price_inr / p.pack_size));
    return sum + per * chemicalStock(c, data?.containers ?? []);
  }, 0), [data]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Chemicals" value={data?.chemicals.length ?? 0} sub={`${data?.containers.length ?? 0} containers`} tint="navy" to="/chemicals" />
        <StatCard label="Est. inventory value" value={fmtINR(Math.round(estValue))} tint="gold" to="/reports" />
        <StatCard label="Low / out of stock" value={low.length} tint={low.length ? "red" : "green"} sub={low.slice(0, 2).map((c) => c.name).join(", ")} to="/chemicals?status=low-stock" />
        <StatCard label="Pending approvals" value={pending} tint={pending ? "amber" : "slate"} to="/requests?status=pending" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/requests"><Button variant="gold"><ClipboardList size={14} /> Governance Lab Desk</Button></Link>
        <Link to="/operations"><Button variant="outline"><ClipboardCheck size={14} /> Daily operations</Button></Link>
        <Link to="/projects"><Button variant="outline"><CalendarClock size={14} /> Project schedule</Button></Link>
        <Link to="/reports"><Button variant="primary"><FileBarChart size={14} /> Full reports & Excel</Button></Link>
        <Link to="/audit"><Button variant="outline"><ScrollText size={14} /> Audit trail</Button></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Chemicals per category">
          <BarChart data={byCategory} />
        </Card>
        <Card title="Requests by status">
          <DonutChart data={requestsByStatus} />
        </Card>
        <Card title="Purchase spend by month">
          <BarChart data={spendByMonth} money height={140} />
        </Card>
        <Card title="Maintenance & discrepancies" right={<span className="text-[11px] font-bold text-red-700">{activeDeskReports.length} active</span>}>
          {activeDeskReports.length === 0 ? <p className="text-[12.5px] text-slate-500">No unresolved Lab Desk issue reports.</p> : (
            <ul className="space-y-1.5 text-[12.5px]">
              {activeDeskReports.slice(0, 6).map((ticket) => (
                <li key={ticket.id} className="flex justify-between gap-2">
                  <span className="truncate"><b className="text-ink">{ticket.title}</b><span className="text-slate-500"> · {ticket.location}</span></span>
                  <span className="text-slate-400 whitespace-nowrap">{ticket.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Faculty academic requirements" right={<span className="text-[11px] font-bold text-navy-700">{facultyRequirements.length} active</span>}>
          {facultyRequirements.length === 0 ? <p className="text-[12.5px] text-slate-500">No faculty requirement is awaiting action.</p> : (
            <ul className="space-y-1.5 text-[12.5px]">
              {facultyRequirements.slice(0, 6).map((ticket) => (
                <li key={ticket.id} className="flex justify-between gap-2">
                  <span className="truncate"><b className="text-ink">{ticket.requester}</b> · {ticket.title}</span>
                  <span className="text-slate-400 whitespace-nowrap">{ticket.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Chemicals at or below minimum">
          {low.length === 0 ? <p className="text-[12.5px] text-slate-500">Stock is healthy.</p> : (
            <ul className="space-y-1 text-[12.5px]">
              {low.slice(0, 8).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate font-semibold text-ink">{c.name}</span>
                  <span className="text-red-700 font-bold whitespace-nowrap">
                    {fmtNum(usableChemicalStock(c, data?.containers ?? []))}/{fmtNum(c.min_stock)} {c.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Latest audit entries" to="/audit">
        <ul className="space-y-1.5 text-[12px]">
          {(data?.audit ?? []).slice(0, 8).map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span className="text-slate-600 truncate"><b className="text-ink">{a.actor}</b> {a.action} · {a.entity}</span>
              <span className="text-slate-400 whitespace-nowrap">{fmtDateTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// teacher-screen — academic dashboard with Lab Desk endorsement and requirements routing.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardActionCard } from "@/components/ui/dashboard-action-card";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/hooks/useLabData";
import { useServiceDesk } from "@/service-desk/store";
import { displayName } from "@/lib/student";
import { PracticalNoticeStrip } from "@/components/practicals/practical-card";
import { AlertTriangle, CalendarClock, CalendarPlus, FileBarChart, Send, Wrench } from "lucide-react";
import { todayISO } from "@/lib/format";

export function TeacherScreen() {
  const { data } = useLabData();
  const { data: desk } = useServiceDesk();
  const me = displayName();
  const today = todayISO();
  const upcoming = (data?.practicals ?? []).filter((p) => p.scheduled_on.slice(0, 10) >= today);
  const awaitingEndorsement = useMemo(() => desk.tickets.filter((ticket) => ticket.channel === "request" && ticket.requester_role === "student" && ticket.status === "submitted"), [desk]);
  const myRequirements = useMemo(() => desk.tickets.filter((ticket) => ticket.requester === me && ticket.channel === "request" && ["submitted", "acknowledged", "endorsed", "in-progress"].includes(ticket.status)), [desk, me]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Inventory items" value={data?.chemicals.length ?? 0} tint="navy" to="/chemicals" />
        <StatCard label="Practicals upcoming" value={upcoming.length} tint="violet" to="/practicals" />
        <StatCard label="Student requirements to endorse" value={awaitingEndorsement.length} tint={awaitingEndorsement.length ? "amber" : "slate"} to="/requests" />
        <StatCard label="My active requirements" value={myRequirements.length} tint={myRequirements.length ? "blue" : "slate"} to="/requests" />
      </div>
      <PracticalNoticeStrip practicals={data?.practicals ?? []} chemicals={data?.chemicals ?? []} />
      <div className="flex flex-wrap gap-2">
        <Link to="/practicals"><Button variant="gold"><CalendarPlus size={14} /> Schedule practical</Button></Link>
        <Link to="/projects"><Button variant="outline"><CalendarClock size={14} /> Project schedule</Button></Link>
        <Link to="/requests"><Button variant="primary"><Send size={14} /> Lab Desk & requests</Button></Link>
        <Link to="/requests?desk=report"><Button variant="outline"><AlertTriangle size={14} /> Report an issue</Button></Link>
        <Link to="/reports"><Button variant="outline"><FileBarChart size={14} /> Reports & Excel</Button></Link>
        <Link to="/workbench"><Button variant="outline"><Wrench size={14} /> Workbench</Button></Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardActionCard to="/requests" label="Open student requirements awaiting endorsement">
          <h3 className="font-extrabold text-[13px] text-ink">Student requirements awaiting endorsement</h3>
          {awaitingEndorsement.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">Nothing needs academic endorsement right now.</p>}
          <ul className="mt-2 space-y-1.5">
            {awaitingEndorsement.slice(0, 5).map((ticket) => <li key={ticket.id} className="text-[12.5px]"><b className="text-ink">{ticket.requester}</b> · {ticket.title}</li>)}
          </ul>
        </DashboardActionCard>
        <DashboardActionCard to="/practicals" label="Open upcoming practicals">
          <h3 className="font-extrabold text-[13px] text-ink">Your next practicals</h3>
          {upcoming.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">Nothing scheduled — add one with a chemical list; students see it as a notice.</p>}
          <ul className="mt-2 space-y-1.5">
            {upcoming.slice(0, 5).map((p) => <li key={p.id} className="text-[12.5px]"><b>{p.title}</b> ({p.class_name})</li>)}
          </ul>
        </DashboardActionCard>
      </div>
    </div>
  );
}

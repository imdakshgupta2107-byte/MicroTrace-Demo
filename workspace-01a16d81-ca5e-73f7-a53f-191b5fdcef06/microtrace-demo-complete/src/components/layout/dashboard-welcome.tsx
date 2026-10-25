import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useLabData } from "@/hooks/useLabData";
import { displayName } from "@/lib/student";
import { todayISO } from "@/lib/format";
import type { Role } from "@/lib/types";

const COPY: Record<Role, { title: string; text: string; to: string; action: string }> = {
  student: { title: "Your bench is ready.", text: "Find what you need, follow your requests and prepare for your next practical.", to: "/requests", action: "My requests" },
  teacher: { title: "Make room for discovery.", text: "Plan practicals, check lab resources and keep your students one step ahead.", to: "/practicals", action: "View practicals" },
  staff: { title: "Keep the lab moving.", text: "A clear view of approvals, stock and expiry — so every practical starts prepared.", to: "/requests", action: "Review requests" },
  principal: { title: "A clear view of your lab.", text: "Follow inventory, purchasing and lab activity from one practical overview.", to: "/reports", action: "View reports" },
};

export function DashboardWelcome({ role }: { role: Role }) {
  const { data } = useLabData();
  const copy = COPY[role];
  const upcoming = (data?.bookings ?? []).filter((booking) => booking.date >= todayISO() && ["pending", "approved"].includes(booking.status));
  return (
    <section className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-start gap-4 p-4 sm:p-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wide uppercase text-gold-700">Welcome, {displayName()}</p>
          <h2 className="mt-2 text-xl sm:text-2xl leading-tight font-extrabold tracking-tight text-navy">{copy.title}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 max-w-xl">{copy.text}</p>
          <Link to={copy.to} className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-navy hover:text-gold-700">{copy.action}<ArrowUpRight size={15} /></Link>
        </div>
        <BrandLogo className="hidden sm:block w-20 h-20 rounded-2xl border border-slate-100 bg-white" />
      </div>
      <div className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <span><b className="text-navy">{data?.chemicals.length ?? 0}</b> inventory items · <b className="text-navy">{new Set((data?.chemicals ?? []).map((chemical) => chemical.category)).size}</b> categories</span>
        <Link to="/bookings" className="inline-flex gap-1.5 items-center font-semibold text-navy hover:text-gold-700"><CalendarClock size={14} /> {upcoming.length} upcoming instrument bookings <ArrowUpRight size={13} /></Link>
      </div>
    </section>
  );
}

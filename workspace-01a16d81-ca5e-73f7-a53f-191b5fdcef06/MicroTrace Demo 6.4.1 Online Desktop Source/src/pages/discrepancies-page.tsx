import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DiscrepancyList, type DiscrepancyFilter } from "@/components/discrepancies/discrepancy-list";
import { useAuth } from "@/hooks/useAuth";
import { useLabData } from "@/hooks/useLabData";

export default function DiscrepanciesPage() {
  const { role } = useAuth();
  const { data } = useLabData();
  const reports = data?.discrepancies ?? [];
  const [filter, setFilter] = useState<DiscrepancyFilter>("all");
  const chooseFilter = (next: DiscrepancyFilter) => {
    setFilter(next);
    requestAnimationFrame(() => document.getElementById("discrepancy-register")?.focus());
  };
  return <>
    <PageHeader title="Breakage & waste" sub="Verified loss and write-off control. Operational observations are routed separately so that no stock balance changes before review." />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
      <StatCard label="Awaiting review" value={reports.filter((report) => report.status === "reported").length} tint="gold" onClick={() => chooseFilter("reported")} />
      <StatCard label="Written off" value={reports.filter((report) => report.status === "written-off").length} tint="red" onClick={() => chooseFilter("written-off")} />
      <StatCard label="Total reports" value={reports.length} tint="navy" onClick={() => chooseFilter("all")} />
    </div>
    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="text-[12.5px] leading-relaxed text-blue-900 flex-1"><b>Not a write-off?</b> For evaporation, contamination, missing/misplaced items, quality or maintenance concerns, create a Lab Desk issue report first. Lab staff can physically check it before any controlled loss record is made.</p>
      <Link to="/requests?desk=report"><Button size="sm" variant="primary"><ArrowUpRight size={13} /> Report an issue</Button></Link>
    </div>
    <DiscrepancyList role={role} status={filter} />
  </>;
}

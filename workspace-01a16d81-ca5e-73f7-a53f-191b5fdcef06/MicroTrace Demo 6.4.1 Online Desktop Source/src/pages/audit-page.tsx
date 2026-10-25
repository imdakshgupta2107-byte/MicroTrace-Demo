import { RouteRedirect } from "@/components/auth/route-redirect";
// audit-page — filterable audit trail (staff & principal).
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/useAuth";
import { useLabData } from "@/hooks/useLabData";
import { useDebounce } from "@/hooks/useDebounce";
import { fmtDateTime } from "@/lib/format";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { containerTypeFromLabel, getCategoryColor, getContainerColor } from "@/lib/category-colors";
import { CategoryBadge } from "@/components/chemicals/category-badge";
import { ContainerTypeBadge } from "@/components/containers/container-type-badge";

export default function AuditPage() {
  const { role } = useAuth();
  const { data } = useLabData();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const dq = useDebounce(q, 200);

  const entities = useMemo(() => [...new Set((data?.audit ?? []).map((a) => a.entity))].sort(), [data]);
  const rows = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return (data?.audit ?? []).filter((a) => {
      if (entity !== "all" && a.entity !== entity) return false;
      if (s && !((a.actor + " " + a.action + " " + a.entity).toLowerCase().includes(s))) return false;
      return true;
    });
  }, [data, dq, entity]);

  if (role !== "staff" && role !== "principal") return <RouteRedirect to="/dashboard" replace />;
  return (
    <>
      <PageHeader title="Audit trail" sub="Who did what — requests, stock moves, write-offs, POs." />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor or action…" className="w-64" />
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="all">All entities</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No audit entries" hint="Actions in the app (issue, edit, restock…) write here automatically." />
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-slate-400 font-bold [&>th]:px-4 [&>th]:py-2.5 border-b border-slate-100">
                <th>When</th><th>Actor</th><th>Action</th><th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((a) => {
                const container = a.entity === "containers" ? data?.containers.find((item) => item.id === a.entity_id) : undefined;
                const chemicalId = a.entity === "chemicals" ? a.entity_id : container?.chemical_id;
                const chemical = chemicalId ? data?.chemicals.find((item) => item.id === chemicalId) : undefined;
                const category = chemical ? chemicalInventoryCategory(chemical) : null;
                const vesselType = container?.container_type ?? (container ? containerTypeFromLabel(container.label) : null);
                const theme = vesselType ? getContainerColor(vesselType) : category ? getCategoryColor(category.key) : null;
                return (
                  <tr key={a.id} className={`border-b border-slate-50 border-l-4 ${theme?.accentBorder ?? "border-l-transparent"} [&>td]:px-4 [&>td]:py-2`}>
                    <td className="text-slate-400 whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                    <td className="font-bold text-ink whitespace-nowrap">{a.actor}</td>
                    <td className="text-slate-600">{a.action}</td>
                    <td className="space-x-1.5"><Badge tone="gray">{a.entity}</Badge>{vesselType ? <ContainerTypeBadge type={vesselType} /> : category ? <CategoryBadge category={category} /> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

import { DEMO_BUILD } from "@/demo/config";
// request-list — status filter + cards; staff see all, others only their own.
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName, isMyRecord } from "@/lib/student";
import type { Chemical, LabRequest, Role } from "@/lib/types";
import { RequestCard } from "./request-card";
import { RequestEmpty } from "./request-empty";
import { RequestForm } from "./request-form";

export function RequestList({ role }: { role: Role | null }) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const approver = role === "staff" || role === "principal";
  const meName = displayName();

  const list = useMemo(() => {
    let rs = data?.requests ?? [];
    if (!approver) rs = rs.filter((r) => isMyRecord(r.owner_id, r.requester));
    if (filter !== "all") rs = rs.filter((r) => r.status === filter);
    if (approver) rs = [...rs].sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));
    return rs;
  }, [data, filter, approver, meName]);

  const withdraw = async (r: LabRequest) => {
    try {
      if (DEMO_BUILD) await mutate({ kind: "delete", table: "requests", id: r.id, audit: `Withdrew request #${String(r.id).slice(0, 8)}` });
      else await mutate({ kind: "update", table: "requests", id: r.id, patch: { status: "withdrawn" } });
      toast("Request withdrawn.", "info");
    } catch (e) { err(String(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all", "pending", "issued", "returned", "rejected", "withdrawn"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <div className="flex-1" />
        {(role === "student" || role === "teacher") && (
          <Button variant="gold" onClick={() => setFormOpen(true)}><Plus size={15} /> New request</Button>
        )}
      </div>
      <div className="space-y-2.5">
        {list.length === 0 && <RequestEmpty approver={approver} />}
        {list.map((r) => (
          <RequestCard key={r.id} req={r}
            chem={data?.chemicals.find((c: Chemical) => c.id === r.chemical_id)}
            role={role} meName={meName}
            onWithdraw={() => withdraw(r)} />
        ))}
      </div>
      {formOpen && (role === "student" || role === "teacher") && (
        <RequestForm open={formOpen} onClose={() => setFormOpen(false)} role={role} />
      )}
    </div>
  );
}

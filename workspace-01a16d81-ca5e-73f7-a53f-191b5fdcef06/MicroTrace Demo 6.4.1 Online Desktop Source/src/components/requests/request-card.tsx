import { isMyRecord } from "@/lib/student";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { fmtDate, fmtDateTime, daysUntil } from "@/lib/format";
import type { Chemical, LabRequest, Role } from "@/lib/types";
import { RequestApproval } from "./request-approval";

const TONE: Record<LabRequest["status"], "amber" | "blue" | "green" | "red" | "gray"> = {
  pending: "amber", approved: "blue", issued: "blue", returned: "green", rejected: "red", withdrawn: "gray",
};

export function RequestCard({ req, chem, role, meName, onWithdraw }: {
  req: LabRequest; chem: Chemical | undefined; role: Role | null; meName: string; onWithdraw: () => void;
}) {
  const canDecide = role === "staff" || role === "principal";
  const overdue = req.status === "issued" && req.return_due && daysUntil(req.return_due) < 0;
  return (
    <div data-request-id={req.id} className="min-w-0 bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-[13.5px] text-ink min-w-0 break-words flex-1">
          {chem?.name ?? "(removed chemical)"}{" "}
          <span className="text-gold-700">{req.qty} {chem?.unit}</span>{" "}
          <Badge tone={TONE[req.status]}>{req.status}</Badge>
          {overdue && <Badge tone="red">overdue {-daysUntil(req.return_due!)}d</Badge>}
        </div>
        {req.status === "pending" && isMyRecord(req.owner_id, req.requester) && (
          <Button size="sm" variant="ghost" onClick={onWithdraw}>Withdraw</Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
        <Avatar name={req.requester} role={req.requester_role} size={20} />
        <span className="font-semibold text-ink">{req.requester}</span>
        <span aria-hidden="true">·</span><span>{fmtDate(req.requested_at)}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-500 break-words">{req.purpose}</p>
      {req.status === "issued" && req.return_due && (
        <div className="text-[11.5px] text-slate-500">
          Issued {fmtDateTime(req.issued_at)} · return due {fmtDate(req.return_due)}
        </div>
      )}
      {req.status === "rejected" && req.note && <div className="text-[11.5px] italic text-slate-500">“{req.note}”</div>}
      {canDecide && <RequestApproval req={req} />}
    </div>
  );
}

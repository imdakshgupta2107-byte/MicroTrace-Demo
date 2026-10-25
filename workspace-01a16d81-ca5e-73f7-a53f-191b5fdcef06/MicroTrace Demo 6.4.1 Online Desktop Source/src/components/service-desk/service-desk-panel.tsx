import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ClipboardCheck, ClipboardPlus, Send, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import { fmtDate } from "@/lib/format";
import { channelLabel, kindLabel, statusTone } from "@/service-desk/presentation";
import { useServiceDesk } from "@/service-desk/store";
import type { DeskChannel, ServiceTicket } from "@/service-desk/types";
import type { Role } from "@/lib/types";
import { ServiceDeskForm } from "./service-desk-form";

const open = (ticket: ServiceTicket) => ["submitted", "acknowledged", "endorsed", "in-progress"].includes(ticket.status);
const statusText = (status: string) => status.replace(/-/g, " ");

function ticketVisible(ticket: ServiceTicket, role: Role, name: string) {
  if (role === "principal") return true;
  if (role === "staff") return ticket.recipient_roles.includes("staff") || ticket.assigned_to === name;
  if (role === "teacher") return ticket.requester === name || ticket.recipient_roles.includes("teacher");
  return ticket.requester === name;
}

function routeText(ticket: ServiceTicket) {
  if (ticket.status === "submitted" && ticket.channel === "request" && ticket.requester_role === "student") return "Awaiting teacher endorsement before lab staff can fulfil it.";
  if (ticket.status === "in-progress") return ticket.channel === "report" ? "Physical review is in progress; stock remains unchanged." : "Fulfilment is in progress; any stock issue remains separately controlled.";
  return ticket.route_label;
}

export function ServiceDeskPanel({ role }: { role: Role }) {
  const { data, actions } = useServiceDesk();
  const { toast, err } = useToast();
  const actor = useMemo(() => ({ name: displayName(), role }), [role]);
  const [form, setForm] = useState<DeskChannel | null>(null);
  const [closing, setClosing] = useState<{ ticket: ServiceTicket; decision: "complete" | "decline" } | null>(null);
  const [outcome, setOutcome] = useState("");
  const [search] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const requested = search.get("desk");
    if (requested === "report" || requested === "request") {
      setForm(requested);
      navigate("/requests", { replace: true });
    }
  }, [search, navigate]);

  const visible = useMemo(() => data.tickets
    .filter((ticket) => ticketVisible(ticket, role, actor.name))
    .sort((a, b) => Number(open(b)) - Number(open(a)) || Number(b.priority === "priority") - Number(a.priority === "priority") || b.updated_at.localeCompare(a.updated_at)), [data, role, actor.name]);
  const active = visible.filter(open);
  const reports = active.filter((ticket) => ticket.channel === "report");
  const requirements = active.filter((ticket) => ticket.channel === "request");
  const canOwnDesk = role === "student" || role === "teacher";
  const canOperate = role === "staff" || role === "principal";

  const run = (fn: () => void, success: string) => {
    try { fn(); toast(success); } catch (error) { err(error instanceof Error ? error.message : String(error)); }
  };
  const closeForm = () => setForm(null);
  const submitOutcome = () => {
    if (!closing) return;
    const { ticket, decision } = closing;
    run(() => decision === "complete" ? actions.complete(actor, ticket.id, outcome) : actions.decline(actor, ticket.id, outcome), decision === "complete" ? (ticket.channel === "report" ? "Report resolved; stock remains unchanged." : "Requirement marked fulfilled. Record any material issue separately.") : "Entry declined with a recorded reason.");
    setClosing(null); setOutcome("");
  };

  return (
    <section aria-labelledby="lab-desk-heading" className="space-y-3">
      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-50 via-white to-gold-100/35 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-navy"><ShieldCheck size={19} /><h2 id="lab-desk-heading" className="font-extrabold text-base">Lab Desk — report vs. request</h2></div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 max-w-3xl">
              Report an observed condition for a physical review, or submit a material/culture requirement. These records route work and retain accountability; they never silently alter stock.
            </p>
          </div>
          {canOwnDesk && <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="danger" onClick={() => setForm("report")}><AlertTriangle size={14} /> Report an issue</Button>
            <Button variant="gold" onClick={() => setForm("request")}><ClipboardPlus size={14} /> Request material</Button>
          </div>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-xl bg-white/90 border border-white p-3"><div className="text-lg font-extrabold text-navy">{reports.length}</div><div className="text-[11px] font-semibold text-slate-500">Active issue reports</div></div>
          <div className="rounded-xl bg-white/90 border border-white p-3"><div className="text-lg font-extrabold text-navy">{requirements.length}</div><div className="text-[11px] font-semibold text-slate-500">Active requirements</div></div>
          <div className="rounded-xl bg-white/90 border border-white p-3 col-span-2 sm:col-span-1"><div className="text-lg font-extrabold text-navy">{active.filter((ticket) => ticket.priority === "priority").length}</div><div className="text-[11px] font-semibold text-slate-500">Priority follow-ups</div></div>
        </div>
      </div>

      {canOperate && <p className="rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-[12px] text-gold-800"><b>Control boundary:</b> resolve reports only after a physical check. If a verified loss needs stock movement, use <b>Breakage &amp; waste</b> or the controlled Registers workflow; do not use this queue to change a balance.</p>}

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-[13.5px] text-ink">{canOperate ? "Operational queue" : "My desk entries and actions"}</h3>
          <span className="text-[11px] text-slate-500">{visible.length} visible to your role</span>
        </div>
        {visible.length === 0 ? <EmptyState title="No Lab Desk entries" hint={canOwnDesk ? "Use Report an issue or Request material to create a routed entry." : "This role has no routed operational entries right now."} /> : (
          <div className="space-y-2.5">
            {visible.map((ticket) => {
              const canEndorse = role === "teacher" && ticket.channel === "request" && ticket.requester_role === "student" && ticket.status === "submitted";
              const canAcknowledge = canOperate && ticket.status === "submitted" && !(ticket.channel === "request" && ticket.requester_role === "student");
              const canStart = canOperate && (
                (ticket.channel === "report" && ["submitted", "acknowledged"].includes(ticket.status)) ||
                (ticket.channel === "request" && ticket.requester_role === "student" && ticket.status === "endorsed") ||
                (ticket.channel === "request" && ticket.requester_role !== "student" && ["submitted", "acknowledged"].includes(ticket.status))
              );
              const canClose = canOperate && ticket.status === "in-progress";
              const canDecline = canOperate && open(ticket);
              const canWithdraw = ticket.requester === actor.name && ticket.status === "submitted";
              const latest = data.audit.find((entry) => entry.ticket_id === ticket.id);
              return <article key={ticket.id} data-service-ticket-id={ticket.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-1">
                      <Badge tone={ticket.channel === "report" ? "red" : "navy"}>{channelLabel(ticket.channel)}</Badge>
                      <Badge tone={statusTone(ticket.status)}>{statusText(ticket.status)}</Badge>
                      {ticket.priority === "priority" && <Badge tone="amber">priority</Badge>}
                      <span className="font-bold text-slate-400">{ticket.reference}</span>
                    </div>
                    <h4 className="font-extrabold text-[13.5px] text-ink break-words">{ticket.title}</h4>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(ticket.created_at)}</span>
                </div>
                <p className="text-[12.5px] text-slate-600 leading-relaxed">{ticket.detail}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span><b className="text-slate-600">Type:</b> {kindLabel(ticket.category)}</span>
                  {ticket.location && <span><b className="text-slate-600">Location:</b> {ticket.location}</span>}
                  {ticket.related_item_name && <span><b className="text-slate-600">Item:</b> {ticket.related_item_name}{ticket.requested_qty ? ` · ${ticket.requested_qty} ${ticket.unit ?? ""}` : ""}</span>}
                  {ticket.needed_by && <span><b className="text-slate-600">Needed:</b> {fmtDate(ticket.needed_by)}</span>}
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11.5px] text-slate-600"><b className="text-slate-700">Route:</b> {routeText(ticket)}</div>
                {ticket.outcome_note && <div className="rounded-lg bg-green-50 border border-green-100 px-2.5 py-2 text-[11.5px] text-green-800"><b>Recorded outcome:</b> {ticket.outcome_note}</div>}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {canEndorse && <Button size="sm" variant="primary" className="bg-violet-700 text-white hover:bg-violet-800" onClick={() => run(() => actions.endorse(actor, ticket.id), "Requirement endorsed and routed to lab staff.")}><ClipboardCheck size={12} /> Endorse for lab staff</Button>}
                  {canAcknowledge && <Button size="sm" variant="outline" onClick={() => run(() => actions.acknowledge(actor, ticket.id), "Operational entry acknowledged.")}><ClipboardCheck size={12} /> Acknowledge</Button>}
                  {canStart && <Button size="sm" variant="primary" onClick={() => run(() => actions.start(actor, ticket.id), ticket.channel === "report" ? "Physical review started; stock remains unchanged." : "Fulfilment started; record any stock issue separately.")}><Wrench size={12} /> {ticket.channel === "report" ? "Start physical review" : "Start fulfilment"}</Button>}
                  {canClose && <Button size="sm" variant="green" onClick={() => { setClosing({ ticket, decision: "complete" }); setOutcome(""); }}><Send size={12} /> {ticket.channel === "report" ? "Resolve report" : "Mark fulfilled"}</Button>}
                  {canDecline && <Button size="sm" variant="ghost" onClick={() => { setClosing({ ticket, decision: "decline" }); setOutcome(""); }}>Decline / redirect</Button>}
                  {canWithdraw && <Button size="sm" variant="ghost" onClick={() => run(() => actions.withdraw(actor, ticket.id), "Entry withdrawn before review.")}>Withdraw</Button>}
                </div>
                {latest && <p className="text-[10.5px] text-slate-400">Last recorded action: {latest.action} · {latest.actor}</p>}
              </article>;
            })}
          </div>
        )}
      </div>

      {form && <ServiceDeskForm channel={form} role={role} onClose={closeForm} />}
      {closing && <Dialog open onClose={() => setClosing(null)} ariaLabel={closing.decision === "complete" ? "Record outcome" : "Decline operational entry"}>
        <DialogHeader title={closing.decision === "complete" ? (closing.ticket.channel === "report" ? "Resolve issue report" : "Mark requirement fulfilled") : "Decline or redirect entry"} onClose={() => setClosing(null)}
          sub={closing.ticket.channel === "report" ? "Record the physical finding or follow-up. This does not alter stock." : "Record the outcome. Any issue or procurement action remains separately controlled."} />
        <DialogBody>
          <label htmlFor="desk-outcome" className="text-[11.5px] font-bold text-slate-600">Recorded note</label>
          <Textarea id="desk-outcome" autoFocus value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={4} placeholder={closing.decision === "complete" ? "What was checked, completed or arranged?" : "Why is this being declined or redirected?"} />
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setClosing(null)}>Cancel</Button>
          <Button variant={closing.decision === "complete" ? "green" : "danger"} onClick={submitOutcome}>{closing.decision === "complete" ? "Save outcome" : "Save decision"}</Button>
        </DialogFooter>
      </Dialog>}
    </section>
  );
}

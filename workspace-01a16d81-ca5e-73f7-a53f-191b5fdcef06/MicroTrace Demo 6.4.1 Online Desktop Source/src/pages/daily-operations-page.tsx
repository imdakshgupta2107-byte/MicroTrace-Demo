import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, PackageCheck, ShieldCheck, Sun, Sunset, ThermometerSnowflake } from "lucide-react";
import { RouteRedirect } from "@/components/auth/route-redirect";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Stat } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { expiryState } from "@/lib/expiry";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import { stockAlerts } from "@/lib/procurement";
import { displayName } from "@/lib/student";
import { useRegisters } from "@/registers/store";
import { DAILY_CHECKS, type DailyCheckKind, type DailyCheckRecord, useDailyChecks } from "@/operations/store";
import type { Container } from "@/lib/types";

const activeContainer = (container: Container) => container.state !== "disposed" && container.state !== "depleted" && container.state !== "quarantined" && container.qty > 0;

function ChecklistCard({
  kind, record, onCheck, onNotes, onSign, onReset,
}: {
  kind: DailyCheckKind;
  record: DailyCheckRecord;
  onCheck: (id: string, value: boolean) => void;
  onNotes: (value: string) => void;
  onSign: () => void;
  onReset: () => void;
}) {
  const complete = DAILY_CHECKS[kind].filter((check) => record.completed[check.id]).length;
  const allComplete = complete === DAILY_CHECKS[kind].length;
  const signed = Boolean(record.signed_off_at);
  const title = kind === "opening" ? "Opening check" : "Closing check";
  const Icon = kind === "opening" ? Sun : Sunset;
  return (
    <Card>
      <CardHeader>
        <CardTitle><Icon size={17} className="text-gold-700" /> {title}</CardTitle>
        <Badge tone={signed ? "green" : allComplete ? "blue" : "amber"}>{signed ? "signed off" : `${complete}/${DAILY_CHECKS[kind].length} complete`}</Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <p className="text-[11.5px] text-slate-500">{fmtDate(record.date)} · Complete each item before sign-off.</p>
        <div className="space-y-2">
          {DAILY_CHECKS[kind].map((check) => (
            <label key={check.id} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy" checked={Boolean(record.completed[check.id])}
                onChange={(event) => onCheck(check.id, event.target.checked)} />
              <span className="min-w-0"><span className="block text-[12.5px] font-bold text-ink">{check.label}</span><span className="block pt-0.5 text-[11px] leading-relaxed text-slate-500">{check.help}</span></span>
            </label>
          ))}
        </div>
        <label className="block text-[11.5px] font-bold text-slate-600">Handover / exception note
          <Textarea className="mt-1" rows={2} value={record.notes} onChange={(event) => onNotes(event.target.value)} placeholder="Optional note for the next shift" />
        </label>
        {signed ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800">
            <span className="inline-flex items-center gap-1 font-bold"><CheckCircle2 size={14} /> Signed by {record.signed_off_by}</span>
            <span className="block pt-0.5">{fmtDateTime(record.signed_off_at!)}</span>
          </div>
        ) : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">This is a local demo checklist. Follow your institutional SOP for actual safety, temperature and handover records.</div>}
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" size="sm" disabled={!allComplete || signed} onClick={onSign}><ClipboardCheck size={14} /> Sign off</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>Reset today</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyOperationsPage() {
  const { role } = useAuth();
  const nav = useNavigate();
  const { data: lab } = useLabData();
  const { data: registers } = useRegisters();
  const checks = useDailyChecks();
  const { toast, err } = useToast();

  if (role !== "staff" && role !== "principal") return <RouteRedirect to="/dashboard" replace />;

  const containers = lab?.containers ?? [];
  const chemicals = lab?.chemicals ?? [];
  const active = containers.filter(activeContainer);
  const expired = active.filter((container) => expiryState(container).state === "expired");
  const expiring = active.filter((container) => ["soon", "watch"].includes(expiryState(container).state))
    .sort((a, b) => (a.use_by ?? a.expiry ?? "9999-12-31").localeCompare(b.use_by ?? b.expiry ?? "9999-12-31"));
  const lowStock = stockAlerts(chemicals, containers, lab?.prices ?? [], lab?.vendors ?? []);
  const pendingRequests = (lab?.requests ?? []).filter((request) => request.status === "pending");
  const pendingReceipts = registers.receipts.filter((receipt) => !receipt.verified_by);
  const countExceptions = registers.counts.filter((count) => ["recount_required", "investigating"].includes(count.status));

  const fefo = useMemo(() => chemicals.flatMap((chemical) => {
    const eligible = containers
      .filter((container) => container.chemical_id === chemical.id && activeContainer(container) && expiryState(container).state !== "expired")
      .sort((a, b) => (a.use_by ?? a.expiry ?? "9999-12-31").localeCompare(b.use_by ?? b.expiry ?? "9999-12-31"));
    const next = eligible[0];
    return next ? [{ chemical, container: next }] : [];
  }).sort((a, b) => (a.container.use_by ?? a.container.expiry ?? "9999-12-31").localeCompare(b.container.use_by ?? b.container.expiry ?? "9999-12-31")).slice(0, 8), [chemicals, containers]);

  const sign = (kind: DailyCheckKind) => {
    try {
      checks.actions.signOff(kind, { name: displayName(), role });
      toast(`${kind === "opening" ? "Opening" : "Closing"} check signed off for today.`);
    } catch (error) { err(error instanceof Error ? error.message : String(error)); }
  };

  return <>
    <PageHeader title="Daily lab operations" sub="Open safely, prioritize work, issue by FEFO, receive independently and close the shift with traceable checks." />
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-950">
      <span className="inline-flex items-center gap-1 font-bold"><ShieldCheck size={15} /> PIN demo workspace</span>
      <span className="block pt-0.5">Daily checks and control registers stay on this device in the selected demo scope. Shared requests remain limited to the existing temporary demo request channel.</span>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="Pending requests" value={pendingRequests.length} icon={<Clock3 size={18} />} />
      <Stat label="GRNs to verify" value={pendingReceipts.length} icon={<PackageCheck size={18} />} />
      <Stat label="Low-stock items" value={lowStock.length} icon={<AlertTriangle size={18} />} />
      <Stat label="Expiring lots" value={expiring.length} icon={<ThermometerSnowflake size={18} />} />
      <Stat label="Count exceptions" value={countExceptions.length} icon={<ClipboardCheck size={18} />} />
    </div>

    <section className="mt-4 grid gap-4 xl:grid-cols-2">
      <ChecklistCard kind="opening" record={checks.opening}
        onCheck={(id, value) => checks.actions.setCheck("opening", id, value)} onNotes={(value) => checks.actions.setNotes("opening", value)} onSign={() => sign("opening")} onReset={() => checks.actions.reset("opening")} />
      <ChecklistCard kind="closing" record={checks.closing}
        onCheck={(id, value) => checks.actions.setCheck("closing", id, value)} onNotes={(value) => checks.actions.setNotes("closing", value)} onSign={() => sign("closing")} onReset={() => checks.actions.reset("closing")} />
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Card>
        <CardHeader><CardTitle><Clock3 size={17} className="text-gold-700" /> Today’s action queue</CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { count: pendingRequests.length, label: "material requests awaiting staff issue", to: "/requests", tone: "amber" as const },
            { count: pendingReceipts.length, label: "goods receipts awaiting independent verification", to: "/registers", tone: "blue" as const },
            { count: expired.length, label: "expired lots requiring quarantine or disposal action", to: "/containers", tone: "red" as const },
            { count: countExceptions.length, label: "physical count exceptions requiring review", to: "/registers", tone: "amber" as const },
            { count: lowStock.length, label: "low-stock items needing reorder review", to: "/procurement", tone: "violet" as const },
          ].map((item) => <button key={item.label} type="button" onClick={() => nav(item.to)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-gold-400 hover:bg-gold-50">
            <Badge tone={item.tone}>{item.count}</Badge><span className="min-w-0 flex-1 text-[12.5px] font-semibold text-slate-700">{item.label}</span><ArrowRight size={15} className="shrink-0 text-slate-400" />
          </button>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><ThermometerSnowflake size={17} className="text-gold-700" /> FEFO pick guidance</CardTitle></CardHeader>
        <CardContent className="space-y-2.5">
          <p className="text-[11.5px] leading-relaxed text-slate-500">Use the earliest-expiring eligible lot first. Expired, depleted and disposed containers are excluded from this guide.</p>
          {fefo.map(({ chemical, container }) => <div key={chemical.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-[12.5px] font-bold text-ink">{chemical.name}</span><Badge tone={expiryState(container).state === "soon" ? "amber" : "gray"}>{expiryState(container).label}</Badge></div>
            <p className="pt-1 text-[11px] text-slate-500">Pick <b>{container.label}</b> · {fmtNum(container.qty)} {chemical.unit} · {container.location}</p>
          </div>)}
          {!fefo.length && <p className="text-sm text-slate-500">No eligible containers are available for FEFO picking.</p>}
          <Button variant="outline" size="sm" onClick={() => nav("/containers")}>Review all containers <ArrowRight size={14} /></Button>
        </CardContent>
      </Card>
    </section>

    <section className="mt-4 grid gap-4 lg:grid-cols-3">
      <Card><CardHeader><CardTitle>Receiving</CardTitle></CardHeader><CardContent><p className="text-[12px] leading-relaxed text-slate-500">Record a GRN with invoice, lot, expiry, delivered/accepted quantity and a separate verifier before stock posts.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => nav("/registers")}>Open GRN register <ArrowRight size={14} /></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Issue & return</CardTitle></CardHeader><CardContent><p className="text-[12px] leading-relaxed text-slate-500">Approve controlled indents, prepare custody handovers and close sessions with used, returned and waste quantities.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => nav("/registers")}>Open custody register <ArrowRight size={14} /></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Physical counts</CardTitle></CardHeader><CardContent><p className="text-[12px] leading-relaxed text-slate-500">Start blind counts, require an independent recount for variances and document any approved adjustment.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => nav("/registers")}>Open count register <ArrowRight size={14} /></Button></CardContent></Card>
    </section>
  </>;
}

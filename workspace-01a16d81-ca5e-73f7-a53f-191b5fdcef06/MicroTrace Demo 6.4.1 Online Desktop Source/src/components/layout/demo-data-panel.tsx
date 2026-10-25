import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { canManage } from "@/lib/auth";
import { saveBlob } from "@/lib/native";
import { todayISO } from "@/lib/format";
import { DEMO_PEOPLE, DEMO_STORE_KEY } from "@/demo/config";
import { restoreDemo } from "@/demo/seed";
import type { Role } from "@/lib/types";

export function DemoDataPanel({ role }: { role: Role | null }) {
  const { data } = useLabData();
  const { toast, err } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);

  async function exportDemo() {
    try {
      const snapshot = localStorage.getItem(DEMO_STORE_KEY);
      if (!snapshot) throw new Error("There is no saved demo snapshot to export.");
      const text = JSON.stringify(JSON.parse(snapshot), null, 2);
      await saveBlob(`MicroTrace-demo-backup-${todayISO()}.json`, new Blob([text], { type: "application/json" }));
      toast("Demo snapshot exported.");
    } catch (error) { err(error instanceof Error ? error.message : "Could not export the demo snapshot."); }
  }

  function reset() {
    if (!understood || !canManage(role)) return;
    try {
      restoreDemo();
      setConfirmOpen(false);
      setUnderstood(false);
      toast("Original demo restored. Dates now start from today; your profile and role are unchanged.");
    } catch { err("Could not restore the demo. Check available device storage and try again."); }
  }

  return (
    <>
      <section aria-labelledby="demo-data-title" className="bg-white rounded-2xl shadow-card border border-gold/30 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="demo-data-title" className="font-extrabold text-sm text-navy">Demo data</h2>
          <Badge tone="amber">Original sample lab restored</Badge>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">The records below come from your earlier MicroTrace demo, not a newly invented dataset. All edits stay in this separate demo app; no demo record is sent to a cloud database.</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["Inventory items", data?.chemicals.length ?? 0], ["Containers", data?.containers.length ?? 0],
            ["Requests", data?.requests.length ?? 0], ["Vendor prices", data?.prices.length ?? 0],
            ["Vendors", data?.vendors.length ?? 0], ["Purchase orders", data?.pos.length ?? 0],
            ["Practicals", data?.practicals.length ?? 0], ["Instrument bookings", data?.bookings.length ?? 0],
          ].map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3"><dd className="text-xl font-extrabold text-navy">{count}</dd><dt className="text-[11px] text-slate-500 mt-1">{label}</dt></div>)}
        </dl>
        <p className="text-[11px] text-slate-500 leading-relaxed">Expiry alerts, low-stock examples, the original breakage report and eight historical audit entries are included. Dates are relative to first launch or an explicit reset, and are not changed on every reload.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportDemo}><Download size={15} /> Export demo snapshot</Button>
          {canManage(role) && <Button onClick={() => { setUnderstood(false); setConfirmOpen(true); }}><RotateCcw size={15} /> Restore original demo data</Button>}
        </div>
        {!canManage(role) && <p className="text-[11px] text-slate-500">Switch to Lab staff or Principal to restore the original sample records.</p>}
        <p className="rounded-xl bg-gold-100/60 px-3 py-2.5 text-[11px] text-gold-700 leading-relaxed">For demonstrations only: prices, contacts, safety labels and practical requirements are examples, not current quotations or validated laboratory instructions.</p>
      </section>
      <section className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5 space-y-3">
        <h2 className="font-extrabold text-sm text-navy">People from the earlier demo</h2>
        <p className="text-xs text-slate-500 leading-relaxed">These seven sample people explain the names on the old records. This is an illustrative roster, not an email/password account system; the role PINs remain the entry method.</p>
        <ul className="divide-y divide-slate-100">
          {DEMO_PEOPLE.map((person) => <li key={person.id} className="py-3 flex flex-wrap justify-between gap-2 text-xs">
            <div className="min-w-0"><p className="font-bold text-ink break-words">{person.name}</p><p className="text-[11px] text-slate-400 mt-0.5 break-all">{person.email}</p></div>
            <div className="flex flex-wrap items-center gap-1.5 self-start"><Badge tone="navy">{person.role}</Badge><Badge tone={person.status === "active" ? "green" : "amber"}>{person.status}</Badge></div>
          </li>)}
        </ul>
      </section>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} ariaLabel="Restore original demo data">
        <DialogHeader title="Restore original demo data?" onClose={() => setConfirmOpen(false)} />
        <DialogBody>
          <p className="text-sm text-slate-600 leading-relaxed">This replaces all inventory, requests, purchasing, practicals, bookings and audit edits <b>inside this demo app only</b> with the original sample lab. Dates refresh to today.</p>
          <p className="text-xs text-slate-500">Your current profile and role are kept. The separate non-demo MicroTrace app is not touched. Export a snapshot first if you want a copy of your demo edits.</p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-600 cursor-pointer">
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#d9a226]" />
            I understand this replaces changes made in the demo app.
          </label>
        </DialogBody>
        <DialogFooter><Button onClick={() => setConfirmOpen(false)}>Keep my changes</Button><Button variant="danger" disabled={!understood} onClick={reset}>Reset demo data</Button></DialogFooter>
      </Dialog>
    </>
  );
}

import { BookOpenCheck, Database, Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DemoDataPanel } from "@/components/layout/demo-data-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_BUILD, DEMO_VERSION } from "@/demo/config";
import { useState } from "react";

const TABS = [
  { id: "about", label: "About" },
  { id: "workflows", label: "Workflow details" },
  ...(DEMO_BUILD ? [{ id: "records", label: "Records & maintenance" }] : []),
];

export default function DetailsPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState("about");
  return (
    <>
      <PageHeader title="Details" sub="Application information, workflow references and record maintenance." />
      <Tabs value={tab} onChange={setTab} items={TABS} className="mb-4" />
      {tab === "about" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle><Info size={17} className="text-gold-700" /> MicroTrace Demo</CardTitle></CardHeader><CardContent className="space-y-3 text-[12.5px] leading-relaxed text-slate-600">
          <p>Version <b className="text-ink">{DEMO_VERSION}</b> combines inventory, requests, procurement, practical planning, instrument bookings, registers, reporting and the Lab Desk workflow in one laboratory workspace.</p>
          <p>The supplied laboratory records are included for exploration and presentation. Use the record-maintenance tab to export or restore the starting dataset.</p>
          <div className="flex flex-wrap gap-2"><Badge tone="navy">Department of Microbiology</Badge><Badge tone="gold">MicroTrace Demo</Badge></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle><ShieldCheck size={17} className="text-gold-700" /> Access and record scope</CardTitle></CardHeader><CardContent className="space-y-3 text-[12.5px] leading-relaxed text-slate-600">
          <p>Role views organise work for students, teachers, lab staff and principals. This presentation release uses device-held role access and bundled records.</p>
          <p>For institutional deployment, use individually managed accounts, approved procedures and the organisation’s records policy.</p>
        </CardContent></Card>
      </div>}
      {tab === "workflows" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle><BookOpenCheck size={17} className="text-gold-700" /> Operational workflows</CardTitle></CardHeader><CardContent className="space-y-3 text-[12.5px] leading-relaxed text-slate-600">
          <p><b className="text-ink">Lab Desk:</b> issue reports route to a physical review; material and culture requirements route through the relevant academic and laboratory roles.</p>
          <p><b className="text-ink">Stock requests:</b> named stock requests remain separate from Lab Desk requirement slips so issue and fulfilment can be recorded in the relevant workflow.</p>
          <p><b className="text-ink">Breakage &amp; waste:</b> use this after a verified loss needs a dedicated record.</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle><Database size={17} className="text-gold-700" /> Registers reference</CardTitle></CardHeader><CardContent className="space-y-3 text-[12.5px] leading-relaxed text-slate-600">
          <p>Registers holds issue and purchase indents, goods receiving, custody handovers, practical closure, blind counts, investigations and local audit records.</p>
          <p>The workflow sequence is designed to make review points, decisions and follow-up visible in one place.</p>
        </CardContent></Card>
      </div>}
      {DEMO_BUILD && tab === "records" && <DemoDataPanel role={role} />}
    </>
  );
}

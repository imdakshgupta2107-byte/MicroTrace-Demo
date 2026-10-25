import { useMemo, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import type { Role } from "@/lib/types";
import { REQUIREMENT_KINDS, REPORT_KINDS } from "@/service-desk/presentation";
import { useServiceDesk } from "@/service-desk/store";
import type { DeskChannel, DeskPriority, ReportKind, RequirementKind } from "@/service-desk/types";

export function ServiceDeskForm({ channel, role, onClose }: { channel: DeskChannel; role: Role; onClose: () => void }) {
  const { data: lab } = useLabData();
  const { actions } = useServiceDesk();
  const { toast, err } = useToast();
  const [category, setCategory] = useState<ReportKind | RequirementKind>(channel === "report" ? "contamination" : "stock");
  const [priority, setPriority] = useState<DeskPriority>("routine");
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedHint = useMemo(() => (channel === "report" ? REPORT_KINDS : REQUIREMENT_KINDS).find((entry) => entry.value === category)?.hint, [channel, category]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const actor = { name: displayName(), role };
      if (channel === "report") {
        actions.createReport(actor, {
          category: category as ReportKind, priority, title, detail, location, related_item_id: itemId || null,
        });
        toast("Issue report sent to the Lab Desk. No stock balance was changed.");
      } else {
        actions.createRequest(actor, {
          category: category as RequirementKind, priority, title, detail, location, related_item_id: itemId || null,
          qty: qty ? Number(qty) : null, needed_by: neededBy || null,
        });
        toast(role === "student" ? "Requirement slip sent for teacher endorsement and lab-staff fulfilment." : "Requirement slip sent to the Lab Desk.");
      }
      onClose();
    } catch (error) { err(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  };

  const report = channel === "report";
  return (
    <Dialog open onClose={onClose} wide ariaLabel={report ? "Report a lab issue" : "Request material or culture"}>
      <DialogHeader
        title={report ? "Report a lab issue" : "Request material or culture"}
        onClose={onClose}
        sub={report
          ? "Creates a traceable review flag for lab staff. It never writes off or silently changes stock."
          : "Creates a routed requirement slip. Stock issue or procurement remains a separate controlled action."}
      />
      <DialogBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="desk-category" className="text-[11.5px] font-bold text-slate-600">{report ? "Issue type" : "Requirement type"}</label>
            <Select id="desk-category" value={category} onChange={(event) => setCategory(event.target.value as ReportKind | RequirementKind)} className="w-full">
              {(report ? REPORT_KINDS : REQUIREMENT_KINDS).map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </Select>
            {selectedHint && <p className="text-[11px] leading-snug text-slate-500">{selectedHint}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="desk-priority" className="text-[11.5px] font-bold text-slate-600">Priority</label>
            <Select id="desk-priority" value={priority} onChange={(event) => setPriority(event.target.value as DeskPriority)} className="w-full">
              <option value="routine">Routine</option>
              <option value="priority">Priority — needs timely review</option>
            </Select>
            <p className="text-[11px] leading-snug text-slate-500">For immediate safety risks, use the lab emergency procedure rather than this desk.</p>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="desk-title" className="text-[11.5px] font-bold text-slate-600">{report ? "What did you observe?" : "What do you need?"}</label>
          <Input id="desk-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={report ? "e.g. Bottle level below the marked scale" : "e.g. Pure E. coli culture for Batch B practical"} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="desk-item" className="text-[11.5px] font-bold text-slate-600">Related inventory item <span className="font-medium text-slate-400">(optional)</span></label>
            <Select id="desk-item" value={itemId} onChange={(event) => setItemId(event.target.value)} className="w-full">
              <option value="">— not listed / not sure —</option>
              {(lab?.chemicals ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="desk-location" className="text-[11.5px] font-bold text-slate-600">{report ? "Station / bay / cupboard" : "Collection or use location"}{report ? "" : " (optional)"}</label>
            <Input id="desk-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={report ? "e.g. Bay 3 preparation bench" : "e.g. Culture preparation room"} />
          </div>
        </div>
        {!report && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="desk-qty" className="text-[11.5px] font-bold text-slate-600">Quantity <span className="font-medium text-slate-400">(optional)</span></label>
            <Input id="desk-qty" type="number" min="0" step="any" value={qty} onChange={(event) => setQty(event.target.value)} placeholder="e.g. 500" />
          </div>
          <div className="space-y-1">
            <label htmlFor="desk-needed-by" className="text-[11.5px] font-bold text-slate-600">Needed by <span className="font-medium text-slate-400">(optional)</span></label>
            <Input id="desk-needed-by" type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} />
          </div>
        </div>}
        <div className="space-y-1">
          <label htmlFor="desk-detail" className="text-[11.5px] font-bold text-slate-600">{report ? "Observed condition and immediate action" : "Academic purpose, batch or research context"}</label>
          <Textarea id="desk-detail" value={detail} onChange={(event) => setDetail(event.target.value)} rows={4}
            placeholder={report ? "What happened, when was it noticed, and was the item set aside?" : "Include the practical/research purpose, class or batch, and any preparation details."} />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={report ? "danger" : "gold"} disabled={saving} onClick={submit}>{report ? "Submit issue report" : "Submit requirement"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

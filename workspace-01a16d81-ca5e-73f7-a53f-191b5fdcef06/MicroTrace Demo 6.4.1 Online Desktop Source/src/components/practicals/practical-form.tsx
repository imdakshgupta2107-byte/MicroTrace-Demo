// practical-form — teacher schedules a practical; students get it as a notice.
import { useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import { BK_SLOTS } from "@/lib/constants";
import { addDays } from "@/lib/format";
import type { PracticalChem } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export function PracticalForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [title, setTitle] = useState("");
  const [cls, setCls] = useState("");
  const [day, setDay] = useState(addDays(1));
  const [slot, setSlot] = useState(BK_SLOTS[0]);
  const [lines, setLines] = useState<PracticalChem[]>([{ chemical_id: "", qty: 1 }]);

  const save = async () => {
    if (!title.trim()) return err("Give the practical a title.");
    if (!cls.trim()) return err("Which class / batch?");
    const chems = lines.filter((l) => l.chemical_id && l.qty > 0);
    if (chems.length === 0) return err("Add at least one chemical with a quantity.");
    try {
      await mutate({
        kind: "insert", table: "practicals",
        row: { title: title.trim(), class_name: cls.trim(), scheduled_on: `${day}T${slot.split("–")[0]}:00`, chemicals: chems, created_by: displayName() },
        audit: `Scheduled practical ${title} (${cls})`,
      });
      toast("Scheduled — students see it in their notice strip.");
      setTitle(""); setCls(""); setLines([{ chemical_id: "", qty: 1 }]);
      onClose();
    } catch (e) { err(String(e)); }
  };

  return (
    <Dialog open={open} onClose={onClose} wide>
      <DialogHeader title="Schedule a practical" onClose={onClose}
        sub="Shows in student mode as a notice so they come prepared." />
      <DialogBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <label className="text-[11.5px] font-bold text-slate-600">Practical title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gram staining batch B" />
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Class / batch</label>
            <Input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="e.g. SY B" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11.5px] font-bold text-slate-600">Date</label>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[11.5px] font-bold text-slate-600">Slot</label>
              <Select value={slot} onChange={(e) => setSlot(e.target.value)}>
                {BK_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11.5px] font-bold text-slate-600">Chemicals needed</label>
            <Button size="sm" variant="outline" onClick={() => setLines((l) => [...l, { chemical_id: "", qty: 1 }])}>
              <Plus size={13} /> Line
            </Button>
          </div>
          {lines.map((ln, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={ln.chemical_id} className="flex-1"
                onChange={(e) => setLines((l) => l.map((x, j) => j === i ? { ...x, chemical_id: e.target.value } : x))}>
                <option value="">— chemical —</option>
                {(data?.chemicals ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
              </Select>
              <Input type="number" min={0.1} step="any" value={ln.qty} className="w-24"
                onChange={(e) => setLines((l) => l.map((x, j) => j === i ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))} />
              <Button size="sm" variant="ghost" onClick={() => setLines((l) => l.filter((_, j) => j !== i))} aria-label="remove line">
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="gold" onClick={save}>Schedule</Button>
      </DialogFooter>
    </Dialog>
  );
}

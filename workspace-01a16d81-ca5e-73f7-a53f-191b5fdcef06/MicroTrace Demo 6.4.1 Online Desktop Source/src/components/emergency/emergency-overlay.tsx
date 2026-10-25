// emergency-overlay — full-screen red safety sheet: first aid steps + numbers + log incident.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { AlertTriangle, PhoneCall } from "lucide-react";
import { FIRST_AID, EMERGENCY_NUMBERS, INCIDENT_KINDS } from "@/lib/constants";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { displayName } from "@/lib/student";
import type { IncidentKind, Role } from "@/lib/types";

export function EmergencyOverlay({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role | null }) {
  void role;
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [kind, setKind] = useState<IncidentKind>("spill");
  const [chemId, setChemId] = useState("");
  const [loc, setLoc] = useState("");
  const [desc, setDesc] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const log = async () => {
    if (!desc.trim()) return err("Describe what happened (one line is fine).");
    try {
      await mutate({
        kind: "insert", table: "incidents",
        row: {
          kind, chemical_id: chemId || null, location: loc || "—",
          description: desc.trim(), action_taken: action.trim(),
          reported_by: displayName(), occurred_at: new Date().toISOString(),
        },
        audit: `Incident logged (${kind})`,
      });
      toast("Incident logged to the audit trail.");
      setDesc(""); setAction(""); onClose();
    } catch (e) { err(String(e)); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#b01a1a] text-white animate-fadeIn" role="alertdialog" aria-label="Emergency">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold">
            <AlertTriangle size={28} /> EMERGENCY
          </h1>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="flex gap-2">
          <Select value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)}
            className="bg-white/10 border-white/25 text-white [&>option]:text-ink">
            {INCIDENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </Select>
        </div>

        <ol className="list-decimal pl-6 space-y-2 text-[16px] font-semibold leading-relaxed">
          {(FIRST_AID.find((f) => f.kind === kind) ?? FIRST_AID.find((f) => f.kind === "other"))?.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EMERGENCY_NUMBERS.map(([name, phone]) => (
            <a key={name} href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
              className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-center no-underline">
              <div className="text-xl font-extrabold">{phone}</div>
              <div className="text-[11px] text-white/80 inline-flex items-center gap-1"><PhoneCall size={10} />{name}</div>
            </a>
          ))}
        </div>

        <div className="rounded-2xl bg-white/10 p-4 space-y-3">
          <div className="font-extrabold text-[13px]">Log it (30 seconds, helps the next person)</div>
          <div className="grid grid-cols-2 gap-2.5">
            <Select value={chemId} onChange={(e) => setChemId(e.target.value)}
              className="bg-white/10 border-white/25 text-white [&>option]:text-ink">
              <option value="">chemical (optional)</option>
              {(data?.chemicals ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="where?"
              className="bg-white/10 border-white/25 text-white placeholder:text-white/50" />
          </div>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="what happened?"
            className="bg-white/10 border-white/25 text-white placeholder:text-white/50" />
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action taken so far"
            className="bg-white/10 border-white/25 text-white placeholder:text-white/50" />
          <div className="flex gap-2">
            <Button variant="gold" onClick={log}>Log incident</Button>
            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

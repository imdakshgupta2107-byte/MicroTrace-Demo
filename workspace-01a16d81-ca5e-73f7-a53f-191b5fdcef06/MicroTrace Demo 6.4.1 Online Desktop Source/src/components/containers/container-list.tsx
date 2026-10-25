// container-list — all bottles/packs with filters + group by chemical.
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import type { Chemical, Container } from "@/lib/types";
import { ContainerCard } from "./container-card";
import { ContainerForm } from "./container-form";
import { ContainerEmpty } from "./container-empty";
import { PromoteDialog } from "./promote-dialog";
import { ShelfVisualizer } from "./shelf-visualizer";

export function ContainerList({ canManage }: { canManage: boolean }) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [q, setQ] = useState("");
  const [chemF, setChemF] = useState("all");
  const [showDisposed, setShowDisposed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editCtl, setEditCtl] = useState<Container | null>(null);
  const [promote, setPromote] = useState<Container | null>(null);
  const dq = useDebounce(q, 200);

  const list = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return (data?.containers ?? []).filter((c) => {
      if (!showDisposed && c.state === "disposed") return false;
      if (chemF !== "all" && c.chemical_id !== chemF) return false;
      const chem = data?.chemicals.find((x) => x.id === c.chemical_id);
      if (s && !((c.label + " " + (chem?.name ?? "") + " " + (c.barcode ?? "") + " " + c.location).toLowerCase().includes(s))) return false;
      return true;
    });
  }, [data, dq, chemF, showDisposed]);

  const dispose = async (c: Container) => {
    try {
      await mutate({ kind: "update", table: "containers", id: c.id, patch: { state: "disposed", qty: 0 }, audit: `Disposed container ${c.label}` });
      toast("Container disposed and removed from stock.", "info");
    } catch (e) { err(String(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search label, barcode or location…" className="w-64" />
        <Select value={chemF} onChange={(e) => setChemF(e.target.value)}>
          <option value="all">All chemicals</option>
          {(data?.chemicals ?? []).map((c: Chemical) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
          <input type="checkbox" checked={showDisposed} onChange={(e) => setShowDisposed(e.target.checked)} />
          show disposed
        </label>
        <div className="flex-1" />
        {canManage && <Button variant="primary" onClick={() => { setEditCtl(null); setFormOpen(true); }}><Plus size={15} /> Add container</Button>}
      </div>
      {list.length > 0 && <ShelfVisualizer containers={list} onSelect={canManage ? (container) => { setEditCtl(container); setFormOpen(true); } : undefined} />}
      {list.length === 0 ? (
        <ContainerEmpty filtered={(data?.containers?.length ?? 0) > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((c) => (
            <div key={c.id} onDoubleClick={() => c.state === "sealed" && setPromote(c)}>
              <ContainerCard container={c}
                chemical={data?.chemicals.find((x) => x.id === c.chemical_id)}
                canManage={canManage}
                onEdit={() => { setEditCtl(c); setFormOpen(true); }}
                onDispose={() => dispose(c)} />
            </div>
          ))}
        </div>
      )}
      {formOpen && <ContainerForm open={formOpen} edit={editCtl} onClose={() => setFormOpen(false)} />}
      <PromoteDialog container={promote} onClose={() => setPromote(null)} />
    </div>
  );
}

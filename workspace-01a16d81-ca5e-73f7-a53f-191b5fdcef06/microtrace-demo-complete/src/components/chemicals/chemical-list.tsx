// chemical-list — filterable grid of chemical cards.
import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Chemical, Container, Vendor, VendorPrice } from "@/lib/types";
import { chemicalStock } from "@/lib/procurement";
import { ChemicalCard } from "./chemical-card";
import { ChemicalFilters, type ChemicalFilter } from "./chemical-filters";
import { ChemicalDetailSheet } from "./chemical-detail-sheet";
import { ChemicalForm } from "./chemical-form";
import { ChemicalEmpty } from "./chemical-empty";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";

export function ChemicalList({ chemicals, containers, prices, vendors, canManage, onRequestChem, onAddContainer }: {
  chemicals: Chemical[]; containers: Container[]; prices: VendorPrice[]; vendors: Vendor[];
  canManage: boolean;
  onRequestChem?: (c: Chemical) => void;
  onAddContainer?: (c: Chemical) => void;
}) {
  const [filter, setFilter] = useState<ChemicalFilter>({ q: "", category: "all", location: "all", onlyLow: false });
  const dq = useDebounce(filter.q, 200);
  const [openChem, setOpenChem] = useState<Chemical | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editChem, setEditChem] = useState<Chemical | null>(null);

  const locations = useMemo(() => [...new Set(containers.map((c) => c.location).filter(Boolean))].sort(), [containers]);

  const list = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return chemicals.filter((c) => {
      if (filter.category !== "all" && chemicalInventoryCategory(c).key !== filter.category) return false;
      const its = containers.filter((x) => x.chemical_id === c.id && x.state !== "disposed");
      if (filter.location !== "all" && !its.some((x) => x.location === filter.location)) return false;
      if (filter.onlyLow && chemicalStock(c, containers) > c.min_stock) return false;
      if (s && !((c.name + " " + c.supplier + " " + its.map((x) => (x.barcode ?? "") + " " + x.location).join(" ")).toLowerCase().includes(s))) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [chemicals, containers, filter, dq]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ChemicalFilters filter={filter} onChange={setFilter} locations={locations} />
        <div className="flex-1" />
        {canManage && (
          <Button variant="primary" onClick={() => { setEditChem(null); setFormOpen(true); }}>
            <Plus size={15} /> Add item
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <ChemicalEmpty filtered={chemicals.length > 0} canManage={canManage} onAdd={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((c) => (
            <ChemicalCard key={c.id} chemical={c} containers={containers} onOpen={() => setOpenChem(c)} />
          ))}
        </div>
      )}
      <ChemicalDetailSheet
        chemical={openChem} containers={containers} prices={prices} vendors={vendors}
        onClose={() => setOpenChem(null)} canManage={canManage}
        onRequest={onRequestChem && openChem ? () => { onRequestChem(openChem); setOpenChem(null); } : undefined}
        onAddContainer={onAddContainer && openChem ? () => { onAddContainer(openChem); setOpenChem(null); } : undefined}
        onEdit={canManage && openChem ? () => { setEditChem(openChem); setFormOpen(true); } : undefined}
      />
      {formOpen && <ChemicalForm open={formOpen} edit={editChem} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

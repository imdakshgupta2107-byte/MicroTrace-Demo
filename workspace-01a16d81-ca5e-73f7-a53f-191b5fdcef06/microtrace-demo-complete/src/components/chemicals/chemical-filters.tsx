import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SYSTEM_INVENTORY_CATEGORIES } from "@/lib/inventory-categories";

export interface ChemicalFilter { q: string; category: string; location: string; onlyLow: boolean; }

export function ChemicalFilters({ filter, onChange, locations }: {
  filter: ChemicalFilter; onChange: (f: ChemicalFilter) => void; locations: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={filter.q} onChange={(e) => onChange({ ...filter, q: e.target.value })}
        placeholder="Search name, supplier or barcode…" className="w-64" />
      <Select value={filter.category} onChange={(e) => onChange({ ...filter, category: e.target.value })}>
        <option value="all">All categories</option>
        {SYSTEM_INVENTORY_CATEGORIES.map((category) => <option key={category.key} value={category.key}>{category.display_name}</option>)}
      </Select>
      <Select value={filter.location} onChange={(e) => onChange({ ...filter, location: e.target.value })}>
        <option value="all">All locations</option>
        {locations.map((l) => <option key={l} value={l}>{l}</option>)}
      </Select>
      <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
        <input type="checkbox" checked={filter.onlyLow} onChange={(e) => onChange({ ...filter, onlyLow: e.target.checked })} />
        low stock only
      </label>
    </div>
  );
}

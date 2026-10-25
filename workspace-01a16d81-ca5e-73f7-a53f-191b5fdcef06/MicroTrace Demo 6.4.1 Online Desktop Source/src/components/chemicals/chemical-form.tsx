// chemical-form — catalog master with v3.5 semantic category and normalized unit selection.
import { useMemo, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { UnitSelector } from "@/components/units/unit-selector";
import { CategoryBadge } from "./category-badge";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { CATEGORIES, STORAGE_GROUPS, GHS_CODES } from "@/lib/constants";
import { wouldConflict } from "@/lib/compatibility";
import { lookupPubChem, pubchemOn } from "@/lib/pubchem";
import {
  SYSTEM_INVENTORY_CATEGORIES,
  categoryForKey,
  chemicalInventoryCategory,
  type InventoryCategory,
} from "@/lib/inventory-categories";
import { getCategoryColor } from "@/lib/category-colors";
import { findUnit, inferUnitCode, unitDimensionForCode } from "@/lib/units";
import type { Chemical, StorageGroup } from "@/lib/types";
import { Search } from "lucide-react";

const BLANK: Omit<Chemical, "id"> = {
  name: "",
  category: "Chemical",
  inventory_category_key: "general_reagent",
  unit: "mL",
  unit_code: "mL",
  unit_dimension: "volume",
  min_stock: 100,
  ghs: [],
  storage_group: "general",
  ppe: "",
  supplier: "",
  notes: "",
  pubchem_cid: null,
};

function lockedKeyForCatalogFamily(category: Chemical["category"]): string {
  if (category === "Culture Media") return "growth_media";
  if (category === "Glassware") return "glassware";
  if (category === "Instrument") return "instrument";
  if (category === "Culture") return "biohazard";
  return "general_reagent";
}

export function ChemicalForm({ open, onClose, edit }: {
  open: boolean; onClose: () => void; edit?: Chemical | null;
}) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const initial = edit ? {
    ...edit,
    inventory_category_key: edit.inventory_category_key ?? chemicalInventoryCategory(edit).key,
    unit_code: edit.unit_code ?? inferUnitCode(edit.unit, edit.storage_group),
    unit_dimension: edit.unit_dimension ?? unitDimensionForCode(edit.unit_code ?? inferUnitCode(edit.unit, edit.storage_group)),
  } : BLANK;
  const [f, setF] = useState<Omit<Chemical, "id">>(initial);
  const [pcLoading, setPcLoading] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  // Deliberately do not load user-defined color rows: category → color is a locked system rule.
  const availableCategories = useMemo<InventoryCategory[]>(() => SYSTEM_INVENTORY_CATEGORIES, []);

  const selectedUnit = findUnit(f.unit_code ?? inferUnitCode(f.unit, f.storage_group));
  const selectedCategory = categoryForKey(f.inventory_category_key, availableCategories);
  const selectedTheme = getCategoryColor(selectedCategory.key);

  const pubchem = async () => {
    if (!f.name.trim()) return err("Type the chemical name first (e.g. ‘ethanol’).");
    setPcLoading(true);
    const hit = await lookupPubChem(f.name.trim());
    setPcLoading(false);
    if (!hit) return toast("Not found in the PubChem lookup.", "info");
    setF((previous) => ({
      ...previous,
      pubchem_cid: hit.cid,
      ghs: hit.ghsCodes.length ? hit.ghsCodes : previous.ghs,
      notes: [hit.formula && `Formula: ${hit.formula}`, hit.mw && `MW: ${hit.mw} g/mol`, hit.iupac && `IUPAC: ${hit.iupac}`]
        .filter(Boolean).join("\n"),
    }));
    toast(`PubChem CID ${hit.cid} — ${hit.ghsCodes.length} hazard codes applied.`);
  };

  const save = async () => {
    if (!f.name.trim()) return err("Name is required.");
    if (!f.inventory_category_key) return err("Choose a chemical type/category.");
    if (!selectedUnit) return err("Choose a scientific unit.");

    // Never persist a user-supplied color: normalize to a known system key.
    const inventoryCategoryKey = selectedCategory.key;

    const normalizedMin = Number(f.min_stock) * Number(selectedUnit.scaleToBase);
    const row = {
      ...f,
      name: f.name.trim(),
      inventory_category_key: inventoryCategoryKey,
      unit: selectedUnit.symbol,
      unit_code: selectedUnit.code,
      unit_dimension: selectedUnit.dimension,
      min_stock_base: Number.isFinite(normalizedMin) ? normalizedMin : undefined,
    };

    try {
      if (edit) {
        await mutate({ kind: "update", table: "chemicals", id: edit.id, patch: row, audit: `Edited chemical ${row.name}` });
        toast("Chemical updated.");
      } else {
        await mutate({ kind: "insert", table: "chemicals", row, audit: `Added chemical ${row.name}` });
        toast("Chemical added — now create its first bottle in Containers.");
      }
      onClose();
    } catch (error) {
      err(String(error));
    }
  };

  const conflict = data
    ? wouldConflict(f.storage_group as StorageGroup, "(check per bottle location)", data.chemicals, data.containers)
    : null;

  return (
    <Dialog open={open} onClose={onClose} wide={false}>
      <DialogHeader
        title={edit ? "Edit item" : "Add item"}
        onClose={onClose}
        sub="Catalog master — physical bottles live under Containers. Amounts are normalized to a scientific base unit."
      />
      <DialogBody>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Name *</label>
          <div className="flex gap-2">
            <Input value={f.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Ethanol 95%" />
            {pubchemOn() && (
              <Button variant="outline" onClick={pubchem} disabled={pcLoading}>
                <Search size={14} /> {pcLoading ? "…" : "PubChem"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Catalog family</label>
            <Select
              value={f.category}
              onChange={(event) => {
                const category = event.target.value as Chemical["category"];
                setF((previous) => ({ ...previous, category, inventory_category_key: lockedKeyForCatalogFamily(category) }));
              }}
            >
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Chemical type / visual category *</label>
            <Select value={selectedCategory.key} onChange={(event) => set("inventory_category_key", event.target.value)}>
              {availableCategories.map((category) => <option key={category.key} value={category.key}>{category.display_name}</option>)}
            </Select>
            <div className={`mt-1.5 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-navy ${selectedTheme.softBackground} ${selectedTheme.border}`}>
              <span className="text-[11px] font-extrabold">Automatic locked color</span>
              <CategoryBadge category={selectedCategory} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UnitSelector
            id="chemical-base-unit"
            label="Stock unit *"
            dimension={f.unit_dimension ?? "volume"}
            value={f.unit_code ?? "mL"}
            onChange={(code) => {
              const unit = findUnit(code);
              if (unit) setF((previous) => ({ ...previous, unit_code: unit.code, unit: unit.symbol, unit_dimension: unit.dimension }));
            }}
          />
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Quantity kind</label>
            <Select
              value={f.unit_dimension ?? "volume"}
              onChange={(event) => {
                const dimension = event.target.value as NonNullable<Chemical["unit_dimension"]>;
                const first = { mass: "mg", volume: "mL", length: "mm", substance_amount: "mmol", mass_concentration: "mg_per_mL", molar_concentration: "mM", count: "pcs" }[dimension];
                const unit = findUnit(first)!;
                setF((previous) => ({ ...previous, unit_dimension: dimension, unit_code: unit.code, unit: unit.symbol }));
              }}
            >
              <option value="mass">Mass</option>
              <option value="volume">Volume</option>
              <option value="mass_concentration">Mass concentration</option>
              <option value="molar_concentration">Molar concentration</option>
              <option value="substance_amount">Amount of substance</option>
              <option value="length">Length</option>
              <option value="count">Count / packs</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Low-stock at ({selectedUnit?.symbol ?? f.unit})</label>
            <Input type="number" min={0} step="any" value={f.min_stock} onChange={(event) => set("min_stock", parseFloat(event.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Storage group</label>
            <Select value={f.storage_group} onChange={(event) => set("storage_group", event.target.value as StorageGroup)}>
              {STORAGE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Supplier</label>
          <Input value={f.supplier} onChange={(event) => set("supplier", event.target.value)} placeholder="e.g. HiMedia" />
        </div>

        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">GHS pictograms</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GHS_CODES).map(([code, meta]) => {
              const enabled = f.ghs.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  title={meta.label}
                  aria-pressed={enabled}
                  onClick={() => set("ghs", enabled ? f.ghs.filter((hazard) => hazard !== code) : [...f.ghs, code])}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 ${enabled ? "border-[#d33] bg-red-50 text-[#9f1d1d]" : "border-slate-200 text-slate-400"}`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border border-current bg-white text-[8px] rotate-45">
                    <span className="-rotate-45">{code.replace("GHS", "")}</span>
                  </span>
                  {meta.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">PPE / handling note</label>
          <Input value={f.ppe} onChange={(event) => set("ppe", event.target.value)} placeholder="e.g. Gloves + goggles; use in fume hood" />
        </div>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Notes</label>
          <Textarea value={f.notes} onChange={(event) => set("notes", event.target.value)} rows={2} placeholder="MW, formula, recipe hints…" />
        </div>
        {conflict && <Alert kind="warn" title="Storage advisory">Placing a <b>{f.storage_group}</b> chemical next to an incompatible group in the same location will raise a conflict flag.</Alert>}
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>{edit ? "Save changes" : "Add item"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

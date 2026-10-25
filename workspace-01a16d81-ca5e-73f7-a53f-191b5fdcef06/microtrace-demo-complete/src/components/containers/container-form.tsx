// container-form — physical bottle/pack with barcode, expiry and normalized unit input.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UnitSelector } from "@/components/units/unit-selector";
import { useLabData } from "@/hooks/useLabData";
import { DEMO_BUILD } from "@/demo/config";
import { useToast } from "@/hooks/useToast";
import { barcodeKey, parseBarcode } from "@/lib/barcode";
import { convertFromBase, findUnit, inferUnitCode, normalizeToBase, unitDimensionForCode } from "@/lib/units";
import { CONTAINER_TYPE_OPTIONS, containerTypeFromLabel, getContainerColor } from "@/lib/category-colors";
import { ContainerTypeBadge } from "./container-type-badge";
import type { Chemical, Container, ContainerType } from "@/lib/types";

export function ContainerForm({ open, onClose, edit, preChem }: {
  open: boolean; onClose: () => void; edit?: Container | null; preChem?: Chemical | null;
}) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [f, setF] = useState<Omit<Container, "id">>(() => edit ? {
    ...edit,
    container_type: edit.container_type ?? containerTypeFromLabel(edit.label),
  } : {
    chemical_id: preChem?.id ?? "", label: "", container_type: "storage_glassware", barcode: null, qty: 0, unit_size: 0,
    location: "", expiry: null, state: "sealed", opened_at: null, use_by: null,
  });
  const [barcodeText, setBarcodeText] = useState(edit?.barcode ?? "");
  const chemical = useMemo(
    () => (data?.chemicals ?? []).find((item) => item.id === f.chemical_id) ?? preChem ?? null,
    [data?.chemicals, f.chemical_id, preChem],
  );
  const masterUnitCode = chemical?.unit_code ?? inferUnitCode(chemical?.unit ?? "pcs", chemical?.storage_group);
  const masterUnit = findUnit(masterUnitCode);
  const dimension = masterUnit?.dimension ?? unitDimensionForCode(masterUnitCode);
  const [qtyInput, setQtyInput] = useState(String(edit?.qty ?? 0));
  const [unitSizeInput, setUnitSizeInput] = useState(String(edit?.unit_size ?? 0));
  const [qtyUnitCode, setQtyUnitCode] = useState(edit?.qty_input_unit_code ?? masterUnitCode);
  const [unitSizeUnitCode, setUnitSizeUnitCode] = useState(edit?.unit_size_input_unit_code ?? masterUnitCode);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((previous) => ({ ...previous, [key]: value }));
  const containerType = f.container_type ?? containerTypeFromLabel(f.label);
  const containerTheme = getContainerColor(containerType);

  useEffect(() => {
    if (!masterUnit) return;
    const quantityInputUnit = findUnit(qtyUnitCode);
    const fullInputUnit = findUnit(unitSizeUnitCode);
    if (!quantityInputUnit || quantityInputUnit.dimension !== masterUnit.dimension) setQtyUnitCode(masterUnit.code);
    if (!fullInputUnit || fullInputUnit.dimension !== masterUnit.dimension) setUnitSizeUnitCode(masterUnit.code);
  }, [masterUnit?.code, masterUnit?.dimension, qtyUnitCode, unitSizeUnitCode]);

  const applyBarcode = (raw: string) => {
    setBarcodeText(raw);
    const parsed = parseBarcode(raw);
    set("barcode", barcodeKey(parsed));
    if (parsed.expiry && !f.expiry) set("expiry", parsed.expiry);
  };

  const save = async () => {
    if (!f.chemical_id || !chemical || !masterUnit) return err("Pick the chemical this bottle contains.");
    const qtyUnit = findUnit(qtyUnitCode);
    const fullUnit = findUnit(unitSizeUnitCode);
    const qtyNumber = Number(qtyInput);
    const fullNumber = Number(unitSizeInput);
    if (!qtyUnit || !fullUnit || !Number.isFinite(qtyNumber) || qtyNumber < 0 || !Number.isFinite(fullNumber) || fullNumber < 0) {
      return err("Enter non-negative quantity and bottle size values.");
    }
    if (!f.location.trim()) return err("Location is required (shelf / cupboard).");

    const qtyBase = normalizeToBase(qtyInput, qtyUnit);
    const fullBase = normalizeToBase(unitSizeInput, fullUnit);
    const qtyInMasterUnit = Number(convertFromBase(qtyBase, masterUnit));
    const sizeInMasterUnit = Number(convertFromBase(fullBase, masterUnit));
    const row = {
      ...f,
      barcode: barcodeText || null,
      label: f.label || "Container",
      container_type: containerType,
      qty: qtyInMasterUnit,
      unit_size: sizeInMasterUnit,
      qty_base: qtyBase,
      unit_size_base: fullBase,
      unit_code: masterUnit.code,
      unit_dimension: masterUnit.dimension,
      qty_input_unit_code: qtyUnit.code,
      unit_size_input_unit_code: fullUnit.code,
    };

    try {
      if (edit) {
        await mutate({ kind: "update", table: "containers", id: edit.id, patch: row, audit: `Edited container ${row.label}` });
        toast("Container updated.");
      } else {
        await mutate({ kind: "insert", table: "containers", row: { ...row, created_at: new Date().toISOString() }, audit: `Added container ${row.label}` });
        toast("Container added to stock.");
      }
      onClose();
    } catch (error) {
      err(String(error));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title={edit ? "Edit container" : "Add container"} onClose={onClose}
        sub="One physical bottle/pack with its own quantity, barcode and expiry." />
      <DialogBody>
        <div className="space-y-1">
          <label className="text-[11.5px] font-bold text-slate-600">Chemical</label>
          <Select value={f.chemical_id} onChange={(event) => set("chemical_id", event.target.value)} className="w-full" disabled={!!preChem && !edit}>
            <option value="">— pick chemical —</option>
            {(data?.chemicals ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="col-span-1 space-y-1 sm:col-span-2">
            <label className="text-[11.5px] font-bold text-slate-600">Label (what's handwritten on the bottle)</label>
            <Input value={f.label} onChange={(event) => set("label", event.target.value)} placeholder="e.g. Amber bottle 1 · M1 cupboard" />
          </div>
          <div className="col-span-1 space-y-1 sm:col-span-2">
            <label className="text-[11.5px] font-bold text-slate-600">Container / vessel type *</label>
            <Select value={containerType} onChange={(event) => set("container_type", event.target.value as ContainerType)}>
              {CONTAINER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <div className={`mt-1.5 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-navy ${containerTheme.softBackground} ${containerTheme.border}`}>
              <span className="text-[11px] font-extrabold">Automatic locked color</span>
              <ContainerTypeBadge type={containerType} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Qty remaining</label>
            <Input type="number" min={0} step="any" value={qtyInput} onChange={(event) => setQtyInput(event.target.value)} />
          </div>
          <UnitSelector id="container-qty-unit" label="Quantity unit" dimension={dimension} value={qtyUnitCode} onChange={setQtyUnitCode} />
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Full bottle size</label>
            <Input type="number" min={0} step="any" value={unitSizeInput} onChange={(event) => setUnitSizeInput(event.target.value)} />
          </div>
          <UnitSelector id="container-size-unit" label="Bottle size unit" dimension={dimension} value={unitSizeUnitCode} onChange={setUnitSizeUnitCode} />
          {masterUnit && <p className="col-span-1 text-[11px] text-slate-500 sm:col-span-2">Stock is stored canonically as {masterUnit.dimension === "mass" ? "g" : masterUnit.dimension === "volume" ? "L" : masterUnit.symbol}; the catalogue displays {masterUnit.symbol}.</p>}
          <div className="col-span-1 space-y-1 sm:col-span-2">
            <label className="text-[11.5px] font-bold text-slate-600">Barcode (scan the pre-printed sticker or type it)</label>
            <Input value={barcodeText} onChange={(event) => applyBarcode(event.target.value)} placeholder="e.g. 89060010 00001 or GS1-128" />
          </div>
          <div className="col-span-1 space-y-1 sm:col-span-2">
            <label className="text-[11.5px] font-bold text-slate-600">Location</label>
            <Input value={f.location} onChange={(event) => set("location", event.target.value)} placeholder="e.g. Chem Store A · Shelf 1" />
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Expiry (optional)</label>
            <Input type="date" value={f.expiry ?? ""} onChange={(event) => set("expiry", event.target.value || null)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">State</label>
            <Select value={f.state} onChange={(event) => set("state", event.target.value as Container["state"])}>
              <option value="sealed">Sealed</option><option value="opened">Opened</option>
              <option value="depleted">Depleted</option>{DEMO_BUILD && <option value="quarantined">Quarantined / do not issue</option>}<option value="disposed">Disposed</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Opened on (if opened)</label>
            <Input type="date" value={f.opened_at ?? ""} onChange={(event) => set("opened_at", event.target.value || null)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-600">Use-by override (optional)</label>
            <Input type="date" value={f.use_by ?? ""} onChange={(event) => set("use_by", event.target.value || null)} />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>{edit ? "Save changes" : "Add container"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

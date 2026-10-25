import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/hooks/useLabData";
import { VendorCard } from "./vendor-card";
import { VendorForm } from "./vendor-form";
import { VendorPriceForm } from "./vendor-price-form";
import { VendorEmpty } from "./vendor-empty";
import type { Vendor } from "@/lib/types";

export function VendorList() {
  const { data } = useLabData();
  const [vForm, setVForm] = useState<{ open: boolean; edit: Vendor | null }>({ open: false, edit: null });
  const [pForm, setPForm] = useState<{ open: boolean; vendor: Vendor | null }>({ open: false, vendor: null });
  const vendors = data?.vendors ?? [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setVForm({ open: true, edit: null })}><Plus size={15} /> Add vendor</Button>
      </div>
      {vendors.length === 0 ? <VendorEmpty /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {vendors.map((v) => (
            <VendorCard key={v.id} vendor={v} prices={data?.prices ?? []} chemicals={data?.chemicals ?? []}
              onEdit={() => setVForm({ open: true, edit: v })}
              onAddPrice={() => setPForm({ open: true, vendor: v })} />
          ))}
        </div>
      )}
      {vForm.open && <VendorForm open={vForm.open} edit={vForm.edit} onClose={() => setVForm({ open: false, edit: null })} />}
      {pForm.open && <VendorPriceForm open={pForm.open} preVendor={pForm.vendor} onClose={() => setPForm({ open: false, vendor: null })} />}
    </div>
  );
}

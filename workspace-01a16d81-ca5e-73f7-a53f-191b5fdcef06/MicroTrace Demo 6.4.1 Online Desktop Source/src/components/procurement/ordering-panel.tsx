// ordering-panel — the Procurement page body: slot legend, alerts w/ comparison, cart.
import { useMemo, useState } from "react";
import { useLabData } from "@/hooks/useLabData";
import { stockAlerts } from "@/lib/procurement";
import type { SlotCode } from "@/lib/types";
import { SlotLegend } from "./slot-badges";
import { PriceComparisonTable } from "./price-comparison-table";
import { OrderCart, type CartItem } from "./order-cart";
import { EmptyAlerts } from "./empty-alerts";
import { PurchaseOrderDialog } from "./purchase-order-dialog";

export function OrderingPanel() {
  const { data } = useLabData();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [po, setPo] = useState<{ slot: SlotCode | null; group: CartItem[] }>({ slot: null, group: [] });
  const alerts = useMemo(() => data ? stockAlerts(data.chemicals, data.containers, data.prices, data.vendors) : [], [data]);

  const add = (alert: (typeof alerts)[number], vendorIdx: number) => {
    const price = alert.comparisons[vendorIdx];
    if (!price) return;
    const packs = Math.max(1, Math.ceil((alert.chemical.min_stock + alert.shortfall) / price.pack_size));
    const slot: SlotCode = alert.stock <= 0 || alert.shortfall >= alert.chemical.min_stock ? "weekly"
      : alert.stock < alert.chemical.min_stock * 0.7 ? "monthly" : "yearly";
    setCart((c) => [...c, { chemical: alert.chemical, price, packs, slot }]);
  };

  const inCart = (alert: (typeof alerts)[number]) => cart.some((c) => c.chemical.id === alert.chemical.id);

  return (
    <div className="space-y-4">
      <SlotLegend />
      {alerts.length === 0 ? <EmptyAlerts /> : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <div className="xl:col-span-2 space-y-3">
            {alerts.map((a) => (
              <PriceComparisonTable key={a.chemical.id} alert={a} inCart={inCart(a)}
                onAddToCart={(vi) => !inCart(a) && add(a, vi)} />
            ))}
          </div>
          <OrderCart items={cart} vendors={data?.vendors ?? []} busy={!!po.slot}
            onPacks={(i, n) => setCart((c) => c.map((it, j) => j === i ? { ...it, packs: n } : it))}
            onRemove={(i) => setCart((c) => c.filter((_, j) => j !== i))}
            onRaise={(slot, group) => setPo({ slot, group })} />
        </div>
      )}
      <PurchaseOrderDialog slot={po.slot} group={po.group} onClose={() => setPo({ slot: null, group: [] })}
        onDone={() => setCart((c) => c.filter((it) => !po.group.includes(it)))} />
    </div>
  );
}

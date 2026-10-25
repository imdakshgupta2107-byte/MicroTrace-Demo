import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtINR, fmtNum } from "@/lib/format";
import type { StockAlert } from "@/lib/types";

export function PriceComparisonTable({ alert, onAddToCart, inCart }: {
  alert: StockAlert; onAddToCart: (vendorIdx: number) => void; inCart: boolean;
}) {
  const c = alert.chemical;
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[13.5px] text-ink">{c.name}</div>
          <div className="text-[11.5px] text-slate-500">
            stock {fmtNum(alert.stock)} {c.unit} · min {fmtNum(c.min_stock)} · shortfall {fmtNum(alert.shortfall)} {c.unit}
          </div>
        </div>
        <Badge tone="red">low</Badge>
      </div>
      {alert.comparisons.length === 0 ? (
        <div className="text-[12px] text-slate-500">No vendor prices recorded yet — add them on the Vendors page to compare.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate-400 font-bold [&>th]:py-1 [&>th]:pr-3">
                <th>Vendor</th><th>Pack</th><th>Price</th><th>₹/{c.unit}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {alert.comparisons.map((cmp, i) => (
                <tr key={cmp.id} className={`border-t border-slate-100 ${cmp.is_best ? "bg-gold-100/60" : ""}`}>
                  <td className="py-1.5 pr-3 font-semibold text-ink">{cmp.vendor_name}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{cmp.pack_label}</td>
                  <td className="py-1.5 pr-3">{fmtINR(cmp.price_inr)}</td>
                  <td className="py-1.5 pr-3 font-bold">
                    {fmtINR(cmp.per_unit, 2)} {cmp.is_best && <Badge tone="gold">best</Badge>}
                  </td>
                  <td className="py-1.5 text-right">
                    <Button size="sm" variant={inCart ? "outline" : "gold"} onClick={() => onAddToCart(i)} disabled={inCart}>
                      {inCart ? "In cart" : "Add"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

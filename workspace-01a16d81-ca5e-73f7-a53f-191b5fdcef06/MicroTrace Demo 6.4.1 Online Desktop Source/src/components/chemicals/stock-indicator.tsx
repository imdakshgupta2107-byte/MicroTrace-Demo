import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/format";
import type { Chemical, Container } from "@/lib/types";
import { chemicalStock } from "@/lib/procurement";

export function StockIndicator({ chemical, containers, compact }: {
  chemical: Chemical; containers: Container[]; compact?: boolean;
}) {
  const stock = chemicalStock(chemical, containers);
  const low = stock <= chemical.min_stock;
  const pct = chemical.min_stock > 0 ? Math.min(1, stock / (chemical.min_stock * 2.5)) : 1;
  return (
    <div className="min-w-[110px]">
      <div className="flex items-center gap-2">
        <span className={`font-extrabold ${low ? "text-red-700" : "text-ink"}`}>
          {fmtNum(stock)} {chemical.unit}
        </span>
        {low && <Badge tone="red">low</Badge>}
      </div>
      {!compact && <Progress value={pct} className="mt-1.5" />}
      {!compact && <div className="text-[10.5px] text-slate-400 mt-0.5">min {fmtNum(chemical.min_stock)} {chemical.unit}</div>}
    </div>
  );
}

import type { Chemical, Container } from "@/lib/types";
import { StockIndicator } from "./stock-indicator";
import { SafetyStrip } from "./safety-strip";
import { CategoryBadge } from "./category-badge";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { getCategoryColor } from "@/lib/category-colors";

export function ChemicalCard({ chemical, containers, onOpen }: {
  chemical: Chemical; containers: Container[]; onOpen: () => void;
}) {
  const mine = containers.filter((container) => container.chemical_id === chemical.id && container.state !== "disposed");
  const visualCategory = chemicalInventoryCategory(chemical);
  const theme = getCategoryColor(visualCategory.key);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${chemical.name}; ${visualCategory.display_name}`}
      className={`w-full border border-slate-100 border-l-4 ${theme.accentBorder} bg-white p-4 text-left space-y-2 rounded-2xl shadow-card transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold leading-snug text-ink">{chemical.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-500">
            {mine.length} container{mine.length === 1 ? "" : "s"} · {chemical.supplier || "no supplier noted"}
          </div>
        </div>
        <SafetyStrip ghs={chemical.ghs} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <CategoryBadge category={visualCategory} />
        <StockIndicator chemical={chemical} containers={containers} compact />
      </div>
    </button>
  );
}

import { Badge } from "@/components/ui/badge";
import type { SlotCode } from "@/lib/types";

const TONE: Record<SlotCode, "gold" | "blue" | "green"> = { weekly: "gold", monthly: "blue", yearly: "green" };

export function SlotBadge({ slot }: { slot: SlotCode }) {
  const label = slot === "weekly" ? "Weekly" : slot === "monthly" ? "Monthly" : "Yearly";
  return <Badge tone={TONE[slot]}>{label}</Badge>;
}

export function SlotLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 items-center">
      <span>Ordering slots:</span>
      <SlotBadge slot="weekly" /> urgent / depleting fast
      <SlotBadge slot="monthly" /> routine top-up
      <SlotBadge slot="yearly" /> annual bulk buy
    </div>
  );
}

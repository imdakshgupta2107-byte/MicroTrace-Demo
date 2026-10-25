import { EmptyState } from "@/components/ui/empty-state";
export function EmptyAlerts() {
  return <EmptyState title="Stock looks healthy"
    hint="No chemical is at or below its low-stock threshold. Once stocks dip, replacement advice with per-unit price comparison appears here." />;
}

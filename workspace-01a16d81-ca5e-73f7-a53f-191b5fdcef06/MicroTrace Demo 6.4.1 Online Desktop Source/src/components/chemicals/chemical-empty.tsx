import { EmptyState } from "@/components/ui/empty-state";

export function ChemicalEmpty({ filtered, onAdd, canManage }: {
  filtered: boolean; onAdd?: () => void; canManage: boolean;
}) {
  return filtered
    ? <EmptyState title="No chemicals match" hint="Try a different search, category or location filter." />
    : <EmptyState title="No chemicals yet"
        hint={canManage ? "Add the first chemical master — bottles go in as containers afterwards." : "The register is empty for now."} />;
}

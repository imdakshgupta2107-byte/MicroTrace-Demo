import { EmptyState } from "@/components/ui/empty-state";

export function ContainerEmpty({ filtered }: { filtered: boolean }) {
  return filtered
    ? <EmptyState title="No containers match" hint="Try clearing the search or chemical filter." />
    : <EmptyState title="No containers yet" hint="Add the first bottle — attach its pre-printed barcode and expiry." />;
}

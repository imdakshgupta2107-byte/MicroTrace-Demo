import { EmptyState } from "@/components/ui/empty-state";

export function RequestEmpty({ approver }: { approver: boolean }) {
  return (
    <EmptyState title="Nothing here"
      hint={approver ? "No requests match this filter — students' requests appear here for review." : "You haven't raised any requests yet — tap “New request”."} />
  );
}

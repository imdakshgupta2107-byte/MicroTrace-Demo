// promote-dialog — move a container up/down a location or mark it opened/sealed-label.
// Promote = "put into service": sealed → opened with opened_at = today.
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import { todayISO } from "@/lib/format";
import type { Container } from "@/lib/types";

export function PromoteDialog({ container, onClose }: { container: Container | null; onClose: () => void }) {
  const { mutate } = useLabData();
  const { toast, err } = useToast();
  if (!container) return null;
  const promote = async () => {
    try {
      await mutate({
        kind: "update", table: "containers", id: container.id,
        patch: { state: "opened", opened_at: todayISO() },
        audit: `Opened container ${container.label || container.id}`,
      });
      toast("Moved into service — 6-month degradation watch started.");
      onClose();
    } catch (e) { err(String(e)); }
  };
  return (
    <Dialog open={!!container} onClose={onClose}>
      <DialogHeader title="Open this bottle into service?" onClose={onClose} />
      <DialogBody>
        <p className="text-[13px] text-slate-600">
          <b>{container.label || "Container"}</b> is currently sealed. Opening it marks
          today as the opened date; MicroTrace starts the 6-month degradation watch for this bottle.
        </p>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Keep sealed</Button>
        <Button variant="gold" onClick={promote}>Open into service</Button>
      </DialogFooter>
    </Dialog>
  );
}

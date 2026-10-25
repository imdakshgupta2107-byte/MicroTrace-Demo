import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLabData } from "@/hooks/useLabData";
import { useToast } from "@/hooks/useToast";
import type { Role } from "@/lib/types";
import { PracticalForm } from "./practical-form";
import { PracticalCard } from "./practical-card";

export function PracticalList({ role }: { role: Role | null }) {
  const { data, mutate } = useLabData();
  const { toast, err } = useToast();
  const [open, setOpen] = useState(false);
  const canSchedule = role === "teacher" || role === "staff" || role === "principal";
  const ps = data?.practicals ?? [];

  const cancel = async (id: string) => {
    try {
      await mutate({ kind: "delete", table: "practicals", id, audit: "Cancelled practical" });
      toast("Practical cancelled.", "info");
    } catch (e) { err(String(e)); }
  };

  return (
    <div className="space-y-4">
      {canSchedule && (
        <div className="flex justify-end">
          <Button variant="gold" onClick={() => setOpen(true)}><Plus size={15} /> Schedule practical</Button>
        </div>
      )}
      {ps.length === 0 ? (
        <EmptyState title="No practicals scheduled"
          hint={canSchedule ? "Schedule one — students see it as a notice with the chemical list." : "Your teacher's scheduled practicals appear here."} />
      ) : (
        <div className="space-y-2.5">
          {ps.map((p) => (
            <PracticalCard key={p.id} p={p} chemicals={data?.chemicals ?? []}
              canCancel={canSchedule} onCancel={() => cancel(p.id)} />
          ))}
        </div>
      )}
      {open && <PracticalForm open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

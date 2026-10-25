import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, MenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Barcode as BarcodeIcon } from "lucide-react";
import { expiryState, expiryBadge, degradationState } from "@/lib/expiry";
import { fmtNum } from "@/lib/format";
import { containerTypeFromLabel, getContainerColor } from "@/lib/category-colors";
import { ContainerTypeBadge } from "./container-type-badge";
import type { Chemical, Container } from "@/lib/types";

export function ContainerCard({ container, chemical, canManage, onEdit, onDispose }: {
  container: Container; chemical: Chemical | undefined; canManage: boolean;
  onEdit: () => void; onDispose: () => void;
}) {
  const exp = expiryState(container);
  const deg = degradationState(container);
  const pctFull = container.unit_size > 0 ? Math.min(1, container.qty / container.unit_size) : 1;
  const vesselType = container.container_type ?? containerTypeFromLabel(container.label);
  const theme = getContainerColor(vesselType);
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-slate-100 border-l-4 ${theme.accentBorder} p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[13.5px] text-ink truncate">{container.label || "Container"}</div>
          <div className="text-[11.5px] text-slate-500">{chemical?.name ?? "(chemical removed)"}</div>
        </div>
        <div className="flex items-center gap-1">
          {container.barcode && <BarcodeIcon size={14} className="text-slate-400" aria-label="barcoded" />}
          {canManage && (
            <DropdownMenu trigger={<span className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><MoreVertical size={15} /></span>}>
              <MenuItem onClick={onEdit}><Pencil size={13} /> Edit</MenuItem>
              <MenuItem danger onClick={onDispose}><Trash2 size={13} /> Dispose / write off</MenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[12.5px]">
        <ContainerTypeBadge type={vesselType} />
        <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${expiryBadge(exp)}`}>{exp.label}</span>
      </div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="font-extrabold text-ink">{fmtNum(container.qty)}{container.unit_size ? `/${fmtNum(container.unit_size)}` : ""} <span className="font-semibold text-slate-500">{chemical?.unit}</span></span>
      </div>
      <Progress value={pctFull} />
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        <span>{container.location}</span> · <Badge tone={container.state === "quarantined" ? "red" : "gray"}>{container.state === "quarantined" ? "quarantined · do not issue" : container.state}</Badge>
        {deg && <span className={deg.pct < 0.3 ? "text-red-700 font-bold" : ""}>{deg.label}</span>}
      </div>
    </div>
  );
}

// emergency-strip — slim first-aid card, usable under a chemical or workbench tool.
import { FIRST_AID } from "@/lib/constants";
import type { IncidentKind } from "@/lib/types";

export function EmergencyStrip({ kind }: { kind: IncidentKind }) {
  const fa = FIRST_AID.find((f) => f.kind === kind) ?? FIRST_AID.find((f) => f.kind === "other");
  if (!fa) return null;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
      <div className="text-[11px] font-extrabold tracking-wide text-red-800">FIRST AID — {fa.title.toUpperCase()}</div>
      <ol className="list-decimal pl-5 space-y-1 text-[12.5px] text-red-900">
        {fa.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

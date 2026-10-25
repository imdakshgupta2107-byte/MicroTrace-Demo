import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ghsSym, ghsLabel, parsePpe } from "@/lib/safety";
import { STORAGE_GROUPS } from "@/lib/constants";
import type { Chemical } from "@/lib/types";

export function SafetyProfile({ chemical }: { chemical: Chemical }) {
  const grp = STORAGE_GROUPS.find((g) => g.id === chemical.storage_group);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
      <div className="font-bold text-[13px] text-ink">Safety profile</div>
      <div className="flex flex-wrap gap-1.5">
        {chemical.ghs.length > 0
          ? chemical.ghs.map((g) => (
              <span key={g} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold">
                <span className="inline-flex items-center justify-center h-5 w-5 bg-[#d33] text-white text-[9px] font-extrabold rotate-45 rounded-[4px]">
                  <span className="-rotate-45">{g.replace("GHS", "")}</span>
                </span>
                {ghsLabel(g).replace(g + " — ", "")}
                <span className="text-slate-400">{ghsSym(g)}</span>
              </span>
            ))
          : <span className="text-[12px] text-slate-500">No GHS hazards recorded.</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <div><span className="text-slate-500">Storage group:</span> <Badge tone="gold">{grp?.label ?? "General"}</Badge></div>
        <div><span className="text-slate-500">PPE:</span> {parsePpe(chemical.ppe).join(" · ") || <span className="text-slate-400">—</span>}</div>
      </div>
      {chemical.pubchem_cid && (
        <><Separator />
        <a className="text-[12px] text-blue-700 hover:underline" target="_blank" rel="noreferrer"
          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chemical.pubchem_cid}`}>
          View full safety data on PubChem (CID {chemical.pubchem_cid}) ↗
        </a></>
      )}
    </div>
  );
}

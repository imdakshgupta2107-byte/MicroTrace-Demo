import { ghsSym, ghsLabel } from "@/lib/safety";
import { Tooltip } from "@/components/ui/tooltip";

export function SafetyStrip({ ghs }: { ghs: string[] }) {
  if (!ghs?.length) return null;
  return (
    <span className="inline-flex gap-0.5 items-center" aria-label="GHS pictograms">
      {ghs.map((g) => (
        <Tooltip key={g} label={ghsLabel(g)}>
          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-0.5 bg-[#d33] text-white font-extrabold rotate-45 rounded-[3px]"
            style={{ fontSize: 8.5 }}>
            <span className="-rotate-45">{g.replace("GHS", "")}</span>
          </span>
        </Tooltip>
      ))}
      <span className="sr-only">{ghs.map(ghsLabel).join("; ")}</span>
    </span>
  );
}

export function SafetyIconsRow({ ghs }: { ghs: string[] }) {
  return <span className="inline-flex gap-1 text-[13px]" aria-hidden>{ghs.map((g) => <span key={g} title={ghsLabel(g)}>{ghsSym(g)}</span>)}</span>;
}

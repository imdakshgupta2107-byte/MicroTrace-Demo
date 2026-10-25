import { categoryForKey, type InventoryCategory } from "@/lib/inventory-categories";
import { getCategoryColor } from "@/lib/category-colors";
import { Beaker, Biohazard, FlaskConical, FlaskRound, Flame, Microscope, Wheat } from "lucide-react";

type Props = {
  category: InventoryCategory | string | undefined | null;
  className?: string;
};

const ICONS = {
  wheat: Wheat,
  "flask-conical": FlaskConical,
  beaker: Beaker,
  "flask-round": FlaskRound,
  biohazard: Biohazard,
  flame: Flame,
  microscope: Microscope,
} as const;

/** Locked category marker: color is supported by an explicit text label and icon. */
export function CategoryBadge({ category, className = "" }: Props) {
  const resolved = categoryForKey(typeof category === "string" ? category : category?.key);
  const theme = getCategoryColor(resolved.key);
  const Icon = ICONS[resolved.icon_key as keyof typeof ICONS] ?? FlaskRound;
  const badgeStyle = {
    backgroundColor: `${theme.hex}24`,
    borderColor: `${theme.hex}B3`,
    color: "#0f2142",
  };

  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none shadow-sm ${className}`}
      style={badgeStyle}
      title={`${resolved.display_name} · locked visual category`}
      aria-label={`Category: ${resolved.display_name}`}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/80" style={{ backgroundColor: theme.hex }} />
      <Icon aria-hidden="true" size={13} strokeWidth={2.5} />
      <span className="truncate">{resolved.display_name}</span>
    </span>
  );
}

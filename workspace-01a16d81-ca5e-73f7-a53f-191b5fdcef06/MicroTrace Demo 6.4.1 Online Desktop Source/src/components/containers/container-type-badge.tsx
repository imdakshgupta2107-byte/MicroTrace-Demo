import { Box, FlaskConical, Package, Snowflake, TestTube2 } from "lucide-react";
import { getContainerColor } from "@/lib/category-colors";
import type { ContainerType } from "@/lib/types";

type Props = { type: ContainerType | string | null | undefined; className?: string };

const ICONS = {
  volumetric_glassware: TestTube2,
  storage_glassware: FlaskConical,
  amber_bottle: FlaskConical,
  plasticware: Package,
  cryogenic_vial: Snowflake,
  metal_storage: Box,
} as const;

/**
 * Read-only vessel type badge. Inline contrast values deliberately back up the
 * Tailwind palette so a vessel label remains readable on every card, shelf and
 * theme; color is supplementary, never the only identifier.
 */
export function ContainerTypeBadge({ type, className = "" }: Props) {
  const theme = getContainerColor(type);
  const Icon = ICONS[theme.key as keyof typeof ICONS] ?? FlaskConical;
  const badgeStyle = {
    backgroundColor: `${theme.hex}24`,
    borderColor: `${theme.hex}B3`,
    color: "#0f2142",
  };

  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none shadow-sm ${className}`}
      style={badgeStyle}
      title={`${theme.label} · locked vessel color`}
      aria-label={`Container type: ${theme.label}`}
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/80" style={{ backgroundColor: theme.hex }} />
      <Icon aria-hidden="true" size={13} strokeWidth={2.5} />
      <span className="truncate">{theme.label}</span>
    </span>
  );
}

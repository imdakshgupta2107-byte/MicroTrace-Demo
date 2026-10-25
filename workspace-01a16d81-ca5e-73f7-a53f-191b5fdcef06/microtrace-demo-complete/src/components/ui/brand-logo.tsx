import { assetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

/** Faithful crops of the supplied logo; intrinsic proportions are never stretched. */
export function BrandLogo({ variant = "icon", className, decorative = false }: {
  variant?: "icon" | "lockup" | "original"; className?: string; decorative?: boolean;
}) {
  return <img src={assetUrl(`brand/logo-${variant}.png`)} alt={decorative ? "" : "MicroTrace logo"}
    className={cn("object-contain shrink-0", className)} draggable={false} />;
}

import type { ReactNode } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Alert({ kind = "info", title, children, className }: {
  kind?: "info" | "warn" | "danger"; title?: ReactNode; children: ReactNode; className?: string;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-red-50 border-red-200 text-red-900",
  }[kind];
  const Icon = kind === "danger" ? ShieldAlert : kind === "warn" ? AlertTriangle : Info;
  return (
    <div className={cn("rounded-xl border px-3.5 py-3 text-[12.5px] flex gap-2.5", styles, className)}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div>
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

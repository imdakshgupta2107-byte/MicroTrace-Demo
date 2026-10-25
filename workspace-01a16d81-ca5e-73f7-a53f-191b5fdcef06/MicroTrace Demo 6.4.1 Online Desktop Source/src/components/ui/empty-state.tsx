import { assetUrl } from "@/lib/assets";
import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <img src={assetUrl("empty-state.svg")} alt="" className="w-28 opacity-90" />
      <div className="font-bold text-ink text-[14px]">{title}</div>
      {hint && <div className="text-[12px] text-slate-500 max-w-xs">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

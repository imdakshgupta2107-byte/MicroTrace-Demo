import type { ReactNode } from "react";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex-1 basis-56 min-w-0">
        <h1 className="text-xl font-extrabold text-ink break-words leading-tight">{title}</h1>
        {sub && <p className="text-[12.5px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 min-w-0">{actions}</div>}
    </div>
  );
}

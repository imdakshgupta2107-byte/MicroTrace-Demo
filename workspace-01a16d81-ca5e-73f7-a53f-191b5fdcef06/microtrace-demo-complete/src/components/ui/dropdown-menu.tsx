// dropdown-menu — compact anchored menu (one open at a time).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ trigger, children, align = "right" }: {
  trigger: ReactNode; children: ReactNode; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const cb = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", cb);
    return () => document.removeEventListener("mousedown", cb);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      <span onClick={() => setOpen((o) => !o)} className="inline-flex cursor-pointer">{trigger}</span>
      {open && (
        <div className={cn("absolute top-full mt-1.5 z-40 min-w-[190px] rounded-xl border border-slate-200 bg-white shadow-lg py-1",
          align === "right" ? "right-0" : "left-0")}
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, danger, onClick }: {
  children: ReactNode; danger?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn("w-full px-3.5 py-2 text-left text-[12.5px] font-semibold flex items-center gap-2 hover:bg-slate-50",
        danger ? "text-red-700" : "text-ink")}>
      {children}
    </button>
  );
}

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, children, className, wide, ariaLabel = "MicroTrace dialog" }:
  { open: boolean; onClose: () => void; children: ReactNode; className?: string; wide?: boolean; ariaLabel?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div className="safe-area-page fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-navy/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}
        className={cn("modal-panel relative bg-white rounded-2xl shadow-2xl w-full overflow-y-auto overscroll-contain min-w-0", wide ? "max-w-3xl" : "max-w-md", className)}>
        {children}
      </div>
    </div>, document.body,
  );
}

export function DialogHeader({ title, onClose, sub }: { title: string; onClose?: () => void; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
      <div className="min-w-0">
        <h3 className="font-extrabold text-base text-ink break-words">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {onClose && <button type="button" onClick={onClose} aria-label="Close" className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-ink"><X size={18} /></button>}
    </div>
  );
}
export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="px-4 sm:px-5 py-4 space-y-3.5">{children}</div>;
}
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-wrap justify-end gap-2">{children}</div>;
}

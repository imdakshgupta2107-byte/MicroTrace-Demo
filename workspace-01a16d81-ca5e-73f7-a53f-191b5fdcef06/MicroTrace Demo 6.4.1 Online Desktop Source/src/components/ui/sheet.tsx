import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/hooks/useModal";
import { cn } from "@/lib/utils";

export function Sheet({ open, onClose, children, className, ariaLabel = "MicroTrace panel" }:
  { open: boolean; onClose: () => void; children: ReactNode; className?: string; ariaLabel?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy/50" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}
        className={cn("safe-area-sheet absolute right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto overscroll-contain animate-sheetIn", className)}>
        {children}
      </div>
    </div>, document.body,
  );
}

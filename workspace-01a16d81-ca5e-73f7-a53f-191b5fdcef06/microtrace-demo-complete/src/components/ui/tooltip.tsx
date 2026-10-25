import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Position = { left: number; width: number; top?: number; bottom?: number };

export function Tooltip({ label, children, className }: {
  label: string; children: ReactNode; className?: string;
}) {
  const target = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [position, setPosition] = useState<Position | null>(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function show() {
    const rect = target.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(240, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    setPosition({ left, width, ...(rect.bottom + 80 > window.innerHeight
      ? { bottom: Math.max(12, window.innerHeight - rect.top + 8) }
      : { top: rect.bottom + 8 }) });
  }

  return <>
    <span ref={target} className={cn("inline-flex", className)} title={label}
      aria-describedby={open ? id : undefined} onMouseEnter={show} onMouseLeave={() => setPosition(null)}>
      {children}
    </span>
    {position && createPortal(<span id={id} role="tooltip" style={position}
      className="pointer-events-none fixed z-[80] rounded-lg bg-navy px-3 py-2 text-xs font-semibold leading-relaxed text-white shadow-lg break-words">
      {label}
    </span>, document.body)}
  </>;
}

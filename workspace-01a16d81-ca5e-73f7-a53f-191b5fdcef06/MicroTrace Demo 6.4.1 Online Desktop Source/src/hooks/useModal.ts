import { useEffect, useRef, type RefObject } from "react";

const modals: symbol[] = [];
let previousOverflow = "";
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/** Stable open/close lifecycle: trap focus, close with Escape, and lock body scroll. */
export function useModal(open: boolean, onClose: () => void, panel: RefObject<HTMLDivElement>): void {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const token = Symbol("modal");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (modals.length === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    modals.push(token);
    const frame = requestAnimationFrame(() => {
      // Avoid opening the phone keyboard automatically just by opening a sheet.
      const first = panel.current?.querySelector<HTMLElement>('button:not([disabled]), a[href]');
      (first ?? panel.current)?.focus();
    });
    const keydown = (event: KeyboardEvent) => {
      if (modals[modals.length - 1] !== token) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      const index = modals.indexOf(token);
      if (index !== -1) modals.splice(index, 1);
      if (modals.length === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, panel]);
}

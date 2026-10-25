import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

/** One global host, including onboarding (previously errors were invisible there). */
export function ToastHost() {
  const { toasts } = useToast();
  return (
    <div aria-live="polite" aria-label="Notifications" className="toast-position fixed left-1/2 -translate-x-1/2 z-[80] space-y-2 w-[min(92vw,400px)] pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} role={toast.kind === "err" ? "alert" : "status"}
          className={cn("animate-toastIn rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg break-words",
            toast.kind === "err" ? "bg-red-700" : toast.kind === "info" ? "bg-navy" : "bg-green-700")}>
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

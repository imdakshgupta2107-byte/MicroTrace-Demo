import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * A complete dashboard tile that navigates as one keyboard-accessible target.
 * Use it for read-only summaries so that the whole surface, not just a title,
 * has a useful destination on mouse, keyboard and touch devices.
 */
export function DashboardActionCard({
  to,
  label,
  children,
  className,
}: {
  to: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "touch-button block min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25",
        className,
      )}
    >
      {children}
    </Link>
  );
}

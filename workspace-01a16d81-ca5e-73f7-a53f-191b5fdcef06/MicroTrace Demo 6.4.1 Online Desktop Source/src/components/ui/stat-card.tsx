import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const TINTS = {
  gold: "bg-gold-100 text-gold-700", red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700", green: "bg-green-100 text-green-700",
  violet: "bg-violet-100 text-violet-700", slate: "bg-slate-100 text-slate-600",
  navy: "bg-navy-50 text-navy-600", amber: "bg-amber-100 text-amber-700",
} as const;

type BaseProps = {
  icon?: ReactNode;
  num?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  label: string;
  tint?: keyof typeof TINTS;
};

/** A metric is always actionable: route to its detail view or update its containing view. */
type Props = BaseProps & (
  | { to: string; onClick?: never }
  | { onClick: () => void; to?: never }
);

const base = "touch-button rounded-2xl border border-slate-100 bg-white px-3 py-3.5 text-left min-w-0 flex w-full items-center gap-3 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 sm:px-4";

export function StatCard({ icon, num, value, sub, label, tint = "gold", ...action }: Props) {
  const numberValue = num ?? value;
  const content = (
    <>
      {icon && <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TINTS[tint])}>{icon}</span>}
      <div className="min-w-0">
        <div className="truncate text-[22px] font-extrabold leading-none text-ink">{numberValue}</div>
        <div className="mt-1 text-[11px] text-slate-500">{label}</div>
        {sub && <div className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</div>}
      </div>
    </>
  );
  const ariaLabel = `Open ${label}: ${String(numberValue)}`;

  if ("to" in action && action.to) {
    return <Link to={action.to} aria-label={ariaLabel} className={base}>{content}</Link>;
  }
  return <button type="button" onClick={action.onClick} aria-label={ariaLabel} className={base}>{content}</button>;
}

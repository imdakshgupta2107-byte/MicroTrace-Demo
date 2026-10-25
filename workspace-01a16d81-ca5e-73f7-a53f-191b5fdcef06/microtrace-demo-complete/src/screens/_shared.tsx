// Compact charts with readable labels at 320px and no external chart assets.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { fmtINR, fmtNum } from "@/lib/format";

export interface BarDatum { label: string; value: number; color?: string; }

export function BarChart({ data, height = 150, suffix, money }: {
  data: BarDatum[]; height?: number; suffix?: string; money?: boolean;
}) {
  const max = Math.max(1, ...data.map((datum) => Number.isFinite(datum.value) ? datum.value : 0));
  if (!data.length) return <p className="text-xs text-slate-400 py-8 text-center">No data yet</p>;
  return (
    <div className="space-y-3 min-w-0" style={{ minHeight: Math.min(height, data.length * 28) }}>
      {data.map((datum) => <div key={datum.label} className="min-w-0">
        <div className="flex items-start justify-between gap-3 text-[11px] mb-1.5">
          <span className="text-slate-500 break-words min-w-0">{datum.label}</span>
          <b className="text-navy shrink-0 tabular-nums">{money ? fmtINR(Math.round(datum.value)) : fmtNum(datum.value)}{suffix ?? ""}</b>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="img" aria-label={`${datum.label}: ${datum.value}`}>
          <div className={datum.color ? "h-full rounded-full" : "h-full rounded-full bg-gradient-to-r from-navy to-navy-500"}
            style={{ width: `${Math.max(0, Math.min(100, datum.value / max * 100))}%`, ...(datum.color ? { backgroundColor: datum.color } : {}) }} />
        </div>
      </div>)}
    </div>
  );
}

export function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  let accumulated = 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 min-w-0">
      <svg viewBox="0 0 120 120" width={size} height={size} className="shrink-0" role="img" aria-label={`Donut chart, total ${total}`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef1f6" strokeWidth="14" />
        {total > 0 && data.map((datum) => {
          const fraction = datum.value / total;
          const offset = -accumulated * circumference;
          accumulated += fraction;
          return <circle key={datum.label} cx="60" cy="60" r={radius} fill="none" stroke={datum.color} strokeWidth="14"
            strokeDasharray={`${fraction * circumference} ${circumference}`} strokeDashoffset={offset} transform="rotate(-90 60 60)" />;
        })}
        <text x="60" y="61" textAnchor="middle" fontSize="21" fontWeight="800" fill="#0f2142">{total}</text>
        <text x="60" y="76" textAnchor="middle" fontSize="9" fill="#64748b">total</text>
      </svg>
      <ul className="space-y-2 text-xs flex-1 min-w-[130px]">
        {data.map((datum) => <li key={datum.label} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 shrink-0 rounded-sm" style={{ background: datum.color }} />
          <span className="text-slate-500 flex-1 min-w-0 break-words capitalize">{datum.label}</span><b className="text-navy tabular-nums">{datum.value}</b>
        </li>)}
      </ul>
    </div>
  );
}

type CardProps = { title: string; children: ReactNode; right?: ReactNode; to?: string };
const CARD_BASE = "min-w-0 bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5 space-y-4";

/** Dashboard summaries gain a single full-card destination when `to` is provided. */
export function Card({ title, children, right, to }: CardProps) {
  const body = <>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-extrabold text-sm text-navy min-w-0">{title}</h3>
      {right}
    </div>
    {children}
  </>;

  if (to) {
    return <Link to={to} aria-label={`Open ${title}`} className={`${CARD_BASE} block transition duration-150 ease-out hover:-translate-y-0.5 hover:border-gold-200 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25`}>{body}</Link>;
  }
  return <div className={CARD_BASE}>{body}</div>;
}

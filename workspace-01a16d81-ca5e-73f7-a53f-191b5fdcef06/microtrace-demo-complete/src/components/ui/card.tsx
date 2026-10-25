import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden", className)} {...props} />;
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100", className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-bold text-[14px] text-ink flex items-center gap-2", className)} {...props} />;
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-4", className)} {...props} />;
}
export function Stat({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string }) {
  return (
    <Card><CardContent className="flex items-center gap-3 !py-3.5">
      {icon && <span className="h-9 w-9 rounded-xl bg-gold-100 text-gold-700 inline-flex items-center justify-center">{icon}</span>}
      <div><div className="text-[22px] font-extrabold leading-none text-ink">{value}</div>
        <div className="text-[11px] text-slate-500 mt-1">{label}{hint ? ` · ${hint}` : ""}</div></div>
    </CardContent></Card>
  );
}

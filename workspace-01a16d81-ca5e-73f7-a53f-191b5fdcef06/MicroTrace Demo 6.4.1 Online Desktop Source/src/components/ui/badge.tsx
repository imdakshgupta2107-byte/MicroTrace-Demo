import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "amber" | "blue" | "green" | "red" | "gray" | "violet" | "gold" | "slate" | "navy";
const TONES: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-800", blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800",
  gray: "bg-slate-100 text-slate-600", violet: "bg-violet-100 text-violet-800",
  gold: "bg-gold-100 text-gold-700", slate: "bg-navy-50 text-navy-600",
  navy: "bg-navy-100 text-navy-700",
};

export function Badge({ tone = "gray", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold", TONES[tone], className)} {...props} />;
}

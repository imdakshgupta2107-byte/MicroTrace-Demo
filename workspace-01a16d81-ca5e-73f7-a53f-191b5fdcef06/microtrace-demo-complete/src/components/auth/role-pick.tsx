import { BookOpen, FlaskConical, GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLES = [
  { id: "student", label: "Student", desc: "Requests & workbench", icon: GraduationCap },
  { id: "teacher", label: "Teacher", desc: "Practicals & reports", icon: BookOpen },
  { id: "staff", label: "Lab staff", desc: "Stock & approvals", icon: FlaskConical },
  { id: "principal", label: "Principal", desc: "Dashboards & audit", icon: ShieldCheck },
] as const;

export function RolePick({ value, onChange }: { value: Role | null; onChange: (role: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Pick your role">
      {ROLES.map((role) => (
        <button key={role.id} type="button" aria-pressed={value === role.id} onClick={() => onChange(role.id)}
          className={cn("min-w-0 text-left rounded-2xl border-2 p-3 transition-colors",
            value === role.id ? "border-gold bg-gold-100/60 shadow-card" : "border-slate-200 bg-white hover:border-gold/60")}>
          <role.icon size={19} aria-hidden="true" className={cn("mb-2", value === role.id ? "text-gold-700" : "text-slate-400")} />
          <div className="font-bold text-[13.5px] text-navy">{role.label}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{role.desc}</div>
        </button>
      ))}
    </div>
  );
}

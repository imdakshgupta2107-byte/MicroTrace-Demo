import { useNavigate } from "react-router-dom";
import { Barcode, Lock, LockKeyholeOpen, Siren } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStudent } from "@/hooks/useStudent";
import type { Role } from "@/lib/types";

const ROLE_STYLE: Record<Role, string> = {
  principal: "bg-gold text-navy", staff: "bg-navy text-white",
  teacher: "bg-violet-600 text-white", student: "bg-blue-600 text-white",
};

export function TopBar({ role, onScan, onEmergency, onLock }: {
  role: Role | null; onScan: () => void; onEmergency: () => void; onLock: () => void;
}) {
  const nav = useNavigate();
  const { profile } = useStudent();
  return (
    <header className="safe-area-header sticky top-0 z-30 bg-white/95 backdrop-blur text-navy flex items-center gap-2 px-3 sm:px-5 border-b border-slate-200">
      <button type="button" aria-label="MicroTrace dashboard" onClick={() => nav("/dashboard")}
        className="flex h-11 shrink-0 items-center rounded-xl p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25">
        <BrandLogo variant="icon" className="h-9 w-9 md:hidden" decorative />
        <BrandLogo variant="lockup" className="hidden h-9 w-36 md:block" decorative />
      </button>
      <div className="hidden min-w-0 border-l border-slate-200 pl-3 lg:block">
        <p className="font-bold text-[13px] truncate">Department of Microbiology</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Laboratory management workspace</p>
      </div>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={onScan} className="shrink-0 text-slate-500 hover:text-navy"
        title="Scan barcode" aria-label="Scan barcode"><Barcode size={19} /></Button>
      <Button variant="ghost" size="icon" onClick={onEmergency} className="shrink-0 text-red-600 hover:bg-red-50"
        title="Safety emergency" aria-label="Safety emergency"><Siren size={19} /></Button>
      {role ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex"><Avatar name={profile?.name ?? "Guest"} role={role} size={26} /></span>
          <Badge className={`${ROLE_STYLE[role]} capitalize`}>{role}</Badge>
          <Button variant="ghost" size="icon" onClick={onLock} className="text-slate-500 hover:text-navy"
            title="Lock (switch role)" aria-label="Lock (switch role)"><LockKeyholeOpen size={16} /></Button>
        </div>
      ) : <Button variant="ghost" size="icon" title="Unlock a role" onClick={() => nav("/onboarding")}><Lock size={16} /></Button>}
    </header>
  );
}

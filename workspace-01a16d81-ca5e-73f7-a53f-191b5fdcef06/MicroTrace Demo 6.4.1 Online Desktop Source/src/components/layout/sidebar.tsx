import { BrandLogo } from "@/components/ui/brand-logo";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FlaskConical, ClipboardList, Package, Truck,
  ShoppingCart, CalendarDays, CalendarClock, BellRing, FlaskRound, BarChart3, ScrollText, Settings, BookOpenCheck, ClipboardCheck, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; roles: (Role | null)[]; }

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard",   label: "Dashboard",     icon: LayoutDashboard, roles: ["student", "teacher", "staff", "principal"] },
  { to: "/chemicals",   label: "Inventory",     icon: FlaskConical,    roles: ["student", "teacher", "staff", "principal"] },
  { to: "/containers",  label: "Containers",    icon: Package,         roles: ["student", "teacher", "staff", "principal"] },
  { to: "/requests",    label: "Requests",      icon: ClipboardList,   roles: ["student", "teacher", "staff", "principal"] },
  { to: "/operations",  label: "Daily operations", icon: ClipboardCheck, roles: ["staff", "principal"] },
  { to: "/procurement", label: "Procurement",   icon: ShoppingCart,    roles: ["staff", "principal"] },
  { to: "/vendors",     label: "Vendors",       icon: Truck,           roles: ["staff", "principal"] },
  { to: "/practicals",  label: "Practicals",    icon: CalendarDays,    roles: ["student", "teacher", "staff", "principal"] },
  { to: "/discrepancies", label: "Breakage & waste", icon: ClipboardList, roles: ["student", "teacher", "staff", "principal"] },
  { to: "/bookings", label: "Bookings", icon: CalendarDays, roles: ["student", "teacher", "staff", "principal"] },
  { to: "/projects", label: "Project schedule", icon: CalendarClock, roles: ["teacher", "staff", "principal"] },
  { to: "/workbench",   label: "Workbench",     icon: FlaskRound,      roles: ["student", "teacher"] },
  { to: "/registers",   label: "Registers",     icon: BookOpenCheck,   roles: ["student", "teacher", "staff", "principal"] },
  { to: "/reports",     label: "Reports",       icon: BarChart3,       roles: ["teacher", "staff", "principal"] },
  { to: "/automation", label: "Automations", icon: BellRing, roles: ["staff", "principal"] },
  { to: "/audit",       label: "Audit Log",     icon: ScrollText,      roles: ["staff", "principal"] },
  { to: "/details",     label: "Details",       icon: Info,            roles: ["student", "teacher", "staff", "principal"] },
  { to: "/settings",    label: "Settings",      icon: Settings,        roles: ["student", "teacher", "staff", "principal"] },
];

export function Sidebar({ role }: { role: Role | null }) {
  return (
    <aside aria-label="Desktop navigation" data-testid="desktop-sidebar" className="hidden md:flex w-60 shrink-0 flex-col bg-navy text-[14px] sticky top-0 h-screen">
      <div className="px-4 py-5">
        <div className="rounded-xl bg-white px-2 py-1.5"><BrandLogo variant="lockup" className="w-full h-11" /></div>
        <p className="text-[10.5px] text-[#a0afca] mt-3">Department of Microbiology</p>
      </div>
      <div className="px-4 pb-2 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#8494b8]">Menu</div>
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter((n) => n.roles.includes(role)).map((n) => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) => cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold text-[#c3cbdf] transition",
              isActive ? "bg-gold text-navy shadow-sm" : "hover:bg-white/10 hover:text-white",
            )}>
            <n.icon size={17} /> {n.label}
          </NavLink>
        ))}
      </nav>
      <footer className="mx-4 py-4 mt-3 border-t border-white/10 text-[10px] leading-relaxed text-[#a0afca]">
        <b className="text-gold">MicroTrace</b><br />Laboratory management workspace
      </footer>
    </aside>
  );
}

import { useCallback, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./sidebar";
import type { Role } from "@/lib/types";

/** Primary tabs + a complete More menu; mobile never loses desktop pages. */
export function BottomNav({ role }: { role: Role | null }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const { pathname } = useLocation();
  const available = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const primaryPaths = ["/dashboard", "/chemicals", "/requests",
    role === "student" || role === "teacher" ? "/workbench" : "/procurement"];
  const primary = primaryPaths.map((path) => available.find((item) => item.to === path))
    .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item));
  const moreActive = !primary.some((item) => item.to === pathname);

  return (
    <>
      <nav aria-label="Mobile navigation" data-testid="mobile-bottom-nav" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy/95 backdrop-blur border-t border-white/10 px-1 pb-[env(safe-area-inset-bottom)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={closeMore}
              className={({ isActive }) => cn("min-h-14 flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-bold",
                isActive ? "text-gold" : "text-[#b5c1db]")}>
              <item.icon size={20} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label.split(" ")[0]}</span>
            </NavLink>
          ))}
          <button type="button" aria-label="More pages" aria-expanded={moreOpen} aria-controls="mobile-pages"
            onClick={() => setMoreOpen(true)} className={cn("min-h-14 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold", moreActive ? "text-gold" : "text-[#b5c1db]")}>
            <Menu size={20} aria-hidden="true" /> More
          </button>
        </div>
      </nav>
      <Sheet open={moreOpen} onClose={closeMore}>
        <div id="mobile-pages" className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink">All pages</h2>
            <button type="button" aria-label="Close menu" onClick={closeMore} className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-slate-100"><X size={20} /></button>
          </div>
          <nav aria-label="All pages" className="space-y-1">
            {available.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={closeMore}
                className={({ isActive }) => cn("min-h-12 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
                  isActive ? "bg-gold-100 text-navy" : "text-slate-700 hover:bg-slate-100")}>
                <item.icon size={20} aria-hidden="true" /> {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </Sheet>
    </>
  );
}

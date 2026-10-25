// launcher — workbench home: tool grid + bench-booking (date + slot).
// Bookings are per-device (localStorage) — the approval trail lives in the
// chemicals/requests flow, bookings are only a planning aid.
import { useEffect, useState, type ElementType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BK_SLOTS } from "@/lib/constants";
import { addDays, fmtDate, todayISO } from "@/lib/format";
import { DEMO_BENCH_KEY } from "@/demo/config";
import { displayName } from "@/lib/student";
import { useToast } from "@/hooks/useToast";
import {
  Beaker, BookOpenCheck, CalendarClock, Calculator, CircleDot, Droplets,
  FlaskConical, Grid3X3, LayoutGrid, Percent, Ruler, Timer as TimerIcon, TrendingUp,
} from "lucide-react";
import type { ToolId } from "./workbench-shell";

export const TOOLS: { id: ToolId; name: string; blurb: string; icon: ElementType }[] = [
  { id: "dilution", name: "Dilution", blurb: "C₁V₁ = C₂V₂ stock → target", icon: Droplets },
  { id: "molarity", name: "Molar solution", blurb: "grams to weigh for M & volume", icon: Beaker },
  { id: "media-prep", name: "Media prep", blurb: "g/L label → powder per batch", icon: FlaskConical },
  { id: "cfu", name: "CFU counter", blurb: "plate photo tap-count → CFU/mL", icon: CircleDot },
  { id: "haemocytometer", name: "Haemocytometer", blurb: "cells/mL + trypan viability", icon: Grid3X3 },
  { id: "cell-culture", name: "Cell seeding", blurb: "µL of stock into well/dish", icon: LayoutGrid },
  { id: "timers", name: "Lab timers", blurb: "named countdowns with alarms", icon: TimerIcon },
  { id: "plate-mapper", name: "96-well map", blurb: "stamp samples onto a plate grid", icon: LayoutGrid },
  { id: "doubling-time", name: "Doubling time", blurb: "growth rate from two readings", icon: TrendingUp },
  { id: "unit-converter", name: "Unit converter", blurb: "µL/mL/L, µg/mg/g, µM/mM", icon: Ruler },
  { id: "percent-solution", name: "Percent solution", blurb: "%w/v, %v/v, %w/w recipes", icon: Percent },
];

interface Booking { id: string; day: string; slot: string; name: string; at: number; }
const BK_KEY = DEMO_BENCH_KEY;

export function Launcher({ onPick }: { onPick: (id: ToolId) => void }) {
  const { toast } = useToast();
  const [day, setDay] = useState(todayISO());
  const [slot, setSlot] = useState(BK_SLOTS[0]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    try { setBookings(JSON.parse(localStorage.getItem(BK_KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  const save = (bs: Booking[]) => { setBookings(bs); localStorage.setItem(BK_KEY, JSON.stringify(bs)); };

  const book = () => {
    if (bookings.some((b) => b.day === day && b.slot === slot)) {
      return toast("That slot is already booked on this device.", "err");
    }
    save([...bookings, { id: Math.random().toString(36).slice(2, 9), day, slot, name: displayName(), at: Date.now() }]
      .sort((a, b) => (a.day + a.slot).localeCompare(b.day + b.slot)));
    toast(`Bench booked: ${fmtDate(day)} · ${slot}`);
  };
  const upcoming = bookings.filter((b) => b.day >= todayISO()).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4 flex items-center gap-3">
        <BookOpenCheck className="text-navy-700 shrink-0" size={20} />
        <p className="text-[12.5px] text-navy-700">
          Everything here runs 100% on this device — calculators, plate photos, timers. No internet, no account, data never leaves the phone.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TOOLS.map((t) => {
          const Icon = t.icon ?? Calculator;
          return (
            <button key={t.id} type="button" data-tool-id={t.id} onClick={() => onPick(t.id)} aria-label={`Open ${t.name}: ${t.blurb}`}
              className="touch-button min-h-24 text-left bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-2 transition duration-150 ease-out hover:border-gold-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25">
              <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
                <Icon size={18} />
              </span>
              <div>
                <div className="font-bold text-[13px] text-ink">{t.name}</div>
                <div className="text-[10.5px] text-slate-500 leading-snug">{t.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-[13.5px] text-ink">
          <CalendarClock size={16} className="text-gold-600" /> Book a bench slot
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={day} min={todayISO()} max={addDays(30)} onChange={(e) => setDay(e.target.value)} className="w-40" />
          <Select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {BK_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button variant="gold" onClick={book}>Book</Button>
        </div>
        {upcoming.length > 0 && (
          <ul className="space-y-1 text-[12px]">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span><b>{b.day === todayISO() ? "Today" : fmtDate(b.day)}</b> · {b.slot} · {b.name}</span>
                <Badge tone="green">booked</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

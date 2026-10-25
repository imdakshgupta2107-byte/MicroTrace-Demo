import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLabData } from "@/hooks/useLabData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { canManage } from "@/lib/auth";
import { activeBooking, INSTRUMENT_SLOTS, slotAvailable } from "@/lib/bookings";
import { displayName, isMyRecord } from "@/lib/student";
import { todayISO, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Chemical, InstrumentBooking, Role } from "@/lib/types";

const TONES = { pending: "amber", approved: "green", declined: "red", cancelled: "gray" } as const;

function BookingForm({ role, instruments, bookings, onClose }: {
  role: Role; instruments: Chemical[]; bookings: InstrumentBooking[]; onClose: () => void;
}) {
  const { mutate, pending } = useLabData();
  const { toast, err } = useToast();
  const [instrument, setInstrument] = useState(instruments[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState<string>("");
  const [purpose, setPurpose] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruments.some((item) => item.id === instrument)) return err("Choose an instrument from the inventory.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || date < todayISO()) return err("Choose today or a future date.");
    if (!INSTRUMENT_SLOTS.some((candidate) => candidate === slot)) return err("Choose an available time slot.");
    if (!slotAvailable(bookings, instrument, date, slot)) return err("That instrument slot is already booked. Choose a different time.");
    if (purpose.trim().length < 5) return err("Add a short purpose for this reservation (at least 5 characters).");
    try {
      await mutate({
        kind: "insert", table: "instrument_bookings",
        row: { chemical_id: instrument, date, slot, purpose: purpose.trim(), booked_by: displayName(), booked_by_role: role,
          status: canManage(role) ? "approved" : "pending", decided_by: canManage(role) ? displayName() : null, note: "" },
        audit: `Booked instrument: ${instruments.find((item) => item.id === instrument)?.name} · ${date} · ${slot}`,
      });
      toast(canManage(role) ? "Instrument booking approved and saved." : "Booking sent to lab staff for approval.");
      onClose();
    } catch (error) { err(error instanceof Error ? error.message : "Could not save the instrument booking."); }
  }

  return (
    <Dialog open onClose={onClose} ariaLabel="New instrument booking">
      <DialogHeader title="New instrument booking" sub="One reservation per instrument and time slot." onClose={onClose} />
      <form onSubmit={submit} noValidate>
        <DialogBody>
          <div className="space-y-1.5"><label htmlFor="booking-instrument" className="text-xs font-bold text-slate-600">Instrument</label>
            <Select id="booking-instrument" value={instrument} onChange={(event) => { setInstrument(event.target.value); setSlot(""); }} className="w-full sm:w-full">
              {instruments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5"><label htmlFor="booking-date" className="text-xs font-bold text-slate-600">Booking date</label>
            <Input id="booking-date" type="date" min={todayISO()} value={date} onChange={(event) => { setDate(event.target.value); setSlot(""); }} />
          </div>
          <fieldset>
            <legend className="text-xs font-bold text-slate-600 mb-2">Time slot</legend>
            <div className="grid grid-cols-2 gap-2">
              {INSTRUMENT_SLOTS.map((time) => {
                const free = slotAvailable(bookings, instrument, date, time);
                return <button key={time} type="button" disabled={!free} aria-pressed={slot === time} onClick={() => setSlot(time)}
                  className={cn("min-h-14 rounded-xl border p-2 text-xs font-semibold transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
                    slot === time ? "border-gold bg-gold-100 text-navy" : "border-slate-200 bg-white text-slate-600 hover:border-gold")}>
                  {time}{!free && <span className="block text-[10px] font-normal mt-0.5">Booked</span>}
                </button>;
              })}
            </div>
          </fieldset>
          <div className="space-y-1.5"><label htmlFor="booking-purpose" className="text-xs font-bold text-slate-600">Purpose</label>
            <Textarea id="booking-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} maxLength={500} placeholder="e.g. Scheduled class practical" />
          </div>
          <p className="text-[11px] text-slate-400">Student and teacher bookings are routed for staff approval.</p>
        </DialogBody>
        <DialogFooter><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Reserve instrument"}</Button></DialogFooter>
      </form>
    </Dialog>
  );
}

export default function BookingsPage() {
  const { role } = useAuth();
  const { data, mutate, pending } = useLabData();
  const { toast, err } = useToast();
  const me = displayName();
  const [filter, setFilter] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [cancelling, setCancelling] = useState<InstrumentBooking | null>(null);
  const today = todayISO();
  const bookings = data?.bookings ?? [];
  const instruments = useMemo(() => (data?.chemicals ?? []).filter((item) => item.category === "Instrument").sort((a, b) => a.name.localeCompare(b.name)), [data?.chemicals]);
  const upcoming = bookings.filter((booking) => booking.date >= today && activeBooking(booking));
  const list = bookings.filter((booking) => filter === "all" ? true : filter === "mine" ? isMyRecord(booking.owner_id, booking.booked_by)
    : filter === "pending" ? booking.status === "pending" : booking.date >= today && activeBooking(booking))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));

  async function decide(booking: InstrumentBooking, status: "approved" | "declined" | "cancelled") {
    const allowed = status === "cancelled" ? canManage(role) || isMyRecord(booking.owner_id, booking.booked_by) : canManage(role);
    if (!allowed || !activeBooking(booking)) return err("This booking cannot be changed in the current view.");
    try {
      await mutate({ kind: "update", table: "instrument_bookings", id: booking.id,
        patch: { status, decided_by: me }, audit: `${status} instrument booking: ${booking.date} · ${booking.slot} · ${booking.booked_by}` });
      toast(`Booking ${status}.`);
      setCancelling(null);
    } catch (error) { err(error instanceof Error ? error.message : "Could not update this booking."); }
  }

  return (
    <>
      <PageHeader title="Instrument bookings" sub="Autoclaves, incubators and shared instruments — one clear schedule."
        actions={<Button variant="gold" disabled={!instruments.length} onClick={() => setFormOpen(true)}><Plus size={15} /> New booking</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Instruments available" value={instruments.length} tint="navy" onClick={() => setFilter("all")} />
        <StatCard label="Upcoming reservations" value={upcoming.length} tint="blue" onClick={() => setFilter("upcoming")} />
        <StatCard label="Awaiting approval" value={bookings.filter((booking) => booking.status === "pending").length} tint="gold" onClick={() => setFilter("pending")} />
        <StatCard label="My active bookings" value={upcoming.filter((booking) => isMyRecord(booking.owner_id, booking.booked_by)).length} tint="violet" onClick={() => setFilter("mine")} />
      </div>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <label className="text-xs font-bold text-slate-500 flex flex-wrap gap-2 items-center">Show bookings
          <Select aria-label="Show bookings" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="upcoming">Upcoming</option><option value="mine">My bookings</option><option value="pending">Pending approval</option><option value="all">All bookings</option>
          </Select>
        </label>
        <p className="text-[11px] text-slate-400">{list.length} reservation{list.length === 1 ? "" : "s"}</p>
      </div>
      {list.length === 0 ? <EmptyState title="No bookings in this view" hint="Choose another filter or reserve an instrument for your next class." /> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {list.map((booking) => <article key={booking.id} data-booking-id={booking.id} className="min-w-0 bg-white rounded-2xl border border-slate-100 shadow-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-start gap-2 justify-between">
              <h2 className="font-bold text-sm text-navy min-w-0 break-words flex-1">{instruments.find((item) => item.id === booking.chemical_id)?.name ?? "Removed instrument"}</h2>
              <Badge tone={TONES[booking.status]}>{booking.status}</Badge>
            </div>
            <p className="text-xs font-bold text-gold-700 flex items-center flex-wrap gap-2"><CalendarClock size={15} /> {fmtDate(booking.date)} <span className="text-slate-300">·</span> {booking.slot}</p>
            <p className="text-xs text-slate-600 leading-relaxed break-words">{booking.purpose}</p>
            <p className="text-[11px] text-slate-400 break-words">Booked by <b className="text-slate-600">{booking.booked_by}</b> · {booking.booked_by_role}</p>
            {booking.note && <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 break-words">{booking.note}</p>}
            {booking.decided_by && <p className="text-[11px] text-slate-400">Decision by {booking.decided_by}</p>}
            {activeBooking(booking) && booking.date >= today && <div className="flex flex-wrap gap-2 pt-1">
              {canManage(role) && booking.status === "pending" && <>
                <Button size="sm" variant="green" disabled={pending} onClick={() => void decide(booking, "approved")}>Approve booking</Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => void decide(booking, "declined")}>Decline</Button>
              </>}
              {(canManage(role) || isMyRecord(booking.owner_id, booking.booked_by)) && <Button size="sm" disabled={pending} onClick={() => setCancelling(booking)}>Cancel booking</Button>}
            </div>}
          </article>)}
        </div>
      )}
      {formOpen && role && <BookingForm role={role} instruments={instruments} bookings={bookings} onClose={() => setFormOpen(false)} />}
      <Dialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} ariaLabel="Cancel instrument booking">
        <DialogHeader title="Cancel this instrument booking?" onClose={() => setCancelling(null)} />
        <DialogBody><p className="text-sm text-slate-600">This frees the slot for another reservation. The cancelled booking remains in the booking history.</p></DialogBody>
        <DialogFooter><Button onClick={() => setCancelling(null)}>Keep booking</Button><Button variant="danger" disabled={pending} onClick={() => cancelling && void decide(cancelling, "cancelled")}>Confirm cancellation</Button></DialogFooter>
      </Dialog>
    </>
  );
}

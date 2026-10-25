import type { InstrumentBooking } from "./types";

export const INSTRUMENT_SLOTS = ["09:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00"] as const;
export const activeBooking = (booking: InstrumentBooking) => booking.status === "pending" || booking.status === "approved";

export function slotAvailable(bookings: InstrumentBooking[], chemicalId: string, date: string, slot: string): boolean {
  return !bookings.some((booking) => activeBooking(booking) && booking.chemical_id === chemicalId && booking.date === date && booking.slot === slot);
}

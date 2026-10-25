import { beforeEach, describe, expect, it, vi } from "vitest";
import legacy from "@/demo/legacy-demo.json";
import { DEMO_AUTH_KEY, DEMO_DATA_EVENT, DEMO_PROFILE_KEY, DEMO_STORE_KEY } from "@/demo/config";
import { buildDemoStore, demoStartupError, initializeDemo, restoreDemo } from "@/demo/seed";
import { fetchLabData, insert, update } from "@/lib/db";
import { INSTRUMENT_SLOTS, slotAvailable } from "@/lib/bookings";
import { localISODate } from "@/lib/format";

const firstDay = new Date(2026, 9, 15, 12);
beforeEach(() => { localStorage.clear(); });

describe("the actual earlier demo dataset", () => {
  it("restores every original collection, not newly invented substitute records", () => {
    const demo = buildDemoStore(firstDay);
    expect(demo.chemicals).toHaveLength(38);
    expect(demo.containers).toHaveLength(38);
    expect(demo.requests).toHaveLength(5);
    expect(demo.vendors).toHaveLength(4);
    expect(demo.vendor_prices).toHaveLength(51);
    expect(demo.purchase_orders).toHaveLength(3);
    expect(demo.practicals).toHaveLength(2);
    expect(demo.instrument_bookings).toHaveLength(2);
    expect(demo.discrepancies).toHaveLength(1);
    expect(demo.audit_log).toHaveLength(8);
    expect(demo.demo_users).toHaveLength(7);
    expect(demo.incidents).toEqual([]); // Do not fabricate incidents to fill a dashboard.
    expect(demo.lab_notes).toEqual([]);
    expect(demo.chemicals.map((item) => item.name)).toEqual(legacy.items.map((item) => item.name));
    expect(demo.requests.map((request) => request.id).sort()).toEqual(legacy.requests.map((request) => request.id).sort());
    expect(demo.vendors.map((vendor) => vendor.name)).toEqual(legacy.vendors.map((vendor) => vendor.name));
    expect(demo.audit_log.map((log) => log.action).sort()).toEqual(legacy.logs.map((log) => log.action).sort());
  });

  it("preserves each opening balance, minimum, location, barcode, supplier and hazard label", () => {
    const demo = buildDemoStore(firstDay);
    for (const old of legacy.items) {
      const chemical = demo.chemicals.find((item) => item.id === old.id)!;
      const container = demo.containers.find((item) => item.chemical_id === old.id)!;
      expect(chemical).toMatchObject({ name: old.name, unit: old.unit, min_stock: old.min, supplier: old.sup, ghs: old.ghs, ppe: old.ppe });
      expect(container).toMatchObject({ qty: old.qty, location: old.loc, barcode: old.barcode });
      expect(chemical.category).toBeTruthy();
    }
    // Old issued requests/received orders describe history, not additional stock moves.
    expect(demo.containers.find((item) => item.chemical_id === "it-16")?.qty).toBe(120);
    expect(demo.containers.find((item) => item.chemical_id === "it-10")?.qty).toBe(480);
    expect(new Set(demo.chemicals.map((item) => item.category)).size).toBe(6);
  });

  it("preserves quote amounts and normalizes the stock-unit meaning of glove/mask boxes", () => {
    const demo = buildDemoStore(firstDay);
    expect(demo.vendor_prices.map((price) => price.price_inr)).toEqual(legacy.prices.map((price) => price.price));
    expect(demo.vendor_prices.map((price) => price.pack_label)).toEqual(legacy.prices.map((price) => price.pack));
    for (const quote of demo.vendor_prices.filter((price) => ["it-29", "it-30"].includes(price.chemical_id))) expect(quote.pack_size).toBe(1);
    for (const order of demo.purchase_orders) expect(order.total_inr).toBe(order.packs * order.unit_price);
  });

  it("keeps all IDs unique and all item/vendor/container references valid", () => {
    const demo = buildDemoStore(firstDay);
    for (const rows of Object.values(demo)) {
      expect(new Set(rows.map((row: { id: unknown }) => row.id)).size).toBe(rows.length);
    }
    const chemicals = new Set(demo.chemicals.map((item) => item.id));
    const containers = new Set(demo.containers.map((item) => item.id));
    const vendors = new Set(demo.vendors.map((item) => item.id));
    for (const row of [...demo.requests, ...demo.vendor_prices, ...demo.purchase_orders, ...demo.discrepancies, ...demo.instrument_bookings]) expect(chemicals.has(row.chemical_id)).toBe(true);
    for (const row of [...demo.vendor_prices, ...demo.purchase_orders]) expect(vendors.has(row.vendor_id!)).toBe(true);
    for (const row of [...demo.requests, ...demo.discrepancies]) if (row.container_id) expect(containers.has(row.container_id)).toBe(true);
    for (const row of demo.practicals) for (const item of row.chemicals) expect(chemicals.has(item.chemical_id)).toBe(true);
    for (const row of demo.instrument_bookings) expect(INSTRUMENT_SLOTS).toContain(row.slot);
  });

  it("rebases dates to the device calendar day on first launch, even in a new year", () => {
    const demo = buildDemoStore(new Date(2027, 0, 5, 0, 15));
    expect(demo.containers.find((item) => item.chemical_id === "it-11")?.expiry).toBe("2027-01-17");
    expect(demo.containers.find((item) => item.chemical_id === "it-13")?.expiry).toBe("2026-12-30");
    expect(demo.practicals[0].scheduled_on).toBe("2027-01-10");
    expect(demo.instrument_bookings[0].date).toBe("2027-01-06");
    expect(demo.instrument_bookings[1].date).toBe("2027-01-05");
    expect(localISODate(new Date(2027, 0, 5, 0, 15))).toBe("2027-01-05");
  });

  it("does not preserve old email/password login secrets in the sample roster", () => {
    for (const person of buildDemoStore(firstDay).demo_users) {
      expect(person).not.toHaveProperty("pass");
      expect(person).not.toHaveProperty("password");
    }
  });
});

describe("safe once-only demo initialization and explicit restore", () => {
  it("seeds atomically before React without authenticating or touching old app keys", () => {
    localStorage.setItem("microtrace_v3_store", '{"chemicals":[{"id":"real-stock"}]}');
    const writes = vi.spyOn(Storage.prototype, "setItem");
    expect(initializeDemo(firstDay)).toBe("seeded");
    expect(writes).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls[0][0]).toBe(DEMO_STORE_KEY);
    expect(localStorage.getItem(DEMO_AUTH_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_PROFILE_KEY)).toBeNull();
    expect(localStorage.getItem("microtrace_v3_store")).toBe('{"chemicals":[{"id":"real-stock"}]}');
  });

  it("never reseeds, rebases dates, duplicates rows or overwrites demo edits on reload", () => {
    initializeDemo(firstDay);
    const edited = buildDemoStore(firstDay);
    edited.containers[0].qty = 7;
    const raw = JSON.stringify(edited);
    localStorage.setItem(DEMO_STORE_KEY, raw);
    expect(initializeDemo(new Date(2027, 2, 10))).toBe("existing");
    expect(localStorage.getItem(DEMO_STORE_KEY)).toBe(raw);
  });

  it("respects an intentionally emptied demo instead of re-adding deleted samples", () => {
    localStorage.setItem(DEMO_STORE_KEY, '{"chemicals":[],"containers":[]}');
    expect(initializeDemo(firstDay)).toBe("existing");
    expect(localStorage.getItem(DEMO_STORE_KEY)).toBe('{"chemicals":[],"containers":[]}');
  });

  it("does not silently destroy a corrupt snapshot and offers a recoverable error", () => {
    localStorage.setItem(DEMO_STORE_KEY, "{broken");
    expect(initializeDemo(firstDay)).toBe("error");
    expect(localStorage.getItem(DEMO_STORE_KEY)).toBe("{broken");
    expect(demoStartupError()).toContain("Settings");
  });

  it("handles blocked/full storage without throwing before React can mount", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(initializeDemo(firstDay)).toBe("error");
    expect(demoStartupError()).toContain("device storage");
  });

  it("restores only the demo store, refreshes dates and notifies subscribed screens", async () => {
    localStorage.setItem(DEMO_AUTH_KEY, "keep-session");
    localStorage.setItem(DEMO_PROFILE_KEY, "keep-profile");
    localStorage.setItem("microtrace_v3_store", "keep-real-data");
    const onReset = vi.fn();
    window.addEventListener(DEMO_DATA_EVENT, onReset);
    restoreDemo(new Date(2027, 0, 5));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(DEMO_AUTH_KEY)).toBe("keep-session");
    expect(localStorage.getItem(DEMO_PROFILE_KEY)).toBe("keep-profile");
    expect(localStorage.getItem("microtrace_v3_store")).toBe("keep-real-data");
    const data = await fetchLabData();
    expect(data.chemicals).toHaveLength(38);
    expect(data.bookings).toHaveLength(2);
    expect(data.discrepancies).toHaveLength(1);
    expect(data.containers.find((item) => item.chemical_id === "it-11")?.expiry).toBe("2027-01-17");
    window.removeEventListener(DEMO_DATA_EVENT, onReset);
  });

  it("keeps every fetched collection an array even when individual saved fields are corrupt", async () => {
    localStorage.setItem(DEMO_STORE_KEY, '{"chemicals":false,"requests":"bad","audit_log":[null,5,{"id":1}]}');
    const data = await fetchLabData();
    for (const rows of Object.values(data)) expect(Array.isArray(rows)).toBe(true);
    expect(data.chemicals).toEqual([]);
    expect(data.audit).toEqual([{ id: 1 }]);
  });

  it("cannot activate cloud access even if Supabase variables are supplied", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-example-key");
    vi.resetModules();
    try {
      const { hasCloud, supabase } = await import("@/lib/supabase");
      expect(hasCloud).toBe(false);
      expect(supabase).toBeNull();
    } finally { vi.unstubAllEnvs(); }
  });
});

describe("restored instrument reservation behavior", () => {
  it("respects pending and approved slots and frees a cancelled slot", () => {
    const bookings = buildDemoStore(firstDay).instrument_bookings;
    expect(slotAvailable(bookings, "it-24", "2026-10-16", "09:00–11:00")).toBe(false);
    expect(slotAvailable(bookings, "it-25", "2026-10-15", "11:00–13:00")).toBe(false);
    expect(slotAvailable(bookings, "it-24", "2026-10-16", "13:00–15:00")).toBe(true);
    expect(slotAvailable(bookings.map((booking) => ({ ...booking, status: "cancelled" })), "it-24", "2026-10-16", "09:00–11:00")).toBe(true);
  });

  it("rechecks persisted slots, rejects double booking, and retains cancelled history", async () => {
    initializeDemo(firstDay);
    const original = buildDemoStore(firstDay).instrument_bookings[0];
    const row = { ...original, id: "new-reservation" };
    await expect(insert("instrument_bookings", row)).rejects.toThrow(/already booked/);
    await update("instrument_bookings", original.id, { status: "cancelled" });
    await insert("instrument_bookings", row);
    const data = await fetchLabData();
    expect(data.bookings).toHaveLength(3);
    expect(data.bookings.find((booking) => booking.id === original.id)?.status).toBe("cancelled");
  });

  it("accepts only one of two immediate attempts to reserve the same free slot", async () => {
    const row = { chemical_id: "instrument-1", date: "2027-01-01", slot: "09:00–11:00", status: "pending" };
    const outcomes = await Promise.allSettled([insert("instrument_bookings", row), insert("instrument_bookings", row)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect((await fetchLabData()).bookings).toHaveLength(1);
  });
});

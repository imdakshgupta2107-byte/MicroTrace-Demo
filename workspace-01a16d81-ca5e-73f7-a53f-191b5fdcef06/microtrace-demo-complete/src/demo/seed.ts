// Adapt the ACTUAL earlier data.js records to the container-based MicroTrace 6
// model. No invented replacement inventory. Original quantities are opening
// balances: historical issued/received rows must NOT be applied a second time.
import legacy from "./legacy-demo.json";
import { DEMO_BUILD, DEMO_DATA_EVENT, DEMO_STORE_KEY } from "./config";
import { controlSeed } from "@/registers/ledger";
import { serviceDeskSeed } from "@/service-desk/ledger";
import { containerTypeFromLabel } from "@/lib/category-colors";
import type {
  AuditEntry, Category, Chemical, Container, Discrepancy, InstrumentBooking,
  LabRequest, Practical, PurchaseOrder, Role, Vendor, VendorPrice,
} from "@/lib/types";

const DAY = 86_400_000;
const anchor = Date.parse(`${legacy.referenceDate}T00:00:00.000Z`);
const CATEGORY_MAP: Record<string, Category> = {
  Chemicals: "Chemical", "Culture Media": "Culture Media", Glassware: "Glassware",
  Instruments: "Instrument", Consumables: "Consumable", Cultures: "Culture",
};

/** Shift the archived demo dates to the FIRST LAUNCH (or explicit reset) day. */
export function demoDate(value: string, now = new Date()): string {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const shifted = new Date(Date.parse(value) + today - anchor).toISOString();
  return value.length === 10 ? shifted.slice(0, 10) : shifted;
}

const person = (id: string | null): string | null =>
  id ? legacy.users.find((user) => user.id === id)?.name ?? "Demo user" : null;

export function buildDemoStore(now = new Date()) {
  const date = (value: string) => demoDate(value, now);
  const timestamp = (value: string | null): string | null => value ? `${date(value)}T10:00:00.000Z` : null;
  const stockDate = timestamp(legacy.createdAt.slice(0, 10))!;
  const containerId = (itemId: string) => `demo-container-${itemId}`;
  const itemLabel = (id: string) => { const entry = legacy.items.find((row) => row.id === id); return { name: entry?.name ?? "Sample item", unit: entry?.unit ?? "units" }; };
  const controlFixtures = controlSeed(now, itemLabel);
  const serviceDeskFixtures = serviceDeskSeed(now, itemLabel);

  const chemicals: Chemical[] = legacy.items.map((item) => ({
    id: item.id, name: item.name, category: CATEGORY_MAP[item.category], unit: item.unit,
    min_stock: item.min, ghs: [...item.ghs],
    storage_group: item.group === "flammable" ? "flammable" : item.group === "oxidizer" ? "oxidizer"
      : item.group === "toxic" ? "toxic" : item.group === "biohazard" ? "biohazard" : "general",
    ppe: item.ppe, supplier: item.sup,
    notes: `Restored from the earlier MicroTrace demo. ${item.ret ? "Returnable equipment / glassware." : "Consumable stock."} Sample safety labels are not a substitute for the current supplier SDS.`,
    pubchem_cid: null, created_at: stockDate,
  }));

  const containers: Container[] = legacy.items.map((item) => ({
    id: containerId(item.id), chemical_id: item.id, label: `${item.name} · Opening stock`,
    container_type: containerTypeFromLabel(`${item.name} ${item.category}`),
    barcode: item.barcode, qty: item.qty, unit_size: item.qty, location: item.loc,
    expiry: item.exp ? date(item.exp) : null, state: "sealed", opened_at: null,
    use_by: null, created_at: stockDate,
  }));

  const requests: LabRequest[] = legacy.requests.map((request) => ({
    id: request.id, chemical_id: request.itemId,
    container_id: request.issueDate ? containerId(request.itemId) : null,
    qty: request.qty, purpose: request.purpose, requester: person(request.userId)!,
    requester_role: (legacy.users.find((user) => user.id === request.userId)?.role ?? "student") as Role,
    status: request.status as LabRequest["status"], decided_by: person(request.decidedBy),
    note: "note" in request && typeof request.note === "string" ? request.note : null,
    requested_at: timestamp(request.requestedOn)!, issued_at: timestamp(request.issueDate),
    return_due: request.returnDue ? date(request.returnDue) : null,
    returned_at: timestamp(request.returnedOn), created_by_device: "RESTORED-DEMO",
  })).sort((a, b) => b.requested_at.localeCompare(a.requested_at));

  const vendors: Vendor[] = legacy.vendors.map((vendor) => ({
    id: vendor.id, name: vendor.name, phone: "", email: vendor.contact.split(" · ")[0],
    address: vendor.contact.split(" · ").slice(1).join(" · "),
    notes: `${vendor.kind}. Original demo contact only — not verified purchasing information.`, created_at: stockDate,
  }));

  const prices: VendorPrice[] = legacy.prices.map((quote, index) => ({
    id: `demo-price-${String(index + 1).padStart(2, "0")}`,
    chemical_id: quote.itemId, vendor_id: quote.vendorId,
    pack_label: quote.pack,
    // The old seed described a 100-piece glove BOX / 50-piece mask BOX while
    // recording stock in BOXES. One quoted box is one stock unit, not 100/50.
    pack_size: quote.itemId === "it-29" || quote.itemId === "it-30" ? 1 : quote.packSize,
    price_inr: quote.price, updated_at: stockDate,
  }));

  const purchaseOrders: PurchaseOrder[] = legacy.pos.map((order) => ({
    id: order.id, chemical_id: order.itemId, vendor_id: order.vendorId,
    packs: order.packs, pack_size: order.packSize, unit_price: order.unitPrice,
    total_inr: order.total, status: order.status as PurchaseOrder["status"],
    created_by: person(order.createdBy)!, created_at: timestamp(order.createdOn)!,
    ordered_at: timestamp(order.orderedOn), received_at: timestamp(order.receivedOn),
  })).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const practicals: Practical[] = legacy.practicals.map((practical) => ({
    id: practical.id, title: practical.title, class_name: practical.cls,
    scheduled_on: date(practical.date), created_by: person(practical.createdBy)!,
    created_at: timestamp(practical.createdOn)!,
    chemicals: practical.chems.map((item) => ({ chemical_id: item.itemId, qty: item.qty })),
  }));

  const bookings: InstrumentBooking[] = legacy.bookings.map((booking) => ({
    id: booking.id, chemical_id: booking.itemId, date: date(booking.date), slot: booking.slot,
    booked_by: person(booking.by)!, booked_by_role: (legacy.users.find((user) => user.id === booking.by)?.role ?? "student") as Role,
    purpose: booking.purpose, status: booking.status as InstrumentBooking["status"],
    decided_by: person(booking.decidedBy), note: booking.note, created_at: timestamp(booking.createdOn)!,
  }));

  const discrepancies: Discrepancy[] = legacy.breakages.map((report) => ({
    id: report.id, chemical_id: report.itemId, container_id: containerId(report.itemId),
    kind: "breakage", qty_lost: report.qty, reason: report.reason, reported_by: person(report.by)!,
    status: "reported", decided_by: null, resolved_at: null, created_at: timestamp(report.date)!,
  }));

  const audit: AuditEntry[] = legacy.logs.map((log, index) => ({
    id: index + 1, actor: log.who, action: log.action, entity: "demo-history",
    entity_id: `legacy-log-${index + 1}`, created_at: date(log.ts),
  })).sort((a, b) => b.id - a.id);

  return {
    chemicals, containers, requests, vendors, vendor_prices: prices,
    purchase_orders: purchaseOrders, practicals, instrument_bookings: bookings,
    discrepancies, audit_log: audit, incidents: [], lab_notes: [],
    // New workflow fixtures are explicitly illustrative and do not rewrite the restored history.
    register_indents: controlFixtures.indents,
    register_receipts: controlFixtures.receipts, register_handovers: controlFixtures.handovers, register_closures: controlFixtures.closures,
    register_counts: controlFixtures.counts, register_investigations: controlFixtures.investigations, register_control_audit: controlFixtures.control_audit,
    // The Lab Desk fixtures demonstrate report-vs-request routing without altering restored stock.
    service_tickets: serviceDeskFixtures.tickets, service_desk_audit: serviceDeskFixtures.audit,
    // Keep all seven original sample people (including pending examples), not passwords.
    demo_users: legacy.users.map((user) => ({ ...user, joined: date(user.joined) })),
    demo_meta: [{ id: "original-demo-v1", version: 1, seeded_at: now.toISOString(), reference_date: date(legacy.referenceDate) }],
  };
}

export type DemoStore = ReturnType<typeof buildDemoStore>;
let startupError: string | null = null;
export const demoStartupError = () => startupError;

/** Once, before React mounts. Never seed from a render, effect or getSnapshot. */
export function initializeDemo(now = new Date()): "seeded" | "existing" | "error" | "disabled" {
  if (!DEMO_BUILD) return "disabled";
  try {
    const raw = window.localStorage.getItem(DEMO_STORE_KEY);
    // Even a deliberately emptied demo must stay empty on reload. No merging,
    // duplicate seeds, or silent replacement of existing/corrupt user edits.
    if (raw !== null) {
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Unreadable demo snapshot");
      startupError = null;
      return "existing";
    }
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(buildDemoStore(now)));
    startupError = null;
    return "seeded";
  } catch {
    startupError = "Demo data could not be loaded. Check device storage, or sign in as lab staff and restore the demo in Settings.";
    return "error";
  }
}

/** Only called after the explicit reset confirmation. One atomic store write. */
export function restoreDemo(now = new Date()): void {
  if (!DEMO_BUILD) throw new Error("Demo records cannot be restored in a live lab.");
  window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(buildDemoStore(now)));
  startupError = null;
  window.dispatchEvent(new Event(DEMO_DATA_EVENT));
}

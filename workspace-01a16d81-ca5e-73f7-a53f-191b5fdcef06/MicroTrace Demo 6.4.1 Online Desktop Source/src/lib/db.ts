import { DEMO_BUILD, DEMO_STORE_KEY } from "@/demo/config";
// db — fetchAll/insert/update/delete for every collection.
// Mode A: Supabase tables (when VITE_SUPABASE_* are set).
// Mode B: identical API over localStorage (offline / demo).
import { supabase } from "./supabase";
import { demoSharedRequests, DEMO_SHARED_REQUESTS_TABLE } from "@/demo/shared-requests";
import { uid } from "./utils";
import type {
  AuditEntry, Chemical, Container, Discrepancy, Incident, LabData,
  LabNote, LabRequest, Practical, PurchaseOrder, Vendor, VendorPrice, InstrumentBooking,
  InventoryCategoryRecord, LabProject, ProjectTeam, LabBench, LabResource, ProjectBooking,
  ProjectReagentQuota, BookingResourceReservation, BookingReagentReservation,
} from "./types";

export const TABLES = [
  "chemicals", "containers", "requests", "vendors", "vendor_prices",
  "purchase_orders", "practicals", "instrument_bookings", "incidents", "discrepancies", "audit_log", "lab_notes",
  "inventory_categories", "projects", "project_teams", "lab_benches", "lab_resources",
  "project_bookings", "project_reagent_quotas", "booking_resource_reservations", "booking_reagent_reservations",
] as const;

export type TableName = (typeof TABLES)[number];

type AnyRow = Record<string, unknown> & { id?: string | number };

/* ---------------- local fallback store ---------------- */
const LS_KEY = DEMO_STORE_KEY;
type Store = Record<string, AnyRow[]>;

function readStore(): Store {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, rows]) => [key,
      Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object" && !Array.isArray(row)) : []
    ])) as Store;
  } catch { return {}; }
}
function writeStore(st: Store) { localStorage.setItem(LS_KEY, JSON.stringify(st)); }

const localInsert = (table: string, row: AnyRow): AnyRow => {
  const st = readStore();
  const arr = (st[table] ||= []);
  // Check the latest local data too, not just a possibly stale form snapshot.
  if (table === "instrument_bookings" && arr.some((booking) =>
    booking.chemical_id === row.chemical_id && booking.date === row.date && booking.slot === row.slot
      && (booking.status === "pending" || booking.status === "approved"))) {
    throw new Error("That instrument slot is already booked. Choose a different time.");
  }
  // Mirror the server's timestamp default in offline mode too. Audit views and
  // exports must not receive undefined created_at values on a local-only phone.
  const stamped = { ...row, created_at: row.created_at ?? new Date().toISOString() };
  const previousAuditId = table === "audit_log" ? arr.reduce((largest, entry) => {
    const value = Number(entry.id);
    return Number.isSafeInteger(value) ? Math.max(largest, value) : largest;
  }, 0) : 0;
  const rec = table === "audit_log"
    ? { ...stamped, id: Math.max(Date.now(), previousAuditId + 1) }
    : { ...stamped, id: (row.id as string) || uid() };
  arr.unshift(rec);
  writeStore(st);
  return rec;
};
const localUpdate = (table: string, id: string | number, patch: AnyRow): void => {
  const st = readStore();
  const arr = (st[table] ||= []);
  const ix = arr.findIndex((r) => String(r.id) === String(id));
  if (ix >= 0) arr[ix] = { ...arr[ix], ...patch };
  writeStore(st);
};
const localDelete = (table: string, id: string | number): void => {
  const st = readStore();
  st[table] = ((st[table] ||= [])).filter((r) => String(r.id) !== String(id));
  writeStore(st);
};
const localAll = (table: string): AnyRow[] => readStore()[table] ?? [];

/** for realtime.ts — re-reads everything locally */
export function localSnapshot(): LabData { return mapSnapshot({}); }

/* ---------------- column orderings ---------------- */
const ORDER: Partial<Record<TableName, { col: string; asc: boolean }>> = {
  chemicals: { col: "name", asc: true },
  requests: { col: "requested_at", asc: false },
  purchase_orders: { col: "created_at", asc: false },
  practicals: { col: "scheduled_on", asc: true },
  instrument_bookings: { col: "date", asc: true },
  audit_log: { col: "id", asc: false },
  incidents: { col: "occurred_at", asc: false },
  containers: { col: "label", asc: true },
  vendors: { col: "name", asc: true },
  lab_notes: { col: "updated_at", asc: false },
  discrepancies: { col: "created_at", asc: false },
  projects: { col: "created_at", asc: false },
  project_teams: { col: "created_at", asc: true },
  lab_benches: { col: "code", asc: true },
  lab_resources: { col: "code", asc: true },
  project_bookings: { col: "starts_at", asc: true },
  project_reagent_quotas: { col: "created_at", asc: false },
};

/* ---------------- generic CRUD ---------------- */
export async function fetchAll(table: TableName): Promise<AnyRow[]> {
  if (table === "requests" && demoSharedRequests) {
    const { data, error } = await demoSharedRequests
      .from(DEMO_SHARED_REQUESTS_TABLE)
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) throw new Error("shared demo requests: " + error.message);
    return (data ?? []) as AnyRow[];
  }
  if (!supabase) { if (!DEMO_BUILD) throw new Error("Live backend is not configured. No demo fallback is permitted."); return localAll(table); }
  const rows: AnyRow[] = [];
  for (let page = 0; page < 50; page++) {
    let q = supabase.from(table).select("*").range(page * 1000, page * 1000 + 999);
    const order = ORDER[table];
    if (order) q = q.order(order.col, { ascending: order.asc });
    if (order?.col !== "id") q = q.order("id");
    const { data, error } = await q;
    if (error) throw new Error(table + ": " + error.message);
    const batch = (data ?? []) as AnyRow[]; rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
  throw new Error("Dataset too large; refusing to display a partial inventory.");
}

export async function insert(table: TableName, row: AnyRow): Promise<AnyRow> {
  if (table === "requests" && demoSharedRequests) {
    const { data, error } = await demoSharedRequests.from(DEMO_SHARED_REQUESTS_TABLE).insert(row).select().single();
    if (error) throw new Error("Create shared demo request: " + error.message);
    return data as AnyRow;
  }
  if (!supabase) { if (!DEMO_BUILD) throw new Error("Connect the live backend first."); return localInsert(table, row); }
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw new Error("Insert into " + table + ": " + error.message);
  return data as AnyRow;
}

export async function update(table: TableName, id: string | number, patch: AnyRow): Promise<void> {
  if (table === "requests" && demoSharedRequests) {
    const { error } = await demoSharedRequests.from(DEMO_SHARED_REQUESTS_TABLE).update(patch).eq("id", id);
    if (error) throw new Error("Update shared demo request: " + error.message);
    return;
  }
  if (!supabase) { if (!DEMO_BUILD) throw new Error("Connect the live backend first."); return localUpdate(table, id, patch); }
  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) throw new Error("Update " + table + ": " + error.message);
}

export async function del(table: TableName, id: string | number): Promise<void> {
  if (table === "requests" && demoSharedRequests) {
    const { error } = await demoSharedRequests.from(DEMO_SHARED_REQUESTS_TABLE).delete().eq("id", id);
    if (error) throw new Error("Delete shared demo request: " + error.message);
    return;
  }
  if (!supabase) { if (!DEMO_BUILD) throw new Error("Connect the live backend first."); return localDelete(table, id); }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error("Delete from " + table + ": " + error.message);
}

/* ---------------- whole-lab snapshot (typed) ---------------- */
export async function fetchLabData(): Promise<LabData> {
  if (!supabase) {
    if (!DEMO_BUILD) throw new Error("Connect the live backend first.");
    const local = mapSnapshot({});
    if (!demoSharedRequests) return local;
    const requests = await fetchAll("requests");
    return { ...local, requests: requests as unknown as LabRequest[] };
  }
  const [
    chemicals, containers, requests, vendors, prices,
    pos, practicals, incidents, discrepancies, audit, notes, bookings,
    inventoryCategories, projects, projectTeams, benches, resources, projectBookings,
    projectQuotas, bookingResourceReservations, bookingReagentReservations,
  ] = await Promise.all([
    fetchAll("chemicals"), fetchAll("containers"), fetchAll("requests"),
    fetchAll("vendors"), fetchAll("vendor_prices"), fetchAll("purchase_orders"),
    fetchAll("practicals"), fetchAll("incidents"), fetchAll("discrepancies"),
    fetchAll("audit_log"), fetchAll("lab_notes"), fetchAll("instrument_bookings"),
    fetchAll("inventory_categories"), fetchAll("projects"), fetchAll("project_teams"),
    fetchAll("lab_benches"), fetchAll("lab_resources"), fetchAll("project_bookings"),
    fetchAll("project_reagent_quotas"), fetchAll("booking_resource_reservations"), fetchAll("booking_reagent_reservations"),
  ]);
  return {
    chemicals: chemicals as unknown as Chemical[],
    containers: containers as unknown as Container[],
    requests: requests as unknown as LabRequest[],
    vendors: vendors as unknown as Vendor[],
    prices: prices as unknown as VendorPrice[],
    pos: pos as unknown as PurchaseOrder[],
    practicals: practicals as unknown as Practical[],
    bookings: bookings as unknown as InstrumentBooking[],
    incidents: incidents as unknown as Incident[],
    discrepancies: discrepancies as unknown as Discrepancy[],
    audit: audit as unknown as AuditEntry[],
    notes: notes as unknown as LabNote[],
    inventoryCategories: inventoryCategories as unknown as InventoryCategoryRecord[],
    projects: projects as unknown as LabProject[],
    projectTeams: projectTeams as unknown as ProjectTeam[],
    benches: benches as unknown as LabBench[],
    resources: resources as unknown as LabResource[],
    projectBookings: projectBookings as unknown as ProjectBooking[],
    projectQuotas: projectQuotas as unknown as ProjectReagentQuota[],
    bookingResourceReservations: bookingResourceReservations as unknown as BookingResourceReservation[],
    bookingReagentReservations: bookingReagentReservations as unknown as BookingReagentReservation[],
  };
}

function mapSnapshot(_unused: Record<string, never>): LabData {
  const st = readStore();
  const get = (k: string) => (st[k] ?? []) as AnyRow[];
  return {
    chemicals: get("chemicals") as unknown as Chemical[],
    containers: get("containers") as unknown as Container[],
    requests: get("requests") as unknown as LabRequest[],
    vendors: get("vendors") as unknown as Vendor[],
    prices: get("vendor_prices") as unknown as VendorPrice[],
    pos: get("purchase_orders") as unknown as PurchaseOrder[],
    practicals: get("practicals") as unknown as Practical[],
    bookings: get("instrument_bookings") as unknown as InstrumentBooking[],
    incidents: get("incidents") as unknown as Incident[],
    discrepancies: get("discrepancies") as unknown as Discrepancy[],
    audit: get("audit_log") as unknown as AuditEntry[],
    notes: get("lab_notes") as unknown as LabNote[],
    inventoryCategories: get("inventory_categories") as unknown as InventoryCategoryRecord[],
    projects: get("projects") as unknown as LabProject[],
    projectTeams: get("project_teams") as unknown as ProjectTeam[],
    benches: get("lab_benches") as unknown as LabBench[],
    resources: get("lab_resources") as unknown as LabResource[],
    projectBookings: get("project_bookings") as unknown as ProjectBooking[],
    projectQuotas: get("project_reagent_quotas") as unknown as ProjectReagentQuota[],
    bookingResourceReservations: get("booking_resource_reservations") as unknown as BookingResourceReservation[],
    bookingReagentReservations: get("booking_reagent_reservations") as unknown as BookingReagentReservation[],
  };
}

/* ---------------- audit helper ---------------- */
export async function audit(actor: string, action: string, entity = "", entityId = ""): Promise<void> {
  if (!DEMO_BUILD) return; // Live immutable audits are generated by database triggers.
  try { await insert("audit_log", { id: 0, actor, action, entity, entity_id: entityId }); } catch { /* never block UX on audit */ }
}

// ---------- core domain types (mirror supabase/schema.sql) ----------
export type Role = "student" | "teacher" | "staff" | "principal";

export type Category =
  | "Chemical" | "Culture Media" | "Glassware"
  | "Instrument" | "Consumable" | "Culture";

export type StorageGroup =
  | "acid" | "base" | "oxidizer" | "flammable" | "toxic" | "biohazard" | "general";

export type ScientificDimension =
  | "mass" | "volume" | "length" | "substance_amount"
  | "mass_concentration" | "molar_concentration" | "count";

export interface Chemical {
  id: string;
  name: string;
  category: Category;
  unit: string;                 // legacy display unit: g, mL, pcs, units…
  /** v3.5 semantic category; legacy rows are inferred until backfilled. */
  inventory_category_key?: string;
  /** v3.5 normalized unit metadata. Canonical values are g/L/m/mol as applicable. */
  unit_code?: string;
  unit_dimension?: ScientificDimension;
  min_stock_base?: number | string;
  min_stock: number;
  ghs: string[];                // GHS01..GHS09
  storage_group: StorageGroup;
  ppe: string;
  supplier: string;
  notes: string;
  pubchem_cid: number | null;
  created_at?: string;
  updated_at?: string;
}

/** `quarantined` is available in the local PIN demo; secure live deployments retain their database-approved state vocabulary until formally migrated. */
export type ContainerState = "sealed" | "opened" | "depleted" | "quarantined" | "disposed";

/** A strict, color-mapped physical vessel class. No color is stored on a container. */
export type ContainerType =
  | "volumetric_glassware"
  | "storage_glassware"
  | "amber_bottle"
  | "plasticware"
  | "cryogenic_vial"
  | "metal_storage";

export interface Container {
  id: string;
  chemical_id: string;
  label: string;
  /** Locked vessel type drives the visual accent across cards, racks and detail sheets. */
  container_type?: ContainerType;
  barcode: string | null;
  qty: number;                  // remaining, in legacy chemical display unit
  unit_size: number;            // full bottle size
  qty_base?: number | string;   // normalized scientific quantity where applicable
  unit_size_base?: number | string;
  unit_code?: string;
  unit_dimension?: ScientificDimension;
  qty_input_unit_code?: string;
  unit_size_input_unit_code?: string;
  location: string;
  expiry: string | null;        // ISO date
  state: ContainerState;
  opened_at: string | null;
  use_by: string | null;
  created_at?: string;
}

export type RequestStatus = "pending" | "approved" | "issued" | "returned" | "rejected" | "withdrawn";

export interface LabRequest {
  owner_id?: string;
  id: string;
  chemical_id: string;
  container_id: string | null;
  qty: number;
  purpose: string;
  requester: string;
  requester_role: Role;
  status: RequestStatus;
  decided_by: string | null;
  note: string | null;
  requested_at: string;
  issued_at: string | null;
  return_due: string | null;
  returned_at: string | null;
  created_by_device: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at?: string;
}

export interface VendorPrice {
  id: string;
  chemical_id: string;
  vendor_id: string;
  pack_label: string;
  pack_size: number;            // in chemical unit
  price_inr: number;
  updated_at?: string;
}

export type SlotCode = "weekly" | "monthly" | "yearly";
export type POStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  chemical_id: string;
  vendor_id: string | null;
  packs: number;
  pack_size: number;
  unit_price: number;
  total_inr: number;
  status: POStatus;
  created_by: string;
  ordered_at: string | null;
  received_at: string | null;
  created_at?: string;
}

export interface PracticalChem { chemical_id: string; qty: number; }

export interface Practical {
  id: string;
  title: string;
  class_name: string;
  scheduled_on: string;         // ISO date
  chemicals: PracticalChem[];
  created_by: string;
  created_at?: string;
}

export type IncidentKind = "spill" | "eye" | "skin" | "fire" | "culture" | "gas" | "other";

export interface Incident {
  id: string;
  kind: IncidentKind;
  chemical_id: string | null;
  location: string;
  description: string;
  action_taken: string;
  reported_by: string;
  occurred_at: string;
  created_at?: string;
}

export type BookingStatus = "pending" | "approved" | "declined" | "cancelled";

export interface InstrumentBooking {
  owner_id?: string;
  id: string;
  chemical_id: string;
  date: string;
  slot: string;
  booked_by: string;
  booked_by_role: Role;
  purpose: string;
  status: BookingStatus;
  decided_by: string | null;
  note: string;
  created_at?: string;
}

export type DiscrepancyKind = "breakage" | "waste" | "contamination" | "count-mismatch";
export type DiscrepancyStatus = "reported" | "written-off" | "declined";

export interface Discrepancy {
  id: string;
  container_id: string | null;
  chemical_id: string;
  kind: DiscrepancyKind;
  qty_lost: number;
  reason: string;
  reported_by: string;
  status: DiscrepancyStatus;
  decided_by: string | null;
  resolved_at: string | null;
  created_at?: string;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
}

export interface LabNote {
  id: string;
  author: string;
  title: string;
  body: string;
  created_at?: string;
  updated_at?: string;
}

// ---------- project scheduling (v3.5) ----------
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
export type ProjectBookingState = "draft" | "pending" | "confirmed" | "active" | "completed" | "cancelled" | "rejected";
export type ProjectMemberRole = "research_lead" | "co_lead" | "researcher" | "technician" | "student";

export interface LabProject {
  id: string;
  project_code: string;
  title: string;
  description: string;
  parent_project_id: string | null;
  status: ProjectStatus;
  research_lead_id?: string | null;
  research_lead_name?: string | null;
  starts_on: string | null;
  ends_on: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTeam {
  id: string;
  project_id: string;
  team_code: string;
  name: string;
  lead_member_id?: string | null;
  created_at?: string;
}

export interface LabBench {
  id: string;
  code: string;
  name: string;
  room_name: string;
  hazard_zone_id?: string | null;
  active: boolean;
  notes?: string;
}

export type LabResourceKind = "bench_tool" | "instrument" | "fume_hood" | "biosafety_cabinet" | "cold_storage" | "other";

export interface LabResource {
  id: string;
  code: string;
  name: string;
  kind: LabResourceKind;
  bench_id?: string | null;
  requires_exclusive_booking: boolean;
  active: boolean;
  notes?: string;
}

export interface ProjectBooking {
  id: string;
  project_id: string;
  team_id: string | null;
  bench_id: string;
  booked_by?: string | null;
  /** PostgREST returns a tstzrange as [start,end). Demo uses these explicit ISO strings. */
  starts_at: string;
  ends_at: string;
  period?: string;
  state: ProjectBookingState;
  purpose: string;
  notes: string;
  created_at?: string;
}

export interface ProjectReagentQuota {
  id: string;
  project_id: string;
  chemical_id: string;
  dimension: ScientificDimension;
  allocated_base: number | string;
  reserved_base: number | string;
  consumed_base: number | string;
  created_at?: string;
}

export interface BookingResourceReservation {
  id: string;
  booking_id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  period?: string;
  state: ProjectBookingState;
}

export interface BookingReagentReservation {
  id: string;
  booking_id: string;
  quota_id: string;
  requested_base: number | string;
  issued_base: number | string;
  state: ProjectBookingState;
}

export interface InventoryCategoryRecord {
  key: string;
  display_name: string;
  accent_hex: string;
  icon_key: string;
  is_system: boolean;
  active?: boolean;
}

// ---------- joined / derived shapes ----------
export interface ChemicalWithStock extends Chemical {
  stock: number;                // Σ containers.qty (non-disposed)
  containers: Container[];
  low: boolean;
}

export interface PriceComparison extends VendorPrice {
  vendor_name: string;
  per_unit: number;
  is_best: boolean;
}

export interface StockAlert {
  chemical: Chemical;
  stock: number;
  shortfall: number;
  comparisons: PriceComparison[];
}

export interface LabData {
  chemicals: Chemical[];
  containers: Container[];
  requests: LabRequest[];
  vendors: Vendor[];
  prices: VendorPrice[];
  pos: PurchaseOrder[];
  practicals: Practical[];
  bookings: InstrumentBooking[];
  incidents: Incident[];
  discrepancies: Discrepancy[];
  audit: AuditEntry[];
  notes: LabNote[];
  inventoryCategories: InventoryCategoryRecord[];
  projects: LabProject[];
  projectTeams: ProjectTeam[];
  benches: LabBench[];
  resources: LabResource[];
  projectBookings: ProjectBooking[];
  projectQuotas: ProjectReagentQuota[];
  bookingResourceReservations: BookingResourceReservation[];
  bookingReagentReservations: BookingReagentReservation[];
}

// ---------- barcode ----------
export interface Gs1Code {
  raw: string;
  gtin?: string;                // AI (01)
  expiry?: string;              // AI (17)
  batch?: string;               // AI (10)
  serial?: string;              // AI (21)
}

// ---------- workbench ----------
export interface PlateBand { label: string; x: number; y: number; }
export interface TimerSpec { id: number; label: string; durSec: number; leftSec: number; on: boolean; done: boolean; endAt: number; }

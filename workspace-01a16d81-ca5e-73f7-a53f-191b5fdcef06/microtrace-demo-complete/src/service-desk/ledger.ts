import type { Chemical } from "@/lib/types";
import { mutateRoot, type DemoRoot } from "@/registers/ledger";
export type { DemoRoot } from "@/registers/ledger";
import type {
  DeskActor, DeskChannel, DeskPriority, DeskStatus, ReportKind, RequirementKind,
  ServiceDeskAudit, ServiceDeskStore, ServiceTicket,
} from "./types";

const stamp = () => new Date().toISOString();
const compact = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${compact()}`;
const clean = (value: string, max: number) => value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").slice(0, max);
const quantity = (value: number | null | undefined) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 10_000) / 10_000 : null;

const rows = <T>(root: DemoRoot, key: string): T[] => Array.isArray(root[key]) ? root[key] as T[] : [];

export function emptyServiceDesk(): ServiceDeskStore { return { version: 1, tickets: [], audit: [] }; }
export function getServiceDesk(root: DemoRoot): ServiceDeskStore {
  return {
    version: 1,
    tickets: rows<ServiceTicket>(root, "service_tickets"),
    audit: rows<ServiceDeskAudit>(root, "service_desk_audit"),
  };
}
export function setServiceDesk(root: DemoRoot, store: ServiceDeskStore): void {
  root.service_tickets = store.tickets;
  root.service_desk_audit = store.audit;
}

function validateActor(actor: DeskActor): void {
  if (!actor || !actor.role || !actor.name?.trim()) throw new Error("Choose a demo role and profile before recording an operational entry.");
}
function requireOperationsOwner(actor: DeskActor): void {
  validateActor(actor);
  if (actor.role !== "staff" && actor.role !== "principal") throw new Error("Only lab staff or principal can progress this operational entry in the demo.");
}
function relatedItem(root: DemoRoot, itemId: string | null | undefined): Chemical | null {
  if (!itemId) return null;
  const item = (root.chemicals ?? []).find((row) => row.id === itemId);
  if (!item) throw new Error("The selected inventory item is unavailable.");
  return item;
}
function nextReference(store: ServiceDeskStore, channel: DeskChannel): string {
  const prefix = channel === "report" ? "RPT" : "REQ";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = store.tickets.filter((ticket) => ticket.channel === channel).length + 1;
  return `${prefix}-${date}-${String(count).padStart(3, "0")}`;
}
function routeFor(channel: DeskChannel, actor: DeskActor, category: ReportKind | RequirementKind): Pick<ServiceTicket, "recipient_roles" | "escalation_role" | "route_label"> {
  if (channel === "report") {
    if (actor.role === "teacher") return { recipient_roles: ["staff", "principal"], escalation_role: "principal", route_label: "Lab staff audit · principal oversight" };
    return { recipient_roles: ["staff"], escalation_role: "principal", route_label: "Lab staff audit · principal digest if unresolved" };
  }
  if (actor.role === "student") return { recipient_roles: ["teacher", "staff"], escalation_role: null, route_label: "Teacher endorsement → lab staff fulfilment" };
  if (actor.role === "teacher") return {
    recipient_roles: category === "procurement" ? ["staff", "principal"] : ["staff"],
    escalation_role: category === "procurement" ? "principal" : null,
    route_label: category === "procurement" ? "Lab staff review · principal procurement oversight" : "Lab staff fulfilment",
  };
  return { recipient_roles: ["staff", "principal"], escalation_role: "principal", route_label: "Lab staff review · principal oversight" };
}
function appendAudit(root: DemoRoot, store: ServiceDeskStore, actor: DeskActor, ticket: ServiceTicket, action: string, detail: string): void {
  const at = stamp();
  const entry: ServiceDeskAudit = { id: id("desk-audit"), ticket_id: ticket.id, at, actor: clean(actor.name, 120), role: actor.role, action: clean(action, 140), detail: clean(detail, 420) };
  store.audit.unshift(entry);
  const log = Array.isArray(root.audit_log) ? root.audit_log : [];
  const largest = log.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
  log.unshift({ id: Math.max(Date.now(), largest + 1), actor: entry.actor, action: `${entry.action} [lab desk]`, entity: "service-ticket", entity_id: ticket.id, created_at: at });
  root.audit_log = log;
}
function ticket(store: ServiceDeskStore, ticketId: string): ServiceTicket {
  const found = store.tickets.find((row) => row.id === ticketId);
  if (!found) throw new Error("This operational entry is no longer available.");
  return found;
}
function isTerminal(status: DeskStatus) { return ["fulfilled", "resolved", "declined", "withdrawn"].includes(status); }
function updateStamp(record: ServiceTicket) { record.updated_at = stamp(); }

export function createDeskReport(root: DemoRoot, actor: DeskActor, input: {
  category: ReportKind; priority: DeskPriority; title: string; detail: string; location: string; related_item_id?: string | null;
}): DemoRoot {
  return mutateRoot(root, (next) => {
    validateActor(actor);
    const title = clean(input.title, 140), detail = clean(input.detail, 700), location = clean(input.location, 160);
    if (title.length < 4) throw new Error("Add a clear issue title.");
    if (detail.length < 8) throw new Error("Describe what was observed, so lab staff can verify it.");
    if (location.length < 2) throw new Error("Record the station, bay, cupboard or other location.");
    const item = relatedItem(next, input.related_item_id);
    const store = getServiceDesk(next);
    const routing = routeFor("report", actor, input.category);
    const at = stamp();
    const record: ServiceTicket = {
      id: id("report"), reference: nextReference(store, "report"), channel: "report", category: input.category,
      priority: input.priority, title, detail, location, related_item_id: item?.id ?? null, related_item_name: item?.name ?? null,
      requested_qty: null, unit: item?.unit ?? null, needed_by: null, requester: clean(actor.name, 120), requester_role: actor.role,
      ...routing, status: "submitted", assigned_to: null, acknowledged_by: null, acknowledged_at: null,
      endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null,
      created_at: at, updated_at: at, source: "demo-entry",
    };
    store.tickets.unshift(record);
    appendAudit(next, store, actor, record, "Operational issue reported", `${record.reference}: ${record.category} at ${record.location}. No stock balance was changed.`);
    setServiceDesk(next, store);
  });
}

export function createDeskRequest(root: DemoRoot, actor: DeskActor, input: {
  category: RequirementKind; priority: DeskPriority; title: string; detail: string; location?: string; related_item_id?: string | null;
  qty?: number | null; needed_by?: string | null;
}): DemoRoot {
  return mutateRoot(root, (next) => {
    validateActor(actor);
    const title = clean(input.title, 140), detail = clean(input.detail, 700), location = clean(input.location ?? "", 160);
    if (title.length < 4) throw new Error("Describe the material, culture or preparation required.");
    if (detail.length < 8) throw new Error("Add the academic purpose, batch or research context.");
    if (input.needed_by && !/^\d{4}-\d{2}-\d{2}$/.test(input.needed_by)) throw new Error("Use a valid needed-by date.");
    const item = relatedItem(next, input.related_item_id);
    const requestedQty = quantity(input.qty);
    const store = getServiceDesk(next);
    const routing = routeFor("request", actor, input.category);
    const at = stamp();
    const record: ServiceTicket = {
      id: id("requirement"), reference: nextReference(store, "request"), channel: "request", category: input.category,
      priority: input.priority, title, detail, location, related_item_id: item?.id ?? null, related_item_name: item?.name ?? null,
      requested_qty: requestedQty, unit: item?.unit ?? null, needed_by: input.needed_by || null, requester: clean(actor.name, 120), requester_role: actor.role,
      ...routing, status: "submitted", assigned_to: null, acknowledged_by: null, acknowledged_at: null,
      endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null,
      created_at: at, updated_at: at, source: "demo-entry",
    };
    store.tickets.unshift(record);
    appendAudit(next, store, actor, record, "Material requirement submitted", `${record.reference}: ${record.category} requirement. This slip does not issue or deduct stock.`);
    setServiceDesk(next, store);
  });
}

export function acknowledgeDeskTicket(root: DemoRoot, actor: DeskActor, ticketId: string): DemoRoot {
  return mutateRoot(root, (next) => {
    requireOperationsOwner(actor);
    const store = getServiceDesk(next), record = ticket(store, ticketId);
    if (record.status !== "submitted") throw new Error("Only a submitted entry can be acknowledged.");
    if (record.requester === actor.name) throw new Error("The person who submitted an entry cannot acknowledge it as lab staff in the demo.");
    record.status = "acknowledged"; record.acknowledged_by = actor.name; record.acknowledged_at = stamp(); updateStamp(record);
    appendAudit(next, store, actor, record, "Operational entry acknowledged", `${record.reference}: receipt acknowledged; physical review or fulfilment remains pending.`);
    setServiceDesk(next, store);
  });
}

export function endorseDeskRequirement(root: DemoRoot, actor: DeskActor, ticketId: string, note = "Academic purpose reviewed."): DemoRoot {
  return mutateRoot(root, (next) => {
    validateActor(actor);
    if (actor.role !== "teacher") throw new Error("Only the teacher role can endorse a student material requirement in this demo.");
    const store = getServiceDesk(next), record = ticket(store, ticketId);
    if (record.channel !== "request" || record.requester_role !== "student" || record.status !== "submitted") throw new Error("Only a submitted student requirement can be endorsed.");
    record.status = "endorsed"; record.endorsed_by = actor.name; record.endorsed_at = stamp(); updateStamp(record);
    appendAudit(next, store, actor, record, "Student requirement endorsed", `${record.reference}: ${clean(note, 240) || "Academic purpose reviewed."} Routed to lab staff.`);
    setServiceDesk(next, store);
  });
}

export function startDeskWork(root: DemoRoot, actor: DeskActor, ticketId: string): DemoRoot {
  return mutateRoot(root, (next) => {
    requireOperationsOwner(actor);
    const store = getServiceDesk(next), record = ticket(store, ticketId);
    if (isTerminal(record.status)) throw new Error("This entry is already closed.");
    if (record.channel === "request" && record.requester_role === "student" && record.status !== "endorsed") {
      throw new Error("A student material requirement needs teacher endorsement before lab staff can fulfil it.");
    }
    if (!["submitted", "acknowledged", "endorsed", "in-progress"].includes(record.status)) throw new Error("This entry cannot be progressed from its current state.");
    record.status = "in-progress"; record.assigned_to = actor.name; updateStamp(record);
    appendAudit(next, store, actor, record, record.channel === "report" ? "Physical review started" : "Requirement fulfilment started", `${record.reference}: assigned to ${actor.name}. No inventory change was posted.`);
    setServiceDesk(next, store);
  });
}

export function completeDeskTicket(root: DemoRoot, actor: DeskActor, ticketId: string, outcome: string): DemoRoot {
  return mutateRoot(root, (next) => {
    requireOperationsOwner(actor);
    const store = getServiceDesk(next), record = ticket(store, ticketId), note = clean(outcome, 420);
    if (record.status !== "in-progress") throw new Error("Start the physical review or fulfilment before closing this entry.");
    if (note.length < 5) throw new Error("Record a meaningful outcome or follow-up note.");
    record.status = record.channel === "report" ? "resolved" : "fulfilled";
    record.outcome_note = note; record.completed_by = actor.name; record.completed_at = stamp(); updateStamp(record);
    appendAudit(next, store, actor, record, record.channel === "report" ? "Operational report resolved" : "Requirement marked fulfilled", `${record.reference}: ${note}. ${record.channel === "request" ? "Any stock issue must remain separately recorded." : "No stock balance was altered."}`);
    setServiceDesk(next, store);
  });
}

export function declineDeskTicket(root: DemoRoot, actor: DeskActor, ticketId: string, outcome: string): DemoRoot {
  return mutateRoot(root, (next) => {
    requireOperationsOwner(actor);
    const store = getServiceDesk(next), record = ticket(store, ticketId), note = clean(outcome, 420);
    if (isTerminal(record.status)) throw new Error("This entry is already closed.");
    if (note.length < 5) throw new Error("Record why this entry was declined or redirected.");
    record.status = "declined"; record.outcome_note = note; record.completed_by = actor.name; record.completed_at = stamp(); updateStamp(record);
    appendAudit(next, store, actor, record, "Operational entry declined", `${record.reference}: ${note}`);
    setServiceDesk(next, store);
  });
}

export function withdrawDeskTicket(root: DemoRoot, actor: DeskActor, ticketId: string): DemoRoot {
  return mutateRoot(root, (next) => {
    validateActor(actor);
    const store = getServiceDesk(next), record = ticket(store, ticketId);
    if (record.requester !== actor.name || record.status !== "submitted") throw new Error("Only the original requester can withdraw an unreviewed entry.");
    record.status = "withdrawn"; record.completed_by = actor.name; record.completed_at = stamp(); updateStamp(record);
    appendAudit(next, store, actor, record, "Operational entry withdrawn", `${record.reference}: withdrawn before review.`);
    setServiceDesk(next, store);
  });
}

export function serviceDeskSeed(nowDate: Date, findItem: (id: string) => { name: string; unit: string }): ServiceDeskStore {
  const at = nowDate.toISOString();
  const cotton = findItem("it-32"), ecoli = findItem("it-34"), broth = findItem("it-15"), microscope = findItem("it-23");
  const base = (partial: Omit<ServiceTicket, "id" | "created_at" | "updated_at" | "source"> & { id: string }): ServiceTicket => ({ ...partial, created_at: at, updated_at: at, source: "illustrative-fixture" });
  const tickets: ServiceTicket[] = [
    base({ id: "fixture-desk-report-cotton", reference: "RPT-CONTROL-001", channel: "report", category: "contamination", priority: "routine", title: "Cotton roll is damp and soiled", detail: "Observed before the staining practical. The roll was kept aside; no quantity was written off.", location: "Bay 3 preparation bench", related_item_id: "it-32", related_item_name: cotton.name, requested_qty: null, unit: cotton.unit, needed_by: null, requester: "Aarav Sharma", requester_role: "student", recipient_roles: ["staff"], escalation_role: "principal", route_label: "Lab staff audit · principal digest if unresolved", status: "submitted", assigned_to: null, acknowledged_by: null, acknowledged_at: null, endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null }),
    base({ id: "fixture-desk-request-culture", reference: "REQ-CONTROL-001", channel: "request", category: "culture", priority: "routine", title: "Pure culture for research practical", detail: "Requesting an approved E. coli culture allocation for the undergraduate inoculation exercise, Batch B.", location: "Culture preparation room", related_item_id: "it-35", related_item_name: ecoli.name, requested_qty: 1, unit: ecoli.unit, needed_by: null, requester: "Aarav Sharma", requester_role: "student", recipient_roles: ["teacher", "staff"], escalation_role: null, route_label: "Teacher endorsement → lab staff fulfilment", status: "submitted", assigned_to: null, acknowledged_by: null, acknowledged_at: null, endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null }),
    base({ id: "fixture-desk-report-microscope", reference: "RPT-CONTROL-002", channel: "report", category: "maintenance", priority: "priority", title: "Microscope lamp flickers during viewing", detail: "Lamp output flickered twice during the practical. Instrument was labelled for inspection; no booking was cancelled automatically.", location: "Microscopy bench 2", related_item_id: "it-24", related_item_name: microscope.name, requested_qty: null, unit: microscope.unit, needed_by: null, requester: "Dr. Sameer Kulkarni", requester_role: "teacher", recipient_roles: ["staff", "principal"], escalation_role: "principal", route_label: "Lab staff audit · principal oversight", status: "in-progress", assigned_to: "Ms. Rupali Patil", acknowledged_by: "Ms. Rupali Patil", acknowledged_at: at, endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null }),
    base({ id: "fixture-desk-request-broth", reference: "REQ-CONTROL-002", channel: "request", category: "consumable-top-up", priority: "routine", title: "Nutrient broth preparation for Batch B", detail: "Prepare 500 mL nutrient broth for the scheduled dilution practical. This is a requirement slip, not a completed issue.", location: "Media preparation area", related_item_id: "it-15", related_item_name: broth.name, requested_qty: 500, unit: "mL", needed_by: null, requester: "Dr. Sameer Kulkarni", requester_role: "teacher", recipient_roles: ["staff"], escalation_role: null, route_label: "Lab staff fulfilment", status: "submitted", assigned_to: null, acknowledged_by: null, acknowledged_at: null, endorsed_by: null, endorsed_at: null, outcome_note: "", completed_by: null, completed_at: null }),
  ];
  const audit: ServiceDeskAudit[] = tickets.filter((row) => row.status !== "submitted").map((record, index) => ({
    id: `fixture-desk-audit-${index + 1}`, ticket_id: record.id, at, actor: record.assigned_to ?? "Demo workflow", role: "staff", action: record.status === "in-progress" ? "Physical review started" : "Operational entry created", detail: `${record.reference}: illustrative fixture only.`,
  }));
  return { version: 1, tickets, audit };
}

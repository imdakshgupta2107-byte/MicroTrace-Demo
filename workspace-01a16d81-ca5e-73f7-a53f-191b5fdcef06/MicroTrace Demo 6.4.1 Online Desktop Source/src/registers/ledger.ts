import type { Chemical, Container } from "@/lib/types";
import type { BlindCount, ControlActor, ControlAudit, GoodsReceipt, Handover, Investigation, RegisterIndent, RegisterStore, SessionClosure } from "./types";

export type DemoRoot = Record<string, unknown> & { chemicals?: Chemical[]; containers?: Container[]; audit_log?: Record<string, unknown>[] };
const EPS = 0.0001;
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;
const now = () => new Date().toISOString();
const dateId = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const compact = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${compact()}`;
const noNewline = (value: string, max: number) => value.trim().replace(/[\r\n]+/g, " ").slice(0, max);
function hash(input: string): string { let h = 2166136261; for (let index = 0; index < input.length; index++) { h ^= input.charCodeAt(index); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); }

export function emptyRegisters(): RegisterStore { return { version: 1, indents: [], receipts: [], handovers: [], closures: [], counts: [], investigations: [], control_audit: [] }; }
const rows = <T>(root: DemoRoot, key: string): T[] => Array.isArray(root[key]) ? root[key] as T[] : [];
export function getRegisters(root: DemoRoot): RegisterStore {
  return { version: 1,
    indents: rows<RegisterIndent>(root, "register_indents"), receipts: rows<GoodsReceipt>(root, "register_receipts"),
    handovers: rows<Handover>(root, "register_handovers"), closures: rows<SessionClosure>(root, "register_closures"),
    counts: rows<BlindCount>(root, "register_counts"), investigations: rows<Investigation>(root, "register_investigations"),
    control_audit: rows<ControlAudit>(root, "register_control_audit"),
  };
}
export function setRegisters(root: DemoRoot, registers: RegisterStore): void {
  root.register_indents = registers.indents; root.register_receipts = registers.receipts;
  root.register_handovers = registers.handovers; root.register_closures = registers.closures;
  root.register_counts = registers.counts; root.register_investigations = registers.investigations;
  root.register_control_audit = registers.control_audit;
}
function clone(root: DemoRoot): DemoRoot { return JSON.parse(JSON.stringify(root)) as DemoRoot; }
function checkActor(actor: ControlActor): void { if (!actor?.name?.trim() || !actor.role) throw new Error("Choose a demo role and profile before recording a control action."); }
function requireManager(actor: ControlActor): void { checkActor(actor); if (actor.role !== "staff" && actor.role !== "principal") throw new Error("Only lab staff or principal can perform this control action in the demo."); }
function requirePrincipal(actor: ControlActor): void { checkActor(actor); if (actor.role !== "principal") throw new Error("Only the principal role can post an authorised reconciliation adjustment."); }
function item(root: DemoRoot, itemId: string): Chemical { const found = (root.chemicals ?? []).find((row) => row.id === itemId); if (!found) throw new Error("The selected inventory item is unavailable."); return found; }
function usableContainers(root: DemoRoot, itemId: string): Container[] {
  const today = new Date().toISOString().slice(0, 10);
  return (root.containers ?? []).filter((row) => row.chemical_id === itemId && row.state !== "disposed" && row.state !== "depleted" && num(row.qty) > 0 && (!row.expiry || row.expiry >= today) && (!row.use_by || row.use_by >= today)).sort((a, b) => `${a.expiry ?? "9999"}|${a.id}`.localeCompare(`${b.expiry ?? "9999"}|${b.id}`));
}
export function usableStock(root: DemoRoot, itemId: string): number { return round(usableContainers(root, itemId).reduce((sum, row) => sum + num(row.qty), 0)); }
function fullStock(root: DemoRoot, itemId: string): number { return round((root.containers ?? []).filter((row) => row.chemical_id === itemId && row.state !== "disposed").reduce((sum, row) => sum + num(row.qty), 0)); }
function audit(root: DemoRoot, actor: ControlActor, action: string, entity: string, entityId: string, detail: string): void {
  const registers = getRegisters(root); const previous = registers.control_audit[0]?.record_hash ?? "GENESIS"; const at = now();
  const entry: ControlAudit = { id: id("ctl"), at, actor: noNewline(actor.name, 120), role: actor.role, action: noNewline(action, 140), entity, entity_id: entityId, detail: noNewline(detail, 420), previous_hash: previous, record_hash: hash([previous, at, actor.name, actor.role, action, entity, entityId, detail].join("|")) };
  registers.control_audit.unshift(entry); setRegisters(root, registers);
  const log = Array.isArray(root.audit_log) ? root.audit_log : []; const largest = log.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
  log.unshift({ id: Math.max(Date.now(), largest + 1), actor: entry.actor, action: `${entry.action} [control]`, entity, entity_id: entityId, created_at: at }); root.audit_log = log;
}
function nextNumber(root: DemoRoot, prefix: string, rows: { number: string }[]): string { return `${prefix}-${dateId()}-${String(rows.length + 1).padStart(3, "0")}`; }
function saveAudit(root: DemoRoot, actor: ControlActor, action: string, entity: string, entityId: string, detail: string): DemoRoot { audit(root, actor, action, entity, entityId, detail); return root; }
export function mutateRoot(root: DemoRoot, fn: (next: DemoRoot) => void): DemoRoot { const next = clone(root); fn(next); return next; }

export function createIndent(root: DemoRoot, actor: ControlActor, input: { kind: "issue" | "purchase"; item_id: string; qty: number; purpose: string; department: string }): DemoRoot {
  return mutateRoot(root, (next) => { checkActor(actor); const chemical = item(next, input.item_id); const qty = round(num(input.qty)); if (!(qty > 0)) throw new Error("Requested quantity must be positive."); const purpose = noNewline(input.purpose, 280); if (purpose.length < 5) throw new Error("Add a meaningful purpose for this indent.");
    const registers = getRegisters(next); const record: RegisterIndent = { id: id("ind"), number: nextNumber(next, input.kind === "purchase" ? "PI" : "II", registers.indents), kind: input.kind, item_id: chemical.id, item_name: chemical.name, unit: chemical.unit, requested_qty: qty, approved_qty: null, fulfilled_qty: 0, purpose, requester: noNewline(actor.name, 120), requester_role: actor.role, department: noNewline(input.department || "Microbiology laboratory", 120), status: "pending", requested_at: now(), approved_by: null, approved_at: null, decision_note: "", source: "demo-entry" };
    registers.indents.unshift(record); setRegisters(next, registers); saveAudit(next, actor, `${input.kind === "purchase" ? "Purchase" : "Issue"} indent submitted`, "indent", record.id, `${record.number}: ${qty} ${chemical.unit} ${chemical.name}`);
  });
}
export function decideIndent(root: DemoRoot, actor: ControlActor, indentId: string, decision: "approved" | "rejected", approvedQty: number, note: string): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const registers = getRegisters(next); const record = registers.indents.find((row) => row.id === indentId); if (!record || record.status !== "pending") throw new Error("Only a pending indent can be decided."); if (record.requester === actor.name) throw new Error("The requester cannot approve their own indent."); const qty = round(num(approvedQty)); if (decision === "approved" && (!(qty > 0) || qty > record.requested_qty + EPS)) throw new Error("Approved quantity must be positive and cannot exceed the requested quantity."); const cleanNote = noNewline(note, 280); if (decision === "rejected" && cleanNote.length < 4) throw new Error("Record a short reason when rejecting an indent."); record.status = decision; record.approved_qty = decision === "approved" ? qty : null; record.approved_by = actor.name; record.approved_at = now(); record.decision_note = cleanNote; setRegisters(next, registers); saveAudit(next, actor, `Indent ${decision}`, "indent", record.id, `${record.number}: ${decision === "approved" ? `${qty} ${record.unit}` : cleanNote}`);
  });
}
export function createReceipt(root: DemoRoot, actor: ControlActor, input: { indent_id: string | null; item_id: string; invoice_no: string; supplier: string; batch: string; expiry: string; delivered_qty: number; accepted_qty: number; method: GoodsReceipt["verification_method"]; note: string }): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const chemical = item(next, input.item_id); const delivered = round(num(input.delivered_qty)), accepted = round(num(input.accepted_qty)); if (!(delivered > 0) || accepted < 0 || accepted - delivered > EPS) throw new Error("Accepted quantity cannot exceed delivered quantity."); const invoice = noNewline(input.invoice_no, 100), batch = noNewline(input.batch, 100); if (!invoice || !batch) throw new Error("Invoice/challan and batch reference are required."); if (input.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiry)) throw new Error("Use a valid expiry date."); const registers = getRegisters(next);
    const expected = input.indent_id ? registers.indents.find((row) => row.id === input.indent_id)?.approved_qty ?? delivered : delivered;
    const record: GoodsReceipt = { id: id("grn"), number: nextNumber(next, "GRN", registers.receipts), indent_id: input.indent_id, item_id: chemical.id, item_name: chemical.name, unit: chemical.unit, invoice_no: invoice, supplier: noNewline(input.supplier, 120) || chemical.supplier || "Supplier not recorded", batch, expiry: input.expiry || null, expected_qty: expected, delivered_qty: delivered, accepted_qty: accepted, rejected_qty: round(delivered - accepted), received_by: actor.name, received_at: now(), verified_by: null, verified_at: null, verification_method: input.method, condition_note: noNewline(input.note, 280), status: accepted < delivered - EPS ? "short_received" : "awaiting_verification", inventory_applied_at: null };
    registers.receipts.unshift(record); setRegisters(next, registers); saveAudit(next, actor, "Goods receipt recorded", "receipt", record.id, `${record.number}: delivery ${delivered} ${chemical.unit}; awaiting independent verification`);
  });
}
export function verifyReceipt(root: DemoRoot, actor: ControlActor, receiptId: string, accept: boolean, note: string): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const registers = getRegisters(next); const receipt = registers.receipts.find((row) => row.id === receiptId); if (!receipt || receipt.verified_by) throw new Error("This receipt has already been independently verified."); if (receipt.received_by === actor.name) throw new Error("The receiver cannot independently verify the same receipt."); const clean = noNewline(note, 280); if (!accept && clean.length < 4) throw new Error("Record a reason if the receipt is rejected."); receipt.verified_by = actor.name; receipt.verified_at = now(); receipt.condition_note = [receipt.condition_note, clean].filter(Boolean).join(" · ");
    if (!accept || receipt.accepted_qty <= 0) { receipt.status = "rejected"; setRegisters(next, registers); saveAudit(next, actor, "Goods receipt rejected", "receipt", receipt.id, `${receipt.number}: ${clean || "no accepted stock"}`); return; }
    if (receipt.inventory_applied_at) throw new Error("Accepted stock was already applied."); const containers = (next.containers ?? []) as Container[];
    containers.unshift({ id: `grn-container-${receipt.id}`, chemical_id: receipt.item_id, label: `${receipt.item_name} · ${receipt.number} · Batch ${receipt.batch}`, barcode: null, qty: receipt.accepted_qty, unit_size: receipt.accepted_qty, location: "Verified receipt area", expiry: receipt.expiry, state: "sealed", opened_at: null, use_by: null, created_at: now() }); next.containers = containers;
    receipt.status = receipt.rejected_qty > EPS ? "short_received" : "verified"; receipt.inventory_applied_at = now(); const indent = receipt.indent_id ? registers.indents.find((row) => row.id === receipt.indent_id) : undefined; if (indent) { indent.fulfilled_qty = round(indent.fulfilled_qty + receipt.accepted_qty); if ((indent.approved_qty ?? 0) <= indent.fulfilled_qty + EPS) indent.status = "fulfilled"; }
    setRegisters(next, registers); saveAudit(next, actor, "Goods receipt independently verified", "receipt", receipt.id, `${receipt.number}: ${receipt.accepted_qty} ${receipt.unit} added to verified inventory`);
  });
}
export function prepareHandover(root: DemoRoot, actor: ControlActor, indentId: string, qty: number): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const registers = getRegisters(next); const indent = registers.indents.find((row) => row.id === indentId); if (!indent || indent.kind !== "issue" || indent.status !== "approved") throw new Error("Choose an approved issue indent."); if (indent.requester === actor.name) throw new Error("The requester cannot issue their own material."); const amount = round(num(qty)); const already = registers.handovers.filter((row) => row.indent_id === indentId && row.status !== "cancelled").reduce((sum, row) => sum + row.qty, 0); if (!(amount > 0) || amount + already > (indent.approved_qty ?? 0) + EPS) throw new Error("The handover quantity exceeds the remaining approved quantity."); if (amount > usableStock(next, indent.item_id) + EPS) throw new Error("Insufficient usable stock. No handover was created."); const handover: Handover = { id: id("handover"), code: `MT-${dateId()}-${compact()}`, indent_id: indent.id, item_id: indent.item_id, item_name: indent.item_name, unit: indent.unit, qty: amount, issuer: actor.name, receiver: indent.requester, purpose: indent.purpose, prepared_at: now(), acknowledged_by: null, acknowledged_at: null, status: "prepared", source_container_ids: [], closure_id: null };
    registers.handovers.unshift(handover); setRegisters(next, registers); saveAudit(next, actor, "Handover prepared", "handover", handover.id, `${handover.code}: ${amount} ${handover.unit} for ${handover.receiver}`);
  });
}
export function acknowledgeHandover(root: DemoRoot, actor: ControlActor, handoverId: string): DemoRoot {
  return mutateRoot(root, (next) => { checkActor(actor); const registers = getRegisters(next); const handover = registers.handovers.find((row) => row.id === handoverId); if (!handover || handover.status !== "prepared") throw new Error("This handover is not awaiting acknowledgement."); if (handover.issuer === actor.name) throw new Error("The issuer cannot acknowledge their own handover."); if (handover.receiver !== actor.name) throw new Error("Switch to the intended receiver profile to acknowledge this handover in the demo."); const available = usableContainers(next, handover.item_id); if (available.reduce((sum, row) => sum + num(row.qty), 0) + EPS < handover.qty) throw new Error("Usable stock changed before acknowledgement. Prepare a revised handover."); let remaining = handover.qty; const ids: string[] = [];
    for (const container of available) { if (remaining <= EPS) break; const take = Math.min(remaining, num(container.qty)); container.qty = round(num(container.qty) - take); if (container.qty <= EPS) { container.qty = 0; container.state = "depleted"; } ids.push(container.id); remaining = round(remaining - take); }
    handover.source_container_ids = ids; handover.acknowledged_by = actor.name; handover.acknowledged_at = now(); handover.status = "acknowledged"; const indent = registers.indents.find((row) => row.id === handover.indent_id); if (indent) indent.fulfilled_qty = round(indent.fulfilled_qty + handover.qty); setRegisters(next, registers); saveAudit(next, actor, "Handover acknowledged; custody opened", "handover", handover.id, `${handover.code}: ${handover.qty} ${handover.unit} moved from verified store to receiver custody`);
  });
}
export function submitClosure(root: DemoRoot, actor: ControlActor, handoverId: string, input: { used: number; returned: number; waste: number; remaining: number; safeReturn: boolean }): DemoRoot {
  return mutateRoot(root, (next) => { checkActor(actor); const registers = getRegisters(next); const handover = registers.handovers.find((row) => row.id === handoverId); if (!handover || handover.status !== "acknowledged" || handover.closure_id) throw new Error("Choose an acknowledged handover without an existing closure."); if (handover.receiver !== actor.name) throw new Error("Only the recorded receiver can submit this session closure in the demo."); const used = round(num(input.used)), returned = round(num(input.returned)), waste = round(num(input.waste)), remaining = round(num(input.remaining)); if ([used, returned, waste, remaining].some((value) => value < 0)) throw new Error("Closure quantities cannot be negative."); if (returned > 0 && !input.safeReturn) throw new Error("Confirm that returned material is unused, uncontaminated and accepted under the lab SOP."); const accounted = round(used + returned + waste + remaining); if (accounted - handover.qty > EPS) throw new Error("Closure quantities cannot exceed the issued quantity."); const unexplained = round(Math.max(0, handover.qty - accounted)); const closure: SessionClosure = { id: id("close"), handover_id: handover.id, item_id: handover.item_id, item_name: handover.item_name, unit: handover.unit, issued_qty: handover.qty, used_qty: used, returned_qty: returned, waste_qty: waste, remaining_qty: remaining, unexplained_qty: unexplained, return_inspected_safe: input.safeReturn, submitted_by: actor.name, submitted_at: now(), reviewed_by: null, reviewed_at: null, review_note: "", status: unexplained > EPS ? "investigation_required" : "submitted" };
    registers.closures.unshift(closure); handover.closure_id = closure.id; setRegisters(next, registers); saveAudit(next, actor, "Session closure submitted", "closure", closure.id, `${handover.code}: used ${used}, returned ${returned}, waste ${waste}, remaining ${remaining}, unexplained ${unexplained} ${handover.unit}`);
  });
}
export function reviewClosure(root: DemoRoot, actor: ControlActor, closureId: string, note: string): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const registers = getRegisters(next); const closure = registers.closures.find((row) => row.id === closureId); if (!closure || closure.reviewed_by) throw new Error("This closure has already been reviewed."); if (closure.submitted_by === actor.name) throw new Error("The submitter cannot review their own closure."); const handover = registers.handovers.find((row) => row.id === closure.handover_id); if (!handover) throw new Error("The related handover is missing."); if (closure.returned_qty > 0) { const targetId = handover.source_container_ids[0]; const target = ((next.containers ?? []) as Container[]).find((row) => row.id === targetId); if (!target) throw new Error("The original custody container is unavailable for an approved return."); target.qty = round(num(target.qty) + closure.returned_qty); target.state = "opened"; }
    closure.reviewed_by = actor.name; closure.reviewed_at = now(); closure.review_note = noNewline(note, 280); closure.status = closure.unexplained_qty > EPS ? "investigation_required" : "reviewed"; handover.status = "closed"; setRegisters(next, registers); saveAudit(next, actor, "Session closure reviewed", "closure", closure.id, closure.unexplained_qty > EPS ? "Unexplained balance requires a separate reconciliation count." : "Approved return, usage and waste closure recorded.");
  });
}
export function startBlindCount(root: DemoRoot, actor: ControlActor, itemId: string, location: string): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const chemical = item(next, itemId); const registers = getRegisters(next); if (registers.counts.some((row) => row.item_id === itemId && ["open", "submitted", "recount_required", "investigating"].includes(row.status))) throw new Error("There is already an open reconciliation count for this item."); const count: BlindCount = { id: id("count"), number: nextNumber(next, "CNT", registers.counts), item_id: chemical.id, item_name: chemical.name, unit: chemical.unit, location: noNewline(location || "Verified store", 120), expected_qty: fullStock(next, chemical.id), observed_qty: null, variance_qty: null, counter: actor.name, started_at: now(), submitted_at: null, reviewer: null, recount_qty: null, final_qty: null, status: "open", investigation_id: null };
    registers.counts.unshift(count); setRegisters(next, registers); saveAudit(next, actor, "Blind physical count opened", "count", count.id, `${count.number}: expected balance intentionally hidden from counter view`);
  });
}
export function submitBlindCount(root: DemoRoot, actor: ControlActor, countId: string, observed: number): DemoRoot {
  return mutateRoot(root, (next) => { checkActor(actor); const registers = getRegisters(next); const count = registers.counts.find((row) => row.id === countId); if (!count || count.status !== "open") throw new Error("This count is not open for entry."); if (count.counter !== actor.name) throw new Error("Switch to the nominated counter profile before submitting the blind count."); const value = round(num(observed)); if (value < 0) throw new Error("Observed quantity cannot be negative."); count.observed_qty = value; count.variance_qty = round(value - count.expected_qty); count.submitted_at = now(); count.status = Math.abs(count.variance_qty) <= EPS ? "reconciled" : "recount_required"; setRegisters(next, registers); saveAudit(next, actor, "Blind physical count submitted", "count", count.id, `${count.number}: observation locked; expected balance now reveals for reconciliation`);
  });
}
export function recountAndInvestigate(root: DemoRoot, actor: ControlActor, countId: string, recount: number, note: string): DemoRoot {
  return mutateRoot(root, (next) => { requireManager(actor); const registers = getRegisters(next); const count = registers.counts.find((row) => row.id === countId); if (!count || count.status !== "recount_required") throw new Error("This count does not require an independent recount."); if (count.counter === actor.name) throw new Error("The original counter cannot independently recount this item."); const value = round(num(recount)); if (value < 0) throw new Error("Recount quantity cannot be negative."); count.reviewer = actor.name; count.recount_qty = value; count.final_qty = value; const variance = round(value - count.expected_qty); if (Math.abs(variance) <= EPS) { count.status = "reconciled"; setRegisters(next, registers); saveAudit(next, actor, "Independent recount reconciled", "count", count.id, `${count.number}: recount matched expected quantity`); return; }
    const investigation: Investigation = { id: id("inv"), number: nextNumber(next, "INV", registers.investigations), count_id: count.id, item_id: count.item_id, item_name: count.item_name, unit: count.unit, expected_qty: count.expected_qty, observed_qty: value, variance_qty: variance, opened_by: actor.name, opened_at: now(), status: "open", cause: null, evidence_note: noNewline(note, 280), resolution_note: "", reviewed_by: null, resolved_at: null, adjustment_qty: null };
    registers.investigations.unshift(investigation); count.status = "investigating"; count.investigation_id = investigation.id; setRegisters(next, registers); saveAudit(next, actor, "Independent recount opened investigation", "investigation", investigation.id, `${investigation.number}: variance ${variance} ${investigation.unit}; no automatic stock adjustment`);
  });
}
export function resolveInvestigation(root: DemoRoot, actor: ControlActor, investigationId: string, input: { cause: Investigation["cause"]; note: string; postAdjustment: boolean }): DemoRoot {
  return mutateRoot(root, (next) => {
    requirePrincipal(actor);
    const registers = getRegisters(next);
    const investigation = registers.investigations.find((row) => row.id === investigationId);
    if (!investigation || investigation.status === "resolved" || investigation.status === "adjusted") throw new Error("This investigation is already resolved.");
    if (investigation.opened_by === actor.name) throw new Error("The person who opened the investigation cannot close it as principal in this demo.");
    const note = noNewline(input.note, 420);
    if (!input.cause || note.length < 5) throw new Error("Record a cause and a meaningful resolution note.");
    investigation.cause = input.cause; investigation.resolution_note = note; investigation.reviewed_by = actor.name; investigation.resolved_at = now();
    let action = "Investigation resolved without stock adjustment";
    let detail = `${investigation.number}: ${note}`;
    if (input.postAdjustment) {
      const containers = ((next.containers ?? []) as Container[]).filter((row) => row.chemical_id === investigation.item_id && row.state !== "disposed").sort((a, b) => a.id.localeCompare(b.id));
      if (!containers.length) throw new Error("No inventory container is available for an authorised adjustment.");
      const current = fullStock(next, investigation.item_id); const delta = round(investigation.observed_qty - current); const target = containers[0];
      if (num(target.qty) + delta < -EPS) throw new Error("Cannot post an adjustment below zero. Review container records first.");
      target.qty = round(Math.max(0, num(target.qty) + delta)); target.state = target.qty <= EPS ? "depleted" : "opened";
      investigation.adjustment_qty = delta; investigation.status = "adjusted";
      action = "Authorised reconciliation adjustment posted";
      detail = `${investigation.number}: ${delta >= 0 ? "+" : ""}${delta} ${investigation.unit}; original count and reason retained`;
    } else investigation.status = "resolved";
    const count = registers.counts.find((row) => row.id === investigation.count_id); if (count) count.status = "reconciled";
    // Persist record state before appending its audit record, so the audit append is not overwritten.
    setRegisters(next, registers);
    saveAudit(next, actor, action, "investigation", investigation.id, detail);
  });
}
export function controlSeed(nowDate: Date, itemName: (id: string) => { name: string; unit: string }): RegisterStore {
  const at = nowDate.toISOString(); const mac = itemName("it-11"), nutrient = itemName("it-10"), tubes = itemName("it-17");
  const store = emptyRegisters();
  const purchase: RegisterIndent = { id: "fixture-pi-mac", number: "PI-CONTROL-001", kind: "purchase", item_id: "it-11", item_name: mac.name, unit: mac.unit, requested_qty: 250, approved_qty: 250, fulfilled_qty: 0, purpose: "Illustrative verified-receipt workflow; does not claim a historic delivery.", requester: "Dr. Sameer Kulkarni", requester_role: "teacher", department: "Department of Microbiology", status: "approved", requested_at: at, approved_by: "Dr. Anjali Deshmukh", approved_at: at, decision_note: "Control fixture", source: "restored-control-fixture" };
  const issue: RegisterIndent = { id: "fixture-ii-nutrient", number: "II-CONTROL-001", kind: "issue", item_id: "it-10", item_name: nutrient.name, unit: nutrient.unit, requested_qty: 50, approved_qty: 50, fulfilled_qty: 0, purpose: "Illustrative class practical custody workflow; does not alter restored history until acknowledged.", requester: "Aarav Sharma", requester_role: "student", department: "T.Y. B.Sc. · Batch B", status: "approved", requested_at: at, approved_by: "Ms. Rupali Patil", approved_at: at, decision_note: "Control fixture", source: "restored-control-fixture" };
  const count: BlindCount = { id: "fixture-count-tubes", number: "CNT-CONTROL-001", item_id: "it-17", item_name: tubes.name, unit: tubes.unit, location: "Glassware cabinet", expected_qty: 45, observed_qty: null, variance_qty: null, counter: "Ms. Rupali Patil", started_at: at, submitted_at: null, reviewer: null, recount_qty: null, final_qty: null, status: "open", investigation_id: null };
  store.indents=[issue,purchase];store.counts=[count];return store;
}

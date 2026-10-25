import type { Role } from "@/lib/types";

export type IndentKind = "issue" | "purchase";
export type IndentStatus = "draft" | "pending" | "approved" | "rejected" | "fulfilled" | "cancelled";
export type ReceiptStatus = "awaiting_verification" | "verified" | "rejected" | "short_received";
export type HandoverStatus = "prepared" | "acknowledged" | "closed" | "cancelled";
export type CountStatus = "open" | "submitted" | "recount_required" | "reconciled" | "investigating";
export type InvestigationStatus = "open" | "reviewing" | "resolved" | "adjusted";

export interface ControlActor { name: string; role: Role; }
export interface RegisterIndent {
  id: string; number: string; kind: IndentKind; item_id: string; item_name: string; unit: string;
  requested_qty: number; approved_qty: number | null; fulfilled_qty: number;
  purpose: string; requester: string; requester_role: Role; department: string;
  status: IndentStatus; requested_at: string; approved_by: string | null; approved_at: string | null;
  decision_note: string; source: "restored-control-fixture" | "demo-entry";
}
export interface GoodsReceipt {
  id: string; number: string; indent_id: string | null; item_id: string; item_name: string; unit: string;
  invoice_no: string; supplier: string; batch: string; expiry: string | null;
  expected_qty: number; delivered_qty: number; accepted_qty: number; rejected_qty: number;
  received_by: string; received_at: string; verified_by: string | null; verified_at: string | null;
  verification_method: "pack-count" | "label-check" | "calibrated-measurement";
  condition_note: string; status: ReceiptStatus; inventory_applied_at: string | null;
}
export interface Handover {
  id: string; code: string; indent_id: string; item_id: string; item_name: string; unit: string; qty: number;
  issuer: string; receiver: string; purpose: string; prepared_at: string; acknowledged_by: string | null;
  acknowledged_at: string | null; status: HandoverStatus; source_container_ids: string[]; closure_id: string | null;
}
export interface SessionClosure {
  id: string; handover_id: string; item_id: string; item_name: string; unit: string; issued_qty: number;
  used_qty: number; returned_qty: number; waste_qty: number; remaining_qty: number; unexplained_qty: number;
  return_inspected_safe: boolean; submitted_by: string; submitted_at: string; reviewed_by: string | null;
  reviewed_at: string | null; review_note: string; status: "submitted" | "reviewed" | "investigation_required";
}
export interface BlindCount {
  id: string; number: string; item_id: string; item_name: string; unit: string; location: string;
  expected_qty: number; observed_qty: number | null; variance_qty: number | null; counter: string; started_at: string;
  submitted_at: string | null; reviewer: string | null; recount_qty: number | null; final_qty: number | null;
  status: CountStatus; investigation_id: string | null;
}
export interface Investigation {
  id: string; number: string; count_id: string; item_id: string; item_name: string; unit: string;
  expected_qty: number; observed_qty: number; variance_qty: number; opened_by: string; opened_at: string;
  status: InvestigationStatus; cause: "entry-error" | "spill-waste" | "supplier-shortage" | "measurement-review" | "unexplained" | "other" | null;
  evidence_note: string; resolution_note: string; reviewed_by: string | null; resolved_at: string | null;
  adjustment_qty: number | null;
}
export interface ControlAudit {
  id: string; at: string; actor: string; role: Role; action: string; entity: string; entity_id: string;
  detail: string; previous_hash: string; record_hash: string;
}
export interface RegisterStore {
  version: 1; indents: RegisterIndent[]; receipts: GoodsReceipt[]; handovers: Handover[];
  closures: SessionClosure[]; counts: BlindCount[]; investigations: Investigation[]; control_audit: ControlAudit[];
}

import type { Role } from "@/lib/types";

/**
 * Local operational workflow records for the populated Demo. These are not
 * stock movements: a report creates a review flag and a requirement creates a
 * routing slip. Any stock adjustment still has to use the controlled register.
 */
export type DeskChannel = "report" | "request";
export type ReportKind = "evaporation" | "contamination" | "missing-item" | "misplacement" | "maintenance" | "quality" | "other";
export type RequirementKind = "stock" | "culture" | "consumable-top-up" | "procurement" | "other";
export type DeskStatus = "submitted" | "acknowledged" | "endorsed" | "in-progress" | "fulfilled" | "resolved" | "declined" | "withdrawn";
export type DeskPriority = "routine" | "priority";

export interface DeskActor {
  name: string;
  role: Role;
}

export interface ServiceTicket {
  id: string;
  reference: string;
  channel: DeskChannel;
  /** ReportKind for reports and RequirementKind for requirements. */
  category: ReportKind | RequirementKind;
  priority: DeskPriority;
  title: string;
  detail: string;
  location: string;
  related_item_id: string | null;
  related_item_name: string | null;
  requested_qty: number | null;
  unit: string | null;
  needed_by: string | null;
  requester: string;
  requester_role: Role;
  recipient_roles: Role[];
  escalation_role: "principal" | null;
  route_label: string;
  status: DeskStatus;
  assigned_to: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  endorsed_by: string | null;
  endorsed_at: string | null;
  outcome_note: string;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  source: "illustrative-fixture" | "demo-entry";
}

export interface ServiceDeskAudit {
  id: string;
  ticket_id: string;
  at: string;
  actor: string;
  role: Role;
  action: string;
  detail: string;
}

export interface ServiceDeskStore {
  version: 1;
  tickets: ServiceTicket[];
  audit: ServiceDeskAudit[];
}

export const OPEN_DESK_STATUSES: DeskStatus[] = ["submitted", "acknowledged", "endorsed", "in-progress"];
export const TERMINAL_DESK_STATUSES: DeskStatus[] = ["fulfilled", "resolved", "declined", "withdrawn"];

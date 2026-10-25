import type { DeskStatus, ReportKind, RequirementKind } from "./types";

export const REPORT_KINDS: { value: ReportKind; label: string; hint: string }[] = [
  { value: "evaporation", label: "Evaporation / volume loss", hint: "Observed level is lower than expected; no write-off is posted yet." },
  { value: "contamination", label: "Contamination / degradation", hint: "A material, plate or culture may be unsuitable." },
  { value: "missing-item", label: "Missing item", hint: "An item cannot be found at its recorded location." },
  { value: "misplacement", label: "Misplacement", hint: "An item was found in the wrong station or bay." },
  { value: "maintenance", label: "Maintenance / equipment", hint: "Instrument, fixture or facility issue needs a physical check." },
  { value: "quality", label: "Quality concern", hint: "A label, condition, seal or preparation concern." },
  { value: "other", label: "Other operational issue", hint: "Use a specific title and location." },
];

export const REQUIREMENT_KINDS: { value: RequirementKind; label: string; hint: string }[] = [
  { value: "stock", label: "Material from current stock", hint: "A requirement slip; issue it separately through the stock workflow." },
  { value: "culture", label: "Microbial culture / strain", hint: "Request an approved culture allocation or preparation." },
  { value: "consumable-top-up", label: "Prepared consumable / top-up", hint: "Examples: nutrient broth, plates, gloves or a prepared solution." },
  { value: "procurement", label: "Procurement / research requirement", hint: "For unavailable, specialised or planned academic requirements." },
  { value: "other", label: "Other academic requirement", hint: "Describe what is required and why." },
];

export const statusTone = (status: DeskStatus): "amber" | "blue" | "violet" | "green" | "red" | "gray" => {
  if (status === "submitted") return "amber";
  if (status === "acknowledged" || status === "in-progress") return "blue";
  if (status === "endorsed") return "violet";
  if (status === "fulfilled" || status === "resolved") return "green";
  if (status === "declined") return "red";
  return "gray";
};

export const channelLabel = (channel: "report" | "request") => channel === "report" ? "Issue report" : "Requirement slip";
export const kindLabel = (kind: string) => [...REPORT_KINDS, ...REQUIREMENT_KINDS].find((entry) => entry.value === kind)?.label ?? kind.replace(/-/g, " ");

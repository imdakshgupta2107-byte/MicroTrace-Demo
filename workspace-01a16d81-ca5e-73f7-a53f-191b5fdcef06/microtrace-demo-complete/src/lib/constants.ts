import type { Category, IncidentKind, StorageGroup } from "./types";

export const CATEGORIES: Category[] = [
  "Chemical", "Culture Media", "Glassware", "Instrument", "Consumable", "Culture",
];

export const STORAGE_GROUPS: { id: StorageGroup; label: string }[] = [
  { id: "general", label: "General" }, { id: "acid", label: "Acid" },
  { id: "base", label: "Base" }, { id: "oxidizer", label: "Oxidizer" },
  { id: "flammable", label: "Flammable" }, { id: "toxic", label: "Toxic" },
  { id: "biohazard", label: "Biohazard" },
];

export const GHS_CODES: Record<string, { label: string; sym: string }> = {
  GHS01: { label: "Explosive",            sym: "✱" },
  GHS02: { label: "Flammable",            sym: "🔥" },
  GHS03: { label: "Oxidizing",            sym: "◎" },
  GHS04: { label: "Compressed gas",       sym: "🛢" },
  GHS05: { label: "Corrosive",            sym: "⚗" },
  GHS06: { label: "Acute toxicity",       sym: "☠" },
  GHS07: { label: "Harmful / irritant",   sym: "⚠" },
  GHS08: { label: "Health hazard / BSL",  sym: "✚" },
  GHS09: { label: "Environmental",        sym: "🌿" },
};

export const PPE_ITEMS = ["Nitrile gloves", "Lab coat", "Safety goggles", "Face shield", "Fume hood", "Respirator"];

export const DEPARTMENTS = [
  "Microbiology", "Botany", "Zoology", "Chemistry", "Biotechnology",
];

export const INCIDENT_KINDS: { id: IncidentKind; label: string }[] = [
  { id: "spill", label: "Chemical spill" }, { id: "eye", label: "Eye exposure" },
  { id: "skin", label: "Skin contact" }, { id: "fire", label: "Fire" },
  { id: "culture", label: "Culture exposure" }, { id: "gas", label: "Gas / inhalation" },
  { id: "other", label: "Other" },
];

export const BK_SLOTS = ["09:00–11:00", "11:00–13:00", "13:30–15:30", "15:30–17:30"];

export const FIRST_AID: { kind: IncidentKind; title: string; steps: string[] }[] = [
  { kind: "eye", title: "Chemical in eye", steps: ["Rinse at the eyewash for 15 minutes — hold the lids open.", "Remove contact lenses.", "Do not rub; get to a doctor carrying the chemical's name."] },
  { kind: "skin", title: "Chemical on skin", steps: ["Remove contaminated clothing.", "Flood with water for 15 minutes (phenol: 70% ethanol pads).", "Report to the lab in-charge; burns need medical help."] },
  { kind: "fire", title: "Fire", steps: ["Sound the alarm & evacuate calmly.", "Small bench fire: fire blanket / dry-powder extinguisher.", "Solvent fires: never water. Cut power if safe."] },
  { kind: "spill", title: "Spill", steps: ["Alert people nearby; contain with absorbent.", "Gloves + goggles from the spill kit.", "Neutralise acids with sodium bicarbonate; log the disposal with staff."] },
  { kind: "culture", title: "Culture exposure", steps: ["Cover with 1% hypochlorite for 20 minutes.", "Wash hands and any contacted skin thoroughly.", "Inform staff — BSL-2 incidents are recorded."] },
  { kind: "gas", title: "Gas / inhalation", steps: ["Move to fresh air immediately.", "If breathing is difficult — call 108.", "Keep the casualty lying down, nothing by mouth."] },
];

export const EMERGENCY_NUMBERS: [string, string][] = [
  ["Ambulance", "108"], ["Fire", "101"], ["Police", "112"],
  ["Poison control (AIIMS)", "1800-116-117"], ["Lab in-charge desk", "ext. 214"],
];

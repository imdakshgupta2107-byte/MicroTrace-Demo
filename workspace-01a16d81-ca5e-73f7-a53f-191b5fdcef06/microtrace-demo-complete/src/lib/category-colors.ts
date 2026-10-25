import type { ContainerType } from "@/lib/types";
export type { ContainerType } from "@/lib/types";

/**
 * Strict visual taxonomy for MicroTrace inventory. These are presentation
 * tokens, not user-editable data: an item or vessel key always resolves to the
 * same accessible color treatment everywhere in the product.
 */
export type ColorTokens = {
  key: string;
  label: string;
  hex: string;
  background: string;
  softBackground: string;
  text: string;
  border: string;
  accentBorder: string;
  dot: string;
  darkBackground: string;
  darkText: string;
};

const token = (
  key: string, label: string, hex: string,
  background: string, softBackground: string, text: string, border: string, accentBorder: string, darkBackground: string, darkText: string,
): ColorTokens => ({ key, label, hex, background, softBackground, text, border, accentBorder, dot: background, darkBackground, darkText });

export const CATEGORY_KEYS = [
  "growth_media", "acid", "base", "general_reagent",
  "solvent", "biohazard", "glassware", "instrument",
] as const;
export type CategoryColorKey = typeof CATEGORY_KEYS[number];

/** Exactly eight locked inventory bindings. Do not derive colors from a user-entered value. */
export const CATEGORY_COLOR_MAP: Record<CategoryColorKey, ColorTokens> = {
  growth_media: token("growth_media", "Media Prep/Growth Media", "#F59E0B", "bg-amber-500", "bg-amber-50", "text-amber-900", "border-amber-300", "border-l-amber-500", "dark:bg-amber-500/25", "dark:text-amber-200"),
  acid: token("acid", "Acids", "#EF4444", "bg-red-500", "bg-red-50", "text-red-900", "border-red-300", "border-l-red-500", "dark:bg-red-500/25", "dark:text-red-200"),
  base: token("base", "Bases/Alkalis", "#3B82F6", "bg-blue-500", "bg-blue-50", "text-blue-900", "border-blue-300", "border-l-blue-500", "dark:bg-blue-500/25", "dark:text-blue-200"),
  general_reagent: token("general_reagent", "General Reagents/Salts", "#10B981", "bg-emerald-500", "bg-emerald-50", "text-emerald-900", "border-emerald-300", "border-l-emerald-500", "dark:bg-emerald-500/25", "dark:text-emerald-200"),
  solvent: token("solvent", "Solvents & Flammables", "#EA580C", "bg-orange-600", "bg-orange-50", "text-orange-900", "border-orange-300", "border-l-orange-600", "dark:bg-orange-500/25", "dark:text-orange-200"),
  biohazard: token("biohazard", "Biohazards/Toxins", "#A855F7", "bg-purple-500", "bg-purple-50", "text-purple-900", "border-purple-300", "border-l-purple-500", "dark:bg-purple-500/25", "dark:text-purple-200"),
  glassware: token("glassware", "Glassware", "#06B6D4", "bg-cyan-500", "bg-cyan-50", "text-cyan-900", "border-cyan-300", "border-l-cyan-500", "dark:bg-cyan-500/25", "dark:text-cyan-200"),
  instrument: token("instrument", "Instruments & Equipment", "#475569", "bg-slate-600", "bg-slate-100", "text-slate-800", "border-slate-300", "border-l-slate-600", "dark:bg-slate-500/25", "dark:text-slate-100"),
};

const CATEGORY_ALIASES: Record<string, CategoryColorKey> = {
  "media prep": "growth_media", "growth media": "growth_media", "media prep growth media": "growth_media", "media prep/growth media": "growth_media", "culture media": "growth_media", growth_media: "growth_media",
  acid: "acid", acids: "acid", corrosive: "acid", corrosives: "acid",
  base: "base", bases: "base", alkali: "base", alkalis: "base", "bases alkalis": "base", "bases/alkalis": "base",
  reagent: "general_reagent", reagents: "general_reagent", salt: "general_reagent", salts: "general_reagent", "general reagents salts": "general_reagent", "general reagents/salts": "general_reagent", chemical: "general_reagent", consumable: "general_reagent", general_reagent: "general_reagent",
  solvent: "solvent", solvents: "solvent", flammable: "solvent", flammables: "solvent", "solvents & flammables": "solvent",
  biohazard: "biohazard", biohazards: "biohazard", toxin: "biohazard", toxins: "biohazard", "biohazards toxins": "biohazard", "biohazards/toxins": "biohazard", culture: "biohazard",
  glassware: "glassware", glass: "glassware",
  instrument: "instrument", instruments: "instrument", equipment: "instrument", "instruments & equipment": "instrument",
};

const normalize = (value: string | undefined | null) => (value ?? "").trim().toLowerCase().replace(/[\s/]+/g, "_").replace(/-/g, "_");

/** Returns the locked inventory theme, including Tailwind background/text/border tokens and the exact HEX accent. */
export function getCategoryColor(category: string | undefined | null): ColorTokens {
  const normalized = normalize(category);
  const direct = normalized as CategoryColorKey;
  const key: CategoryColorKey = CATEGORY_COLOR_MAP[direct]
    ? direct
    : CATEGORY_ALIASES[normalized.replace(/_/g, " ")] ?? CATEGORY_ALIASES[normalized] ?? "general_reagent";
  return CATEGORY_COLOR_MAP[key];
}

/** Locked container/vessel bindings. No mutable color property is accepted. */
export const CONTAINER_COLOR_MAP: Record<ContainerType, ColorTokens> = {
  volumetric_glassware: token("volumetric_glassware", "Volumetric glassware", "#06B6D4", "bg-cyan-500", "bg-cyan-50", "text-cyan-900", "border-cyan-300", "border-l-cyan-500", "dark:bg-cyan-500/25", "dark:text-cyan-200"),
  storage_glassware: token("storage_glassware", "Storage glassware", "#0284C7", "bg-sky-600", "bg-sky-50", "text-sky-900", "border-sky-300", "border-l-sky-600", "dark:bg-sky-500/25", "dark:text-sky-200"),
  amber_bottle: token("amber_bottle", "Hazardous / amber bottle", "#D97706", "bg-amber-600", "bg-amber-50", "text-amber-900", "border-amber-400", "border-l-amber-600", "dark:bg-amber-500/25", "dark:text-amber-200"),
  plasticware: token("plasticware", "Plasticware / consumables", "#6366F1", "bg-indigo-500", "bg-indigo-50", "text-indigo-900", "border-indigo-300", "border-l-indigo-500", "dark:bg-indigo-500/25", "dark:text-indigo-200"),
  cryogenic_vial: token("cryogenic_vial", "Cryogenic / cold-storage vial", "#38BDF8", "bg-sky-400", "bg-sky-50", "text-sky-900", "border-sky-300", "border-l-sky-400", "dark:bg-sky-400/25", "dark:text-sky-100"),
  metal_storage: token("metal_storage", "Metal / heavy storage", "#475569", "bg-slate-600", "bg-slate-100", "text-slate-800", "border-slate-300", "border-l-slate-600", "dark:bg-slate-500/25", "dark:text-slate-100"),
};

const CONTAINER_ALIASES: Record<string, ContainerType> = {
  volumetric_glassware: "volumetric_glassware", volumetric: "volumetric_glassware", "graduated cylinder": "volumetric_glassware", cylinder: "volumetric_glassware", burette: "volumetric_glassware", "volumetric flask": "volumetric_glassware",
  storage_glassware: "storage_glassware", glassware: "storage_glassware", beaker: "storage_glassware", flask: "storage_glassware", "erlenmeyer flask": "storage_glassware", "reagent bottle": "storage_glassware", bottle: "storage_glassware",
  amber_bottle: "amber_bottle", amber: "amber_bottle", "amber bottle": "amber_bottle", "light sensitive": "amber_bottle",
  plasticware: "plasticware", plastic: "plasticware", "petri dish": "plasticware", petri: "plasticware", "microcentrifuge tube": "plasticware", "falcon tube": "plasticware", "test tube": "plasticware",
  cryogenic_vial: "cryogenic_vial", cryogenic: "cryogenic_vial", cryovial: "cryogenic_vial", "cryo vial": "cryogenic_vial", freezer: "cryogenic_vial",
  metal_storage: "metal_storage", metal: "metal_storage", "stainless steel": "metal_storage", "autoclavable tray": "metal_storage", tray: "metal_storage", drum: "metal_storage",
};

/** Returns the locked container/vessel theme for a stored type or a legacy vessel label. */
export function getContainerColor(containerType: string | undefined | null): ColorTokens {
  const normalized = normalize(containerType);
  const key = CONTAINER_COLOR_MAP[normalized as ContainerType]
    ? normalized as ContainerType
    : CONTAINER_ALIASES[normalized.replace(/_/g, " ")] ?? CONTAINER_ALIASES[normalized] ?? "storage_glassware";
  return CONTAINER_COLOR_MAP[key];
}

export function containerTypeFromLabel(label: string | undefined | null): ContainerType {
  const lower = (label ?? "").toLowerCase();
  if (/cryo|freeze|cold\s*storage/.test(lower)) return "cryogenic_vial";
  if (/amber|light[ -]?sensitive|brown bottle/.test(lower)) return "amber_bottle";
  if (/graduated|volumetric|burette|cylinder/.test(lower)) return "volumetric_glassware";
  if (/petri|microcentrifuge|falcon|plastic|test tube/.test(lower)) return "plasticware";
  if (/stainless|metal|steel|autoclavable|drum|tray/.test(lower)) return "metal_storage";
  return "storage_glassware";
}

export const CONTAINER_TYPE_OPTIONS = (Object.keys(CONTAINER_COLOR_MAP) as ContainerType[]).map((key) => ({
  value: key,
  label: CONTAINER_COLOR_MAP[key].label,
}));

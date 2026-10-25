import type { Category, Chemical, StorageGroup } from "@/lib/types";
import { CATEGORY_COLOR_MAP, getCategoryColor } from "@/lib/category-colors";

export type InventoryCategoryKey = keyof typeof CATEGORY_COLOR_MAP;

export type InventoryCategory = {
  key: InventoryCategoryKey;
  display_name: string;
  accent_hex: string;
  icon_key: string;
  /** System categories are immutable visual bindings. */
  is_system: true;
  active?: boolean;
};

const ICONS: Record<InventoryCategoryKey, string> = {
  growth_media: "wheat",
  acid: "flask-conical",
  base: "beaker",
  general_reagent: "flask-round",
  solvent: "flame",
  biohazard: "biohazard",
  glassware: "flask-round",
  instrument: "microscope",
};

/**
 * The only selectable visual categories. Color is deliberately not a database
 * preference: the key resolves through CATEGORY_COLOR_MAP on every screen.
 */
export const SYSTEM_INVENTORY_CATEGORIES: InventoryCategory[] = (Object.keys(CATEGORY_COLOR_MAP) as InventoryCategoryKey[])
  .map((key) => ({
    key,
    display_name: CATEGORY_COLOR_MAP[key].label,
    accent_hex: CATEGORY_COLOR_MAP[key].hex,
    icon_key: ICONS[key],
    is_system: true,
  }));

/** Always return a locked system category, ignoring obsolete custom color rows. */
export function categoryForKey(key: string | undefined | null, _available?: InventoryCategory[]): InventoryCategory {
  const lockedKey = getCategoryColor(key).key as InventoryCategoryKey;
  return SYSTEM_INVENTORY_CATEGORIES.find((category) => category.key === lockedKey)
    ?? SYSTEM_INVENTORY_CATEGORIES.find((category) => category.key === "general_reagent")!;
}

/** Backward-compatible classification for catalog rows created before the strict visual taxonomy. */
export function inferInventoryCategoryKey(
  chemical: Pick<Chemical, "category" | "storage_group">,
): InventoryCategoryKey {
  const legacyCategory: Category = chemical.category;
  const storage: StorageGroup = chemical.storage_group;
  if (legacyCategory === "Culture Media") return "growth_media";
  if (legacyCategory === "Glassware") return "glassware";
  if (legacyCategory === "Instrument") return "instrument";
  if (storage === "acid") return "acid";
  if (storage === "base") return "base";
  if (storage === "biohazard" || storage === "toxic" || legacyCategory === "Culture") return "biohazard";
  if (storage === "flammable") return "solvent";
  return "general_reagent";
}

export function chemicalInventoryCategory(chemical: Chemical): InventoryCategory {
  return categoryForKey(chemical.inventory_category_key ?? inferInventoryCategoryKey(chemical));
}

/** Retained for data-import diagnostics; UI no longer accepts user-selected colors. */
export function isAccessibleCategoryColor(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

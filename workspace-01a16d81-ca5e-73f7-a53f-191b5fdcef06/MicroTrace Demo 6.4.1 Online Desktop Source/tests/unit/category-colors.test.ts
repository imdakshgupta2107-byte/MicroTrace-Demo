import { describe, expect, it } from "vitest";
import { CATEGORY_COLOR_MAP, CATEGORY_KEYS, containerTypeFromLabel, getCategoryColor, getContainerColor } from "@/lib/category-colors";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";

describe("locked inventory and container visual taxonomy", () => {
  it("contains exactly the eight requested category bindings, hex accents and Tailwind accent classes", () => {
    expect(CATEGORY_KEYS).toEqual([
      "growth_media", "acid", "base", "general_reagent",
      "solvent", "biohazard", "glassware", "instrument",
    ]);
    expect(Object.keys(CATEGORY_COLOR_MAP)).toEqual(CATEGORY_KEYS);
    expect(Object.fromEntries(CATEGORY_KEYS.map((key) => [key, {
      label: CATEGORY_COLOR_MAP[key].label,
      hex: CATEGORY_COLOR_MAP[key].hex,
      background: CATEGORY_COLOR_MAP[key].background,
    }]))).toEqual({
      growth_media: { label: "Media Prep/Growth Media", hex: "#F59E0B", background: "bg-amber-500" },
      acid: { label: "Acids", hex: "#EF4444", background: "bg-red-500" },
      base: { label: "Bases/Alkalis", hex: "#3B82F6", background: "bg-blue-500" },
      general_reagent: { label: "General Reagents/Salts", hex: "#10B981", background: "bg-emerald-500" },
      solvent: { label: "Solvents & Flammables", hex: "#EA580C", background: "bg-orange-600" },
      biohazard: { label: "Biohazards/Toxins", hex: "#A855F7", background: "bg-purple-500" },
      glassware: { label: "Glassware", hex: "#06B6D4", background: "bg-cyan-500" },
      instrument: { label: "Instruments & Equipment", hex: "#475569", background: "bg-slate-600" },
    });
  });

  it("resolves category aliases without allowing a custom visual color", () => {
    expect(getCategoryColor("media prep/growth media").key).toBe("growth_media");
    expect(getCategoryColor("Bases/Alkalis").key).toBe("base");
    expect(getCategoryColor("custom_user_purple").key).toBe("general_reagent");
    expect(chemicalInventoryCategory({ category: "Glassware", storage_group: "general" } as never).key).toBe("glassware");
    expect(chemicalInventoryCategory({ category: "Instrument", storage_group: "general" } as never).key).toBe("instrument");
  });

  it("locks vessel types to their specified themes and legacy labels", () => {
    expect(getContainerColor("volumetric_glassware").hex).toBe("#06B6D4");
    expect(getContainerColor("storage_glassware").background).toBe("bg-sky-600");
    expect(getContainerColor("amber_bottle").hex).toBe("#D97706");
    expect(getContainerColor("plasticware").background).toBe("bg-indigo-500");
    expect(getContainerColor("cryogenic_vial").hex).toBe("#38BDF8");
    expect(getContainerColor("metal_storage").background).toBe("bg-slate-600");
    expect(containerTypeFromLabel("Amber bottle · shelf 2")).toBe("amber_bottle");
    expect(containerTypeFromLabel("Cryovial in deep freeze")).toBe("cryogenic_vial");
  });
});

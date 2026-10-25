import { describe, expect, it } from "vitest";
import { displayFromBase, normalizedInput } from "@/lib/quantity";
import { convertUnitValue, findUnit, normalizeToBase, unitsForDimension } from "@/lib/units";

describe("universal scientific unit catalog", () => {
  it("normalizes sub-nano, laboratory and industrial mass scales exactly", () => {
    expect(normalizeToBase("0.1", findUnit("ng")!)).toBe("1e-10");
    expect(normalizeToBase("1", findUnit("g_1e10")!)).toBe("10000000000");
    expect(displayFromBase(normalizedInput("2.5", "kg")!, "g")).toBe("2500");
  });

  it("converts cubic and customary volumes through canonical litres", () => {
    expect(convertUnitValue("1", findUnit("m3")!, findUnit("L")!)).toBe("1000");
    expect(convertUnitValue("1", findUnit("gal_us")!, findUnit("mL")!)).toBe("3785.411784");
  });

  it("keeps media-prep inputs in canonical concentration and volume bases", () => {
    const concentration = normalizedInput("28", "g_per_L");
    const volume = normalizedInput("500", "mL");
    expect(concentration?.mul(volume!).toString()).toBe("14");
  });

  it("keeps C1V1 dilution and molarity formula inputs dimensionally normalized", () => {
    const stock = normalizedInput("1", "M");
    const target = normalizedInput("500", "mM");
    const finalVolume = normalizedInput("1", "L");
    expect(target?.mul(finalVolume!).div(stock!).toString()).toBe("0.5");

    const molarity = normalizedInput("2", "M");
    const molarMass = normalizedInput("58.44", "g");
    const solutionVolume = normalizedInput("250", "mL");
    expect(molarity?.mul(molarMass!).mul(solutionVolume!).toString()).toBe("29.22");
  });

  it("offers every requested direct power choice plus customary units", () => {
    expect(unitsForDimension("mass").some((unit) => unit.code === "g_e_neg10")).toBe(true);
    expect(unitsForDimension("mass").some((unit) => unit.code === "g_1e10")).toBe(true);
    expect(unitsForDimension("volume").some((unit) => unit.code === "L_e_neg10")).toBe(true);
    expect(unitsForDimension("volume").some((unit) => unit.code === "L_1e10")).toBe(true);
    expect(unitsForDimension("volume").some((unit) => unit.code === "gal_us")).toBe(true);
    expect(normalizedInput("1", "g_e_neg10")?.toString()).toBe("1e-10");
    expect(normalizedInput("1", "g_per_L_e_10")?.toString()).toBe("10000000000");
  });
});

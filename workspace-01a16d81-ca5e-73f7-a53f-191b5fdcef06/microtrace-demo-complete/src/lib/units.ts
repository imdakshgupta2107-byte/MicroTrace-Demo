import Decimal from "decimal.js";

/**
 * Canonical storage units are g, L, m, mol, g/L and mol/L. Every displayed
 * quantity is normalized with Decimal before a scientific calculation or a
 * persistence write; do not rely on binary floating-point conversion here.
 */
export type UnitDimension =
  | "mass"
  | "volume"
  | "length"
  | "substance_amount"
  | "mass_concentration"
  | "molar_concentration"
  | "count";

export type UnitDefinition = {
  code: string;
  label: string;
  symbol: string;
  dimension: UnitDimension;
  /** Decimal multiplier to the canonical unit for this dimension. */
  scaleToBase: string;
  /** Optional presentation family used by the compact dropdown. */
  family?: "laboratory" | "extended" | "industrial" | "customary";
  /** Built-in units cannot be edited from the client. */
  system?: boolean;
};

const unit = (
  code: string,
  label: string,
  symbol: string,
  dimension: UnitDimension,
  scaleToBase: string,
  family: UnitDefinition["family"] = "laboratory",
): UnitDefinition => ({ code, label, symbol, dimension, scaleToBase, family, system: true });

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
const exponentSymbol = (exponent: number, suffix: string) => `10${exponent < 0 ? "⁻" : ""}${String(Math.abs(exponent)).split("").map((digit) => SUPERSCRIPT_DIGITS[digit]).join("")} ${suffix}`;
const exponentWords = (exponent: number) => exponent < 0 ? `Ten to the minus ${Math.abs(exponent)}` : `Ten to the ${exponent}`;

/** Add non-prefix choices so a dropdown has a choice for every exponent in the requested -10…+10 interval. */
const exactPowerGaps = (
  dimension: UnitDimension,
  codeRoot: string,
  suffix: string,
  labelSuffix: string,
  representedExponents: number[],
): UnitDefinition[] => Array.from({ length: 21 }, (_, index) => index - 10)
  .filter((exponent) => !representedExponents.includes(exponent))
  .map((exponent) => unit(
    `${codeRoot}_${exponent < 0 ? `neg${Math.abs(exponent)}` : exponent}`,
    `${exponentWords(exponent)} ${labelSuffix}`,
    exponentSymbol(exponent, suffix),
    dimension,
    `1e${exponent}`,
    exponent < 3 ? "extended" : "industrial",
  ));

const MASS_CONCENTRATION_EXACT_GAPS = exactPowerGaps(
  "mass_concentration", "g_per_L_e", "g/L", "grams per litre", [-9, -6, -3, 0, 3],
);
const MOLAR_CONCENTRATION_EXACT_GAPS = exactPowerGaps(
  "molar_concentration", "molar_e", "M", "molar", [-9, -6, -3, 0, 3, 6],
);

/**
 * Universal scientific catalog. It deliberately covers well beyond the
 * requested 10^-10…10^10 range, while retaining familiar wet-lab choices.
 * The value field accepts scientific notation as well (for example 2.5e-10).
 */
export const SCIENTIFIC_UNITS: UnitDefinition[] = [
  // Mass — base g. SI submultiples, common laboratory units, and industrial scales.
  unit("yg", "Yoctogram", "yg", "mass", "1e-24", "extended"),
  unit("zg", "Zeptogram", "zg", "mass", "1e-21", "extended"),
  unit("ag", "Attogram", "ag", "mass", "1e-18", "extended"),
  unit("fg", "Femtogram", "fg", "mass", "1e-15", "extended"),
  unit("pg", "Picogram", "pg", "mass", "1e-12", "extended"),
  // Exact scientific scales fill the gaps between named SI prefixes: the picker
  // therefore represents every power from 10⁻¹⁰ g through 10¹⁰ g.
  unit("g_e_neg10", "Ten to the minus ten grams", "10⁻¹⁰ g", "mass", "1e-10", "extended"),
  unit("ng", "Nanogram", "ng", "mass", "1e-9"),
  unit("g_e_neg8", "Ten to the minus eight grams", "10⁻⁸ g", "mass", "1e-8", "extended"),
  unit("g_e_neg7", "Ten to the minus seven grams", "10⁻⁷ g", "mass", "1e-7", "extended"),
  unit("ug", "Microgram", "µg", "mass", "1e-6"),
  unit("g_e_neg5", "Ten to the minus five grams", "10⁻⁵ g", "mass", "1e-5", "extended"),
  unit("g_e_neg4", "Ten to the minus four grams", "10⁻⁴ g", "mass", "1e-4", "extended"),
  unit("mg", "Milligram", "mg", "mass", "1e-3"),
  unit("cg", "Centigram", "cg", "mass", "1e-2", "extended"),
  unit("dg", "Decigram", "dg", "mass", "1e-1", "extended"),
  unit("g", "Gram", "g", "mass", "1"),
  unit("dag", "Decagram", "dag", "mass", "1e1", "extended"),
  unit("hg", "Hectogram", "hg", "mass", "1e2", "extended"),
  unit("kg", "Kilogram", "kg", "mass", "1e3"),
  unit("g_e4", "Ten thousand grams", "10⁴ g", "mass", "1e4", "industrial"),
  unit("g_e5", "One hundred thousand grams", "10⁵ g", "mass", "1e5", "industrial"),
  unit("t", "Metric tonne", "t", "mass", "1e6", "industrial"),
  unit("Mg", "Megagram", "Mg", "mass", "1e6", "industrial"),
  unit("g_e7", "Ten million grams", "10⁷ g", "mass", "1e7", "industrial"),
  unit("g_e8", "One hundred million grams", "10⁸ g", "mass", "1e8", "industrial"),
  unit("Gg", "Gigagram", "Gg", "mass", "1e9", "industrial"),
  unit("g_1e10", "Ten-billion grams", "10¹⁰ g", "mass", "1e10", "industrial"),
  unit("Tg", "Teragram", "Tg", "mass", "1e12", "industrial"),
  unit("Pg", "Petagram", "Pg", "mass", "1e15", "industrial"),
  unit("oz", "Ounce", "oz", "mass", "28.349523125", "customary"),
  unit("lb", "Pound", "lb", "mass", "453.59237", "customary"),

  // Volume — base L. Cubic and customary volumes are explicitly labelled.
  unit("yL", "Yoctolitre", "yL", "volume", "1e-24", "extended"),
  unit("zL", "Zeptolitre", "zL", "volume", "1e-21", "extended"),
  unit("aL", "Attolitre", "aL", "volume", "1e-18", "extended"),
  unit("fL", "Femtolitre", "fL", "volume", "1e-15", "extended"),
  unit("pL", "Picolitre", "pL", "volume", "1e-12", "extended"),
  // Exact scientific scales ensure no exponent is missing from 10⁻¹⁰ L to 10¹⁰ L.
  unit("L_e_neg10", "Ten to the minus ten litres", "10⁻¹⁰ L", "volume", "1e-10", "extended"),
  unit("nL", "Nanolitre", "nL", "volume", "1e-9"),
  unit("L_e_neg8", "Ten to the minus eight litres", "10⁻⁸ L", "volume", "1e-8", "extended"),
  unit("L_e_neg7", "Ten to the minus seven litres", "10⁻⁷ L", "volume", "1e-7", "extended"),
  unit("uL", "Microlitre", "µL", "volume", "1e-6"),
  unit("L_e_neg5", "Ten to the minus five litres", "10⁻⁵ L", "volume", "1e-5", "extended"),
  unit("L_e_neg4", "Ten to the minus four litres", "10⁻⁴ L", "volume", "1e-4", "extended"),
  unit("mL", "Millilitre", "mL", "volume", "1e-3"),
  unit("cm3", "Cubic centimetre", "cm³", "volume", "1e-3", "customary"),
  unit("cL", "Centilitre", "cL", "volume", "1e-2", "extended"),
  unit("dL", "Decilitre", "dL", "volume", "1e-1", "extended"),
  unit("L", "Litre", "L", "volume", "1"),
  unit("daL", "Decalitre", "daL", "volume", "1e1", "extended"),
  unit("hL", "Hectolitre", "hL", "volume", "1e2", "extended"),
  unit("m3", "Cubic metre", "m³", "volume", "1e3", "industrial"),
  unit("kL", "Kilolitre", "kL", "volume", "1e3", "industrial"),
  unit("L_e4", "Ten thousand litres", "10⁴ L", "volume", "1e4", "industrial"),
  unit("L_e5", "One hundred thousand litres", "10⁵ L", "volume", "1e5", "industrial"),
  unit("ML", "Megalitre", "ML", "volume", "1e6", "industrial"),
  unit("L_e7", "Ten million litres", "10⁷ L", "volume", "1e7", "industrial"),
  unit("L_e8", "One hundred million litres", "10⁸ L", "volume", "1e8", "industrial"),
  unit("GL", "Gigalitre", "GL", "volume", "1e9", "industrial"),
  unit("L_1e10", "Ten-billion litres", "10¹⁰ L", "volume", "1e10", "industrial"),
  unit("TL", "Teralitre", "TL", "volume", "1e12", "industrial"),
  unit("gal_us", "US gallon", "gal (US)", "volume", "3.785411784", "customary"),
  unit("gal_imp", "Imperial gallon", "gal (Imp)", "volume", "4.54609", "customary"),
  unit("floz_us", "US fluid ounce", "fl oz (US)", "volume", "0.0295735295625", "customary"),
  unit("bbl_us", "US barrel", "bbl (US)", "volume", "158.987294928", "customary"),

  // Length remains available to the unit converter and inventory metadata.
  unit("fm", "Femtometre", "fm", "length", "1e-15", "extended"),
  unit("pm", "Picometre", "pm", "length", "1e-12", "extended"),
  unit("A", "Ångström", "Å", "length", "1e-10"),
  unit("nm", "Nanometre", "nm", "length", "1e-9"),
  unit("um", "Micrometre", "µm", "length", "1e-6"),
  unit("mm", "Millimetre", "mm", "length", "1e-3"),
  unit("cm", "Centimetre", "cm", "length", "1e-2"),
  unit("dm", "Decimetre", "dm", "length", "1e-1", "extended"),
  unit("m", "Metre", "m", "length", "1"),
  unit("km", "Kilometre", "km", "length", "1e3"),
  unit("Mm", "Megametre", "Mm", "length", "1e6", "industrial"),
  unit("Gm", "Gigametre", "Gm", "length", "1e9", "industrial"),

  // Amount of substance — base mol.
  unit("ymol", "Yoctomole", "ymol", "substance_amount", "1e-24", "extended"),
  unit("zmol", "Zeptomole", "zmol", "substance_amount", "1e-21", "extended"),
  unit("amol", "Attomole", "amol", "substance_amount", "1e-18", "extended"),
  unit("fmol", "Femtomole", "fmol", "substance_amount", "1e-15", "extended"),
  unit("pmol", "Picomole", "pmol", "substance_amount", "1e-12", "extended"),
  unit("nmol", "Nanomole", "nmol", "substance_amount", "1e-9"),
  unit("umol", "Micromole", "µmol", "substance_amount", "1e-6"),
  unit("mmol", "Millimole", "mmol", "substance_amount", "1e-3"),
  unit("mol", "Mole", "mol", "substance_amount", "1"),
  unit("kmol", "Kilomole", "kmol", "substance_amount", "1e3", "industrial"),
  unit("Mmol", "Megamole", "Mmol", "substance_amount", "1e6", "industrial"),
  unit("Gmol", "Gigamole", "Gmol", "substance_amount", "1e9", "industrial"),

  // Mass concentration — base g/L.
  unit("fg_per_mL", "Femtogram per millilitre", "fg/mL", "mass_concentration", "1e-12", "extended"),
  unit("pg_per_mL", "Picogram per millilitre", "pg/mL", "mass_concentration", "1e-9", "extended"),
  unit("ng_per_mL", "Nanogram per millilitre", "ng/mL", "mass_concentration", "1e-6"),
  unit("ug_per_mL", "Microgram per millilitre", "µg/mL", "mass_concentration", "1e-3"),
  unit("mg_per_mL", "Milligram per millilitre", "mg/mL", "mass_concentration", "1"),
  unit("g_per_L", "Gram per litre", "g/L", "mass_concentration", "1"),
  unit("mg_per_L", "Milligram per litre", "mg/L", "mass_concentration", "1e-3"),
  unit("kg_per_L", "Kilogram per litre", "kg/L", "mass_concentration", "1e3", "industrial"),
  unit("g_per_mL", "Gram per millilitre", "g/mL", "mass_concentration", "1e3"),
  unit("kg_per_m3", "Kilogram per cubic metre", "kg/m³", "mass_concentration", "1"),
  unit("g_per_gal_us", "Gram per US gallon", "g/gal (US)", "mass_concentration", "0.2641720523581484", "customary"),
  // Completes a directly selectable 10⁻¹⁰…10¹⁰ g/L range without duplicating named SI choices above.
  ...MASS_CONCENTRATION_EXACT_GAPS,

  // Molar concentration — base mol/L.
  unit("fM", "Femtomolar", "fM", "molar_concentration", "1e-15", "extended"),
  unit("pM", "Picomolar", "pM", "molar_concentration", "1e-12", "extended"),
  unit("nM", "Nanomolar", "nM", "molar_concentration", "1e-9"),
  unit("uM", "Micromolar", "µM", "molar_concentration", "1e-6"),
  unit("mM", "Millimolar", "mM", "molar_concentration", "1e-3"),
  unit("M", "Molar", "M", "molar_concentration", "1"),
  unit("kM", "Kilomolar", "kM", "molar_concentration", "1e3", "industrial"),
  unit("MM", "Megamolar", "MM", "molar_concentration", "1e6", "industrial"),
  // Completes a directly selectable 10⁻¹⁰…10¹⁰ M range without duplicate prefixes.
  ...MOLAR_CONCENTRATION_EXACT_GAPS,

  unit("pcs", "Pieces", "pcs", "count", "1"),
  unit("units", "Units", "units", "count", "1"),
  unit("pkts", "Packets", "pkts", "count", "1"),
  unit("boxes", "Boxes", "boxes", "count", "1"),
  unit("slants", "Slants", "slants", "count", "1"),
  unit("sets", "Sets", "sets", "count", "1"),
  unit("rolls", "Rolls", "rolls", "count", "1"),
];

export const UNIT_BY_CODE = Object.fromEntries(
  SCIENTIFIC_UNITS.map((definition) => [definition.code, definition]),
) as Record<string, UnitDefinition>;

export function unitsForDimension(dimension: UnitDimension): UnitDefinition[] {
  return SCIENTIFIC_UNITS.filter((definition) => definition.dimension === dimension);
}

export function findUnit(code: string | undefined | null): UnitDefinition | undefined {
  return code ? UNIT_BY_CODE[code] : undefined;
}

export function normalizeToBase(value: string | number, definition: UnitDefinition): string {
  return new Decimal(value).mul(new Decimal(definition.scaleToBase)).toSignificantDigits(30).toString();
}

export function convertFromBase(value: string | number, definition: UnitDefinition): string {
  return new Decimal(value).div(new Decimal(definition.scaleToBase)).toSignificantDigits(30).toString();
}

export function normalizeUnitValue(value: string | number, code: string): string {
  const definition = findUnit(code);
  if (!definition) throw new Error("Unknown scientific unit.");
  return normalizeToBase(value, definition);
}

export function convertUnitValue(value: string | number, from: UnitDefinition, to: UnitDefinition): string {
  if (from.dimension !== to.dimension) throw new Error("Only units in the same scientific dimension can be converted.");
  return convertFromBase(normalizeToBase(value, from), to);
}

/** Infer legacy values while older catalog records are being migrated. */
export function inferUnitCode(value: string, storageGroup?: string): string {
  const raw = value.trim().replace("μ", "µ");
  const aliases: Record<string, string> = {
    "µg": "ug", "ug": "ug", "mg": "mg", "g": "g", "kg": "kg", "t": "t", "lb": "lb", "oz": "oz",
    "µL": "uL", "uL": "uL", "mL": "mL", "L": "L", "l": "L", "kL": "kL", "m³": "m3", "gal": "gal_us",
    "pcs": "pcs", "pc": "pcs", "units": "units", "pkts": "pkts", "boxes": "boxes",
    "slants": "slants", "sets": "sets", "rolls": "rolls",
  };
  if (aliases[raw]) return aliases[raw];
  return storageGroup === "general" ? "pcs" : "g";
}

export function unitDimensionForCode(code: string | undefined | null): UnitDimension {
  return findUnit(code)?.dimension ?? "count";
}

export function canonicalUnitLabel(dimension: UnitDimension): string {
  const labels: Record<UnitDimension, string> = {
    mass: "g", volume: "L", length: "m", substance_amount: "mol",
    mass_concentration: "g/L", molar_concentration: "mol/L", count: "count",
  };
  return labels[dimension];
}

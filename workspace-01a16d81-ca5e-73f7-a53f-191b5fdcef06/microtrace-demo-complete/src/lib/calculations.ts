// calculations — dilution, molarity, viability, plate/buffer maths.

/** C1·V1 = C2·V2 */
export function dilution(c1: number, c2: number, v2: number): { v1: number; diluent: number } {
  const v1 = (c2 * v2) / c1;
  return { v1, diluent: Math.max(0, v2 - v1) };
}

/** grams from molarity: g = M × MW(g/mol) × V(L) */
export const gramsFromMolarity = (molarM: number, mw: number, volMl: number): number =>
  molarM * mw * (volMl / 1000);

/** media scaling: recipe g/L → needed g for custom volume */
export const mediaGrams = (gPerL: number, volMl: number): number => (gPerL * volMl) / 1000;

/** serial dilution CFU/mL = colonies × dilution factor ÷ plated volume (mL) */
export const cfu = (colonies: number, dilutionFactor: number, platedUl: number): number =>
  platedUl > 0 ? (colonies * dilutionFactor) / (platedUl / 1000) : 0;

/** haemocytometer: cells/mL = (count × dilution × 10⁴) / squares */
export const cellsPerMl = (count: number, squares: number, dilution: number): number =>
  squares > 0 ? (count * dilution * 10000) / squares : 0;

/** viability % = live / (live + dead) */
export const viabilityPct = (live: number, dead: number): number =>
  live + dead > 0 ? (live / (live + dead)) * 100 : 0;

/** seeding volume for target density: V = target × finalVol / stock */
export const seedVolume = (targetCellsMl: number, stockCellsMl: number, finalVolMl: number): number =>
  stockCellsMl > 0 ? (targetCellsMl * finalVolMl) / stockCellsMl : 0;

/** scientific notation formatter, e.g. 3.40 × 10⁶ */
export function sci(n: number): string {
  if (!n || !isFinite(n)) return "—";
  const [m, x] = n.toExponential(2).split("e");
  const supMap: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  const sup = parseInt(x, 10).toString().split("").map((c) => supMap[c] ?? c).join("");
  return `${m} × 10${sup}`;
}

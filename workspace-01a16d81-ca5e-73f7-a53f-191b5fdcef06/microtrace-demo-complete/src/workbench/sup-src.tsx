// sup-src — HTML superscript helper (0-9, dot, minus, x).
const MAP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵",
  "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", ".": "ᐧ", "e": "ᵉ", "×": "×", " ": " ",
};
export function sup(s: string): string {
  let out = "";
  for (const c of s) out += MAP[c] ?? c;
  return out;
}

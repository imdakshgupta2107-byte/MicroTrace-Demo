// barcode — GS1-128 / plain-code parser for pre-printed lab stickers.
// GS1 AIs handled: (01) GTIN-14, (17) expiry YYMMDD, (10) batch, (21) serial.
import type { Gs1Code } from "./types";

function yymmdd(raw: string): string | undefined {
  if (!/^\d{6}$/.test(raw)) return undefined;
  const yy = +raw.slice(0, 2), mm = +raw.slice(2, 4), dd = +raw.slice(4, 6);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function parseBarcode(rawInput: string): Gs1Code {
  const raw = rawInput.replace(/\u001d/g, "").trim(); // strip GS group separators
  const out: Gs1Code = { raw: rawInput.trim() };
  let s = raw;
  // fixed-length AIs we know: 01 → 14 digits, 17 → 6 digits
  const FIXED: Record<string, number> = { "01": 14, "17": 6 };
  while (s.length > 0) {
    const ai = s.slice(0, 2);
    if (FIXED[ai] && s.length >= 2 + FIXED[ai]) {
      const val = s.slice(2, 2 + FIXED[ai]);
      if (ai === "01") out.gtin = val;
      else if (ai === "17") out.expiry = yymmdd(val);
      s = s.slice(2 + FIXED[ai]);
      continue;
    }
    if (ai === "10" || ai === "21") {
      // variable length up to next AI (01/17) or end
      const rest = s.slice(2);
      const next01 = rest.indexOf("01"), next17 = rest.indexOf("17");
      const next = [next01, next17].filter((x) => x >= 3).sort((a, b) => a - b)[0];
      const val = next !== undefined ? rest.slice(0, next) : rest;
      if (ai === "10") out.batch = val; else out.serial = val;
      s = next !== undefined ? rest.slice(next) : "";
      continue;
    }
    // not GS1 — treat entire input as a plain barcode/serial
    out.serial = out.serial ?? raw;
    break;
  }
  return out;
}

/** the identifier we store on a container: GTIN if present, else the raw code */
export const barcodeKey = (b: Gs1Code): string => b.gtin ?? b.serial ?? b.raw;

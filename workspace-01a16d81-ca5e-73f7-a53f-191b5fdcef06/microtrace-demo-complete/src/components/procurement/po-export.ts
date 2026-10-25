// po-export — generate a REAL .docx (OOXML zip, store method) for a purchase order set.
// No HTML-in-.doc tricks: this is a genuine WordprocessingML package.
import { saveBlob } from "@/lib/native";
import type { Chemical, PurchaseOrder, Vendor } from "@/lib/types";
import { fmtINR, todayISO } from "@/lib/format";

// ---------- minimal zip writer (STORE method) ----------
function crc32(bytes: Uint8Array): number {
  let table: number[] | undefined = (crc32 as unknown as { _t?: number[] })._t;
  if (!table) {
    table = (crc32 as unknown as { _t?: number[] })._t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const out: number[] = [];
  const central: number[] = [];
  const push32 = (v: number, t: number[]) => { t.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
  const push16 = (v: number, t: number[]) => { t.push(v & 255, (v >>> 8) & 255); };
  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const offset = out.length;
    const crc = crc32(f.data);
    push32(0x04034b50, out); push16(20, out); push16(0, out); push16(0, out); push16(0, out); push16(0, out);
    push32(crc, out); push32(f.data.length, out); push32(f.data.length, out);
    push16(nameBytes.length, out); push16(0, out);
    for (const b of nameBytes) out.push(b);
    for (const b of f.data) out.push(b);
    const c: number[] = [];
    push32(0x02014b50, c); push16(20, c); push16(20, c); push16(0, c); push16(0, c); push16(0, c); push16(0, c);
    push32(crc, c); push32(f.data.length, c); push32(f.data.length, c);
    push16(nameBytes.length, c); push16(0, c); push16(0, c); push16(0, c); push16(0, c); push32(0, c); push32(offset, c);
    for (const b of nameBytes) c.push(b);
    central.push(...c);
  }
  const cdOffset = out.length;
  out.push(...central);
  push32(0x06054b50, out); push16(0, out); push16(0, out); push16(files.length, out); push16(files.length, out);
  push32(central.length, out); push32(cdOffset, out); push16(0, out);
  return new Uint8Array(out);
}

// ---------- docx body ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const p_ = (text: string, opts = "") =>
  `<w:p><w:pPr>${opts}</w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
const pBold = (text: string) =>
  `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
const tblRow = (cells: string[], header = false) =>
  `<w:tr>${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>${header ? pBold(c) : p_(c)}</w:tc>`).join("")}</w:tr>`;

export interface PoLine { po: PurchaseOrder & { id: string }; chem: Chemical; vendor: Vendor | null; }

export function buildPoDocx(lines: PoLine[], meta: { ref: string; by: string; slot: string }): Uint8Array {
  const total = lines.reduce((s, l) => s + l.po.total_inr, 0);
  const rows = [
    tblRow(["Item", "Vendor", "Packs", "Pack size", "Unit ₹", "Total ₹"], true),
    ...lines.map((l) => tblRow([
      l.chem.name,
      l.vendor?.name ?? "—",
      String(l.po.packs),
      `${l.po.pack_size} ${l.chem.unit}`,
      fmtINR(l.po.unit_price).replace(/[₹,]/g, "").trim(),
      fmtINR(l.po.total_inr).replace(/[₹,]/g, "").trim(),
    ])),
  ];
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${pBold("MicroTrace - Purchase Order")}
${p_("Ref: " + meta.ref + "   Slot: " + meta.slot + "   Date: " + todayISO() + "   Raised by: " + meta.by)}
${p_("")}
<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/>
<w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/>
<w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/>
</w:tblBorders></w:tblPr>
${rows.join("")}
</w:tbl>
${p_("")}
${pBold("Grand total: " + fmtINR(total))}
${p_("")}
${p_("Please supply the above materials to the Department of Microbiology laboratory. Prices as per the latest recorded quotation.")}
${p_("")}
${p_("Lab In-charge: ____________________        Approved (Principal): ____________________")}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  const enc = (s: string) => new TextEncoder().encode(s);
  return zipStore([
    { name: "[Content_Types].xml", data: enc(contentTypes) },
    { name: "_rels/.rels", data: enc(rels) },
    { name: "word/_rels/document.xml.rels", data: enc(docRels) },
    { name: "word/document.xml", data: enc(document) },
  ]);
}

export async function savePoDocx(lines: PoLine[], slot: string, by: string): Promise<string> {
  const ref = "MT-PO-" + Date.now().toString(36).toUpperCase();
  const bytes = buildPoDocx(lines, { ref, by, slot });
  const name = `MicroTrace-PO-${ref}.docx`;
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  await saveBlob(name, blob);
  return ref;
}

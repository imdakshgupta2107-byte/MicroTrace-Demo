import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { buildXlsx } from "@/pages/reports-page";
import { buildPoDocx, type PoLine } from "@/components/procurement/po-export";

function expectValidXml(bytes: Uint8Array) {
  const document = new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
  expect(document.getElementsByTagName("parsererror")).toHaveLength(0);
}

describe("real Office exports (not HTML renamed as Office files)", () => {
  it("builds a valid XLSX with text, numbers and XML-escaped content", () => {
    const files = unzipSync(buildXlsx("Register", [["Chemical", "Stock"], ["Ethanol & buffer <sample>", 95]]));
    expect(files["xl/workbook.xml"]).toBeDefined();
    expect(files["xl/worksheets/sheet1.xml"]).toBeDefined();
    Object.entries(files).filter(([name]) => name.endsWith(".xml") || name.endsWith(".rels"))
      .forEach(([, bytes]) => expectValidXml(bytes));
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("&amp;");
    expect(sheet).toContain('<c r="B2"><v>95</v></c>');
  });

  it("builds a valid DOCX purchase order including item/vendor/total", () => {
    const line: PoLine = {
      chem: { id: "chemical-1", name: "Buffer & reagent", category: "Chemical", unit: "mL", min_stock: 100, ghs: [], storage_group: "general", ppe: "Gloves", supplier: "Test Vendor", notes: "", pubchem_cid: null },
      vendor: { id: "vendor-1", name: "Test & Vendor", phone: "", email: "", address: "", notes: "" },
      po: { id: "po-1", chemical_id: "chemical-1", vendor_id: "vendor-1", packs: 2, pack_size: 500, unit_price: 100, total_inr: 200, status: "draft", created_by: "Lab User", ordered_at: null, received_at: null },
    };
    const files = unzipSync(buildPoDocx([line], { ref: "MT-TEST", by: "Lab User", slot: "weekly" }));
    expect(files["word/document.xml"]).toBeDefined();
    Object.entries(files).filter(([name]) => name.endsWith(".xml") || name.endsWith(".rels"))
      .forEach(([, bytes]) => expectValidXml(bytes));
    expect(strFromU8(files["word/document.xml"])).toContain("Buffer &amp; reagent");
    expect(strFromU8(files["word/document.xml"])).toContain("Grand total");
  });
});

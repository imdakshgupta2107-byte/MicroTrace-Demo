import { RouteRedirect } from "@/components/auth/route-redirect";
// reports-page — charts + REAL .xlsx export (teacher, staff, principal).
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLabData } from "@/hooks/useLabData";
import { useServiceDesk } from "@/service-desk/store";
import { canSeeReportsFiles } from "@/lib/auth";
import { chemicalStock } from "@/lib/procurement";
import { chemicalInventoryCategory } from "@/lib/inventory-categories";
import { getCategoryColor } from "@/lib/category-colors";
import { todayISO, fmtDate, fmtINR, fmtNum } from "@/lib/format";
import { saveBlob } from "@/lib/native";
import { zipStore } from "@/components/procurement/po-export";
import { BarChart, DonutChart, Card } from "@/screens/_shared";
import { useToast } from "@/hooks/useToast";
import { Download } from "lucide-react";

// ---------- minimal REAL .xlsx writer (OOXML, zip STORE) ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number): string => {
  let s = "";
  i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
};
type Row = (string | number)[];
export function buildXlsx(sheetName: string, rows: Row[]): Uint8Array {
  const cell = (v: string | number, r: number, c: number) => {
    const ref = `${colName(c)}${r + 1}`;
    return typeof v === "number" && Number.isFinite(v)
      ? `<c r="${ref}"><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v ?? ""))}</t></is></c>`;
  };
  const sheetData = rows.map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i, c)).join("")}</row>`).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  const enc = (s: string) => new TextEncoder().encode(s);
  return zipStore([
    { name: "[Content_Types].xml", data: enc(types) },
    { name: "_rels/.rels", data: enc(rels) },
    { name: "xl/workbook.xml", data: enc(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc(wbRels) },
    { name: "xl/worksheets/sheet1.xml", data: enc(sheet) },
  ]);
}

const downloadXlsx = async (filename: string, sheetName: string, rows: Row[]) => {
  const bytes = buildXlsx(sheetName, rows);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  await saveBlob(filename, blob);
};

const DONUT_COLORS = ["#b8892b", "#2f7d4f", "#0e3a5d", "#b45309", "#5b2a86", "#64748b", "#7a1f2b"];

export default function ReportsPage() {
  const { role } = useAuth();
  const { data } = useLabData();
  const { data: desk } = useServiceDesk();
  const { toast } = useToast();

  const byCategory = useMemo(() => {
    const groups = new Map<string, { label: string; value: number; color: string }>();
    (data?.chemicals ?? []).forEach((chemical) => {
      const category = chemicalInventoryCategory(chemical);
      const current = groups.get(category.key) ?? { label: category.display_name, value: 0, color: getCategoryColor(category.key).hex };
      current.value += 1;
      groups.set(category.key, current);
    });
    // Counts are meaningful across mixed units (g, mL, boxes and instruments).
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const expBuckets = useMemo(() => {
    const g: { label: string; value: number }[] = [
      { label: "expired", value: 0 }, { label: "<30d", value: 0 }, { label: "<90d", value: 0 }, { label: "ok", value: 0 },
    ];
    (data?.containers ?? []).filter((c) => c.state !== "disposed" && c.expiry).forEach((c) => {
      const d = Math.ceil((new Date(c.expiry + "T00:00:00").getTime() - Date.now()) / 86400000);
      if (d < 0) g[0].value++; else if (d <= 30) g[1].value++; else if (d <= 90) g[2].value++; else g[3].value++;
    });
    return g.map((b, i) => ({ ...b, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  }, [data]);

  const lowList = useMemo(() => (data?.chemicals ?? [])
    .map((c) => ({ c, stock: chemicalStock(c, data?.containers ?? []) }))
    .filter((x) => x.stock <= x.c.min_stock)
    .sort((a, b) => a.stock / (a.c.min_stock || 1) - b.stock / (b.c.min_stock || 1)), [data]);

  const exportReport = async () => {
    const rows: Row[] = [
      ["MicroTrace chemical register", todayISO()], [],
      ["Chemical", "Category", "Unit", "In stock", "Min", "Status", "Supplier"],
      ...(data?.chemicals ?? []).map((c) => {
        const stock = chemicalStock(c, data?.containers ?? []);
        return [c.name, c.category, c.unit, Math.round(stock * 1000) / 1000, c.min_stock, stock <= c.min_stock ? "LOW" : "OK", c.supplier];
      }),
    ];
    await downloadXlsx(`MicroTrace-report-${todayISO()}.xlsx`, "Register", rows);
    toast("Excel report downloaded.");
  };
  const exportAudit = async () => {
    const rows: Row[] = [["When", "Actor", "Action", "Entity", "Entity ID"],
      ...(data?.audit ?? []).map((a) => [fmtDate(a.created_at), a.actor, a.action, a.entity, a.entity_id])];
    await downloadXlsx(`MicroTrace-audit-${todayISO()}.xlsx`, "Audit", rows);
    toast("Audit Excel downloaded.");
  };
  const exportLabDesk = async () => {
    const rows: Row[] = [
      ["MicroTrace Lab Desk governance register", todayISO()], [],
      ["Reference", "Channel", "Type", "Priority", "Status", "Requester", "Role", "Route", "Location", "Item", "Quantity", "Created", "Outcome"],
      ...desk.tickets.map((ticket) => [
        ticket.reference, ticket.channel, ticket.category, ticket.priority, ticket.status,
        ticket.requester, ticket.requester_role, ticket.route_label, ticket.location,
        ticket.related_item_name ?? "", ticket.requested_qty ?? "", fmtDate(ticket.created_at), ticket.outcome_note,
      ]),
    ];
    await downloadXlsx(`MicroTrace-lab-desk-${todayISO()}.xlsx`, "Lab Desk", rows);
    toast("Lab Desk governance register downloaded.");
  };

  if (!canSeeReportsFiles(role)) return <RouteRedirect to="/dashboard" replace />;
  return (
    <>
      <PageHeader title="Reports" sub="Live charts + downloadable Excel (.xlsx) snapshots."
        actions={
          <>
            <Button variant="primary" onClick={exportReport}><Download size={14} /> Register .xlsx</Button>
            <Button variant="outline" onClick={exportLabDesk}><Download size={14} /> Lab Desk .xlsx</Button>
            <Button variant="outline" onClick={exportAudit}><Download size={14} /> Audit .xlsx</Button>
          </>
        } />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Inventory items by category">
          <BarChart data={byCategory.map((d) => ({ ...d, value: Math.round(d.value * 10) / 10 }))} />
        </Card>
        <Card title="Expiry buckets (containers)">
          <DonutChart data={expBuckets} />
        </Card>
        <Card title="Lowest stock (worst first)" right={<Badge tone="red">{lowList.length} low</Badge>}>
          {lowList.length === 0 ? <p className="text-[12.5px] text-slate-500">All chemicals above their minimum.</p> : (
            <ul className="space-y-1 text-[12.5px]">
              {lowList.slice(0, 10).map(({ c, stock }) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate font-semibold text-ink">{c.name}</span>
                  <span className="whitespace-nowrap"><b className="text-red-700">{fmtNum(stock)}</b>/{fmtNum(c.min_stock)} {c.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Purchase orders">
          {(data?.pos ?? []).length === 0 ? <p className="text-[12.5px] text-slate-500">No purchase orders yet (Procurement page).</p> : (
            <ul className="space-y-1 text-[12.5px]">
              {(data?.pos ?? []).slice(0, 10).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{data?.chemicals.find((c) => c.id === p.chemical_id)?.name} ×{p.packs} packs</span>
                  <span className="whitespace-nowrap flex items-center gap-2">
                    <b>{fmtINR(p.total_inr)}</b><Badge tone={p.status === "received" ? "green" : p.status === "ordered" ? "blue" : "gray"}>{p.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Lab Desk governance" right={<Badge tone="navy">{desk.tickets.length} total</Badge>}>
          {desk.tickets.length === 0 ? <p className="text-[12.5px] text-slate-500">No routed issue report or requirement yet.</p> : (
            <ul className="space-y-1 text-[12.5px]">
              {desk.tickets.slice(0, 10).map((ticket) => (
                <li key={ticket.id} className="flex justify-between gap-2">
                  <span className="truncate"><b className="text-ink">{ticket.channel === "report" ? "Issue" : "Requirement"}</b> · {ticket.title}</span>
                  <Badge tone={ticket.status === "resolved" || ticket.status === "fulfilled" ? "green" : ticket.status === "declined" ? "red" : "amber"}>{ticket.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

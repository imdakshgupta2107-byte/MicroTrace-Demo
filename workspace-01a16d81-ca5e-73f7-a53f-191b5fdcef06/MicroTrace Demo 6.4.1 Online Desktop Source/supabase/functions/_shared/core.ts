/** Pure, runtime-independent rules. No credentials, database access or network. */
export const ZONE = 'Asia/Kolkata';
export interface StockItem { id: string; name: string; unit: string; min_stock: number }
export interface StockContainer { id: string; chemical_id: string; qty: number; state: string; expiry: string | null; use_by: string | null; label?: string; location?: string }
export interface StockRow { id: string; name: string; unit: string; on_hand: number; usable: number; minimum: number }
export interface Signal { signal_key: string; kind: 'low_stock' | 'expiry'; entity_id: string; stage: string; title: string; detail: string; chemical_id: string; unit: string; quantity: number; threshold?: number; expiry?: string; location?: string }
export interface ReportContent {
  kind: 'weekly' | 'daily'; generated_at: string; period_start: string; period_end: string;
  inventory: StockRow[]; signals: Signal[]; pending_requests: number; unresolved_discrepancies: number;
  consumption: { id: string; name: string; quantity: number; unit: string }[];
  write_offs: { id: string; name: string; quantity: number; unit: string }[];
}
export interface DueJob { key: string; kind: 'weekly' | 'daily'; due_at: string; period_start: string; period_end: string }
const DAY = 86_400_000;
const OFFSET = 330 * 60_000; // The selected zone has no daylight-saving changes.
const round = (n: number) => Math.round((n + Number.EPSILON) * 10_000) / 10_000;
export function isoDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
export function localDay(now: Date): string { return new Date(now.getTime() + OFFSET).toISOString().slice(0, 10); }
export function expiryDate(container: StockContainer): string | null {
  const dates = [isoDate(container.expiry), isoDate(container.use_by)].filter((date): date is string => Boolean(date));
  return dates.sort()[0] ?? null;
}
export function inventoryRows(items: StockItem[], containers: StockContainer[], now: Date): StockRow[] {
  const today = localDay(now);
  return items.map(item => {
    const rows = containers.filter(row => row.chemical_id === item.id && row.state !== 'disposed' && row.state !== 'depleted');
    const total = (list: StockContainer[]) => round(list.reduce((sum, row) => sum + Math.max(0, Number(row.qty) || 0), 0));
    return { id: item.id, name: item.name, unit: item.unit, minimum: Number(item.min_stock), on_hand: total(rows),
      usable: total(rows.filter(row => !expiryDate(row) || expiryDate(row)! >= today)) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export function stockSignals(items: StockItem[], containers: StockContainer[], now: Date, flags = { low_stock: true, expiry: true }): Signal[] {
  const result: Signal[] = []; const today = localDay(now);
  if (flags.low_stock) for (const row of inventoryRows(items, containers, now)) {
    // Zero means no minimum configured. Expired material is not usable stock.
    if (row.minimum > 0 && row.usable <= row.minimum) result.push({
      signal_key: `low:${row.id}:${row.minimum}`, kind: 'low_stock', entity_id: row.id, stage: 'low',
      title: row.name, detail: `${row.usable} ${row.unit} usable; minimum ${row.minimum} ${row.unit}`,
      chemical_id: row.id, unit: row.unit, quantity: row.usable, threshold: row.minimum,
    });
  }
  if (flags.expiry) for (const container of containers) {
    if (container.state === 'disposed' || container.state === 'depleted' || Number(container.qty) <= 0) continue;
    const expiry = expiryDate(container); if (!expiry) continue;
    const days = Math.round((Date.parse(expiry) - Date.parse(today)) / DAY);
    if (days > 30) continue;
    const item = items.find(row => row.id === container.chemical_id); if (!item) continue;
    const stage = days < 0 ? 'expired' : days <= 7 ? '7_days' : '30_days';
    result.push({ signal_key: `expiry:${container.id}:${expiry}:${stage}`, kind: 'expiry', entity_id: container.id, stage,
      title: item.name, detail: days < 0 ? `Expired on ${expiry}` : days === 0 ? `Expires today (${expiry})` : `Expires in ${days} days (${expiry})`,
      chemical_id: item.id, unit: item.unit, quantity: Number(container.qty), expiry,
      location: [container.label, container.location].filter(Boolean).join(' · '),
    });
  }
  return result;
}
/** Last due weekly run, and today's daily run. No backfill before activation. */
export function dueJobs(now: Date, activatedAt: string | null, enabled: { weekly: boolean; daily: boolean } = { weekly: true, daily: true }): DueJob[] {
  if (!activatedAt || !Number.isFinite(Date.parse(activatedAt))) return [];
  const today = Date.parse(localDay(now));
  const daysFromMonday = (new Date(today).getUTCDay() + 6) % 7;
  let monday = today - daysFromMonday * DAY;
  if (monday - OFFSET + 9 * 3_600_000 > now.getTime()) monday -= 7 * DAY;
  const result: DueJob[] = [];
  for (const [kind, day, hour, permitted] of [['daily', today, 8, enabled.daily], ['weekly', monday, 9, enabled.weekly]] as const) {
    const due = day - OFFSET + hour * 3_600_000;
    if (!permitted || due > now.getTime() || due < Date.parse(activatedAt)) continue;
    const start = kind === 'weekly' ? day - 7 * DAY : day - DAY;
    result.push({ key: `${kind}:${new Date(day).toISOString().slice(0, 10)}`, kind,
      due_at: new Date(due).toISOString(), period_start: new Date(start - OFFSET).toISOString(), period_end: new Date(day - OFFSET).toISOString() });
  }
  return result;
}
export function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value);
}
export function validWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && !['localhost','127.0.0.1'].includes(url.hostname); } catch { return false; }
}
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]!));
}
export function reportLink(webUrl: string, id: string): string {
  if (!validWebUrl(webUrl) || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('A valid HTTPS app root and report ID are required.');
  return new URL(`/automation/reports/${id}`, webUrl).toString();
}
function formatQty(value: number): string { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(value); }
export function renderReport(content: ReportContent, link: string): { subject: string; text: string; html: string } {
  if (!/^https:\/\//.test(link)) throw new Error('Report links must use HTTPS.');
  const weekly = content.kind === 'weekly';
  const subject = weekly ? `MicroTrace weekly principal report — ${localDay(new Date(content.period_start))}` : 'MicroTrace stock and expiry alerts';
  const headline = weekly ? 'Your weekly lab overview' : 'New stock & expiry alerts';
  const lines = weekly ? [
    `Inventory items: ${content.inventory.length}`,
    `Pending requests now: ${content.pending_requests}`,
    `Unresolved discrepancies now: ${content.unresolved_discrepancies}`,
    ...content.consumption.slice(0, 20).map(row => `Issued: ${row.name}: ${formatQty(row.quantity)} ${row.unit}`),
    ...content.write_offs.slice(0, 10).map(row => `Written off: ${row.name}: ${formatQty(row.quantity)} ${row.unit}`),
  ] : content.signals.slice(0, 30).map(signal => `${signal.title}: ${signal.detail}${signal.location ? ` · ${signal.location}` : ''}`);
  const period = weekly ? `Period: ${localDay(new Date(content.period_start))} to ${localDay(new Date(new Date(content.period_end).getTime() - DAY))} (${ZONE}).` : `Checked: ${new Date(content.generated_at).toLocaleString('en-IN', { timeZone: ZONE })} IST.`;
  const note = 'Stock is listed per item/unit; unlike units are never added. Weekly consumption means quantities issued; returns and write-offs are recorded separately. No student names or personal request notes are included. Sign in to see protected records.';
  const text = `${headline}\n${period}\n\n${lines.join('\n')}\n\n${content.kind === 'daily' && content.signals.length > 30 ? `${content.signals.length - 30} more alerts in the app.\n` : ''}Open protected report: ${link}\n\n${note}\nManage recipients or pause scheduled mail in MicroTrace → Automations.\n`;
  const html = `<html><body style="margin:0;background:#eef1f6;font:14px Arial,sans-serif;color:#14233d"><div style="max-width:640px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#0f2142;color:white"><div style="color:#e8be55;font-size:12px;letter-spacing:2px">MICROTRACE · LAB OPERATIONS</div><h1 style="font-size:24px;margin:12px 0 4px">${headline}</h1><p style="font-size:12px;line-height:1.6">${escapeHtml(period)}</p></div><div style="padding:24px"><ul style="padding-left:20px;line-height:1.8">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul><p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f2142;color:white;text-decoration:none;padding:13px 18px;border-radius:9px">Open protected report</a></p><p style="color:#64748b;font-size:12px;line-height:1.7">${note}</p><p style="color:#64748b;font-size:12px">Manage recipients or pause mail in MicroTrace → Automations.</p></div></div></body></html>`;
  return { subject, text, html };
}
export function base64url(bytes: Uint8Array): string {
  let binary = ''; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64(value: string): string { return base64url(new TextEncoder().encode(value)).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - base64url(new TextEncoder().encode(value)).length % 4) % 4); }
function wrap64(value: string): string { return value.match(/.{1,76}/g)?.join('\r\n') ?? ''; }
function encodedSubject(value: string): string {
  // RFC 2047 encoded words must be <=75 characters. Fold on UTF-8 boundaries.
  const words: string[] = []; let current = '';
  for (const character of value) {
    if (new TextEncoder().encode(current + character).length > 42 && current) { words.push(`=?UTF-8?B?${base64(current)}?=`); current = ''; }
    current += character;
  }
  if (current) words.push(`=?UTF-8?B?${base64(current)}?=`);
  return words.join('\r\n ');
}
export function mimeMessage(input: { id: string; from: string; to: string; subject: string; text: string; html: string; now?: Date }): string {
  if (!validEmail(input.from) || !validEmail(input.to) || /[\r\n]/.test(input.subject) || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error('Unsafe email header.');
  const boundary = `mt_${input.id.replace(/-/g, '')}`;
  const message = [ `From: MicroTrace <${input.from}>`, `To: ${input.to}`, `Date: ${(input.now ?? new Date()).toUTCString()}`,
    `Message-ID: <${input.id}@${input.from.split('@')[1]}>`, `Subject: ${encodedSubject(input.subject)}`, 'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap64(base64(input.text)),
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap64(base64(input.html)), `--${boundary}--`, '' ].join('\r\n');
  return base64url(new TextEncoder().encode(message));
}

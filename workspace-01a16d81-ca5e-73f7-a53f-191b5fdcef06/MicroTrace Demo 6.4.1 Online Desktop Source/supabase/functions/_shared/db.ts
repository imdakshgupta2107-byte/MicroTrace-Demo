import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { inventoryRows, stockSignals, type ReportContent } from './core.ts';
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export type Admin = ReturnType<typeof adminClient>;
export async function allRows(db: Admin, table: string, columns: string) {
  const result: Record<string, unknown>[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await db.from(table).select(columns).order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(`DATABASE_READ_${table}`);
    const rows = (data ?? []) as unknown as Record<string, unknown>[]; result.push(...rows);
    if (rows.length < 1000) return result;
  }
  throw new Error('DATASET_TOO_LARGE_NO_PARTIAL_REPORT_SENT');
}
export async function snapshot(db: Admin, kind: 'weekly'|'daily', start: string, end: string, flags: {low_stock:boolean;expiry:boolean}, now = new Date()): Promise<ReportContent> {
  const [items, containers, aggregate] = await Promise.all([
    allRows(db,'chemicals','id,name,unit,min_stock'),
    allRows(db,'containers','id,chemical_id,qty,state,expiry,use_by,label,location'),
    db.rpc('automation_aggregate',{p_start:start,p_end:end}),
  ]);
  if (aggregate.error) throw new Error('AGGREGATE_FAILED');
  const typedItems = items as unknown as Parameters<typeof stockSignals>[0];
  const typedContainers = containers as unknown as Parameters<typeof stockSignals>[1];
  return { kind,generated_at:now.toISOString(),period_start:start,period_end:end,
    inventory:inventoryRows(typedItems,typedContainers,now),signals:stockSignals(typedItems,typedContainers,now,flags),
    pending_requests:Number(aggregate.data.pending_requests),unresolved_discrepancies:Number(aggregate.data.unresolved_discrepancies),
    consumption:aggregate.data.consumption ?? [],write_offs:aggregate.data.write_offs ?? [] };
}
export function assertDb(error: unknown, code = 'DATABASE_OPERATION_FAILED'): void { if (error) throw new Error(code); }
export async function event(db: Admin, actor: string|null, action: string, details: Record<string,unknown> = {}) {
  const result=await db.from('automation_events').insert({actor_id:actor,action,details}); assertDb(result.error);
}

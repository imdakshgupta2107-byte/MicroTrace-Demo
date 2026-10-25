-- Fresh, separate Supabase project only. Never run the old demo schema.sql.
-- One lab per project. No sample data or automatic role grants.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create table public.lab_members (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('student','teacher','staff','principal')),
 full_name text not null check(length(trim(full_name)) between 1 and 120),
 class_name text not null default '', active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.lab_members enable row level security;
create function private.app_role() returns text language sql stable security definer set search_path = '' as $$
 select role from public.lab_members where id = (select auth.uid()) and active;
$$;
create function private.app_name() returns text language sql stable security definer set search_path = '' as $$
 select full_name from public.lab_members where id = (select auth.uid()) and active;
$$;
revoke all on function private.app_role(), private.app_name() from public, anon;
grant execute on function private.app_role(), private.app_name() to authenticated, service_role;
create policy member_read on public.lab_members for select to authenticated using (id=(select auth.uid()) or (select private.app_role())='principal');
revoke all on public.lab_members from public, anon, authenticated;
grant select on public.lab_members to authenticated;
grant all on public.lab_members to service_role;

-- ---------- chemical masters (catalog) ----------
create table if not exists chemicals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in
              ('Chemical','Culture Media','Glassware','Instrument','Consumable','Culture')),
  unit        text not null,                       -- g, mL, pcs, units…
  min_stock   numeric not null default 0,          -- low-stock level (in unit)
  ghs         text[] not null default '{}',        -- GHS01..GHS09
  storage_group text not null default 'general',   -- acid/base/oxidizer/flammable/toxic/biohazard/general
  ppe         text not null default '',
  supplier    text not null default '',
  notes       text not null default '',
  pubchem_cid integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- physical bottles / packs (lots) ----------
create table if not exists containers (
  id          uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references chemicals(id) on delete cascade,
  label       text not null default '',            -- e.g. "Bottle 1 · M1 cupboard"
  barcode     text,                                -- pre-printed sticker / GS1-128
  qty         numeric not null default 0,          -- remaining, in chemical unit
  unit_size   numeric not null default 0,          -- full size of this bottle
  location    text not null default '',
  expiry      date,                                -- null = non-expiring (hardware)
  state       text not null default 'sealed' check (state in ('sealed','opened','depleted','disposed')),
  opened_at   date,                                -- opened date → degradation tracking
  use_by      date,                                -- optional custom disposal date
  created_at  timestamptz not null default now()
);
create index if not exists containers_chemical_idx on containers(chemical_id);
create index if not exists containers_barcode_idx on containers(barcode) where barcode is not null;

-- ---------- issue / borrow requests ----------
create table if not exists requests (
  id           uuid primary key default gen_random_uuid(),
  chemical_id  uuid not null references chemicals(id) on delete cascade,
  container_id uuid references containers(id) on delete set null,
  qty          numeric not null check (qty > 0),
  purpose      text not null,
  requester    text not null,                      -- student display name
  requester_role text not null default 'student',
  status       text not null default 'pending' check (status in ('pending','approved','issued','returned','rejected','withdrawn')),
  decided_by   text,
  note         text,
  requested_at timestamptz not null default now(),
  issued_at    timestamptz,
  return_due   date,
  returned_at  timestamptz,
  created_by_device text not null default ''
);

-- ---------- vendors + price list ----------
create table if not exists vendors (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  phone    text not null default '',
  email    text not null default '',
  address  text not null default '',
  notes    text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists vendor_prices (
  id         uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references chemicals(id) on delete cascade,
  vendor_id  uuid not null references vendors(id) on delete cascade,
  pack_label text not null,
  pack_size  numeric not null check (pack_size > 0),  -- in chemical unit
  price_inr  numeric not null check (price_inr >= 0),
  updated_at timestamptz not null default now(),
  unique (chemical_id, vendor_id)
);

-- ---------- purchase orders ----------
create table if not exists purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references chemicals(id) on delete cascade,
  vendor_id   uuid references vendors(id) on delete set null,
  packs       integer not null check (packs >= 1),
  pack_size   numeric not null,
  unit_price  numeric not null,
  total_inr   numeric not null,
  status      text not null default 'draft' check (status in ('draft','ordered','received','cancelled')),
  created_by  text not null default '',
  ordered_at  timestamptz,
  received_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- practical schedule ----------
create table if not exists practicals (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  class_name text not null default '',
  scheduled_on date not null,
  chemicals  jsonb not null default '[]',          -- [{chemical_id, qty}]
  created_by text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- instrument bookings ----------
create table if not exists instrument_bookings (
  id uuid primary key default gen_random_uuid(),
  chemical_id uuid not null references chemicals(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('09:00–11:00','11:00–13:00','13:00–15:00','15:00–17:00')),
  booked_by text not null default '',
  booked_by_role text not null default 'student' check (booked_by_role in ('student','teacher','staff','principal')),
  purpose text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  decided_by text,
  note text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists instrument_slot_active_idx
  on instrument_bookings(chemical_id, date, slot) where status in ('pending','approved');

-- ---------- safety incidents ----------
create table if not exists incidents (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                       -- spill / eye / skin / fire / culture / other
  chemical_id uuid references chemicals(id) on delete set null,
  location    text not null default '',
  description text not null,
  action_taken text not null default '',
  reported_by text not null default '',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ---------- stock discrepancies / breakage ----------
create table if not exists discrepancies (
  id           uuid primary key default gen_random_uuid(),
  container_id uuid references containers(id) on delete set null,
  chemical_id  uuid not null references chemicals(id) on delete cascade,
  kind         text not null default 'breakage' check (kind in ('breakage','waste','contamination','count-mismatch')),
  qty_lost     numeric not null check (qty_lost > 0),
  reason       text not null,
  reported_by  text not null default '',
  status       text not null default 'reported' check (status in ('reported','written-off','declined')),
  decided_by   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- audit trail ----------
create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  actor      text not null default '',
  action     text not null,
  entity     text not null default '',
  entity_id  text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_time_idx on audit_log(created_at desc);

-- ---------- workbench lab notes ----------
create table if not exists lab_notes (
  id        uuid primary key default gen_random_uuid(),
  author    text not null default '',
  title     text not null default '',
  body      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_chem_touch on chemicals;
create trigger trg_chem_touch before update on chemicals
  for each row execute function touch_updated_at();
drop trigger if exists trg_notes_touch on lab_notes;
create trigger trg_notes_touch before update on lab_notes
  for each row execute function touch_updated_at();
drop trigger if exists trg_price_touch on vendor_prices;
create trigger trg_price_touch before update on vendor_prices
  for each row execute function touch_updated_at();

-- Server-owned provenance and non-negative stock.
alter table public.requests add column created_at timestamptz not null default now();
alter table public.chemicals add constraint min_stock_nonnegative check(min_stock >= 0);
alter table public.containers add constraint qty_nonnegative check(qty >= 0);
alter table public.containers add constraint unit_size_nonnegative check(unit_size >= 0);
alter table public.requests add column owner_id uuid not null default auth.uid() references auth.users(id);
alter table public.instrument_bookings add column owner_id uuid not null default auth.uid() references auth.users(id);
alter table public.discrepancies add column owner_id uuid not null default auth.uid() references auth.users(id);
alter table public.incidents add column owner_id uuid not null default auth.uid() references auth.users(id);
alter table public.lab_notes add column owner_id uuid not null default auth.uid() references auth.users(id);
create index requests_owner_idx on public.requests(owner_id);
create index discrepancies_owner_idx on public.discrepancies(owner_id);

create table public.stock_movements (
 id uuid primary key default gen_random_uuid(), container_id uuid references public.containers(id) on delete set null,
 chemical_id uuid references public.chemicals(id) on delete set null, chemical_name text not null, unit text not null,
 delta numeric not null, kind text not null check(kind in ('opening','issue','return','write_off','receipt','adjustment','disposal')),
 actor_id uuid references auth.users(id) on delete set null, occurred_at timestamptz not null default now()
);
create index movement_time_idx on public.stock_movements(occurred_at);
alter table public.stock_movements enable row level security;
create policy movements_read on public.stock_movements for select to authenticated using ((select private.app_role()) in ('staff','principal'));
revoke all on public.stock_movements from public, anon, authenticated;
grant select on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;

create function private.stock_movement() returns trigger language plpgsql security definer set search_path = '' as $$
declare difference numeric; item public.chemicals; movement_kind text;
begin
 if tg_op='INSERT' then difference:=new.qty; movement_kind:=coalesce(nullif(current_setting('microtrace.movement_kind',true),''),'opening');
 else difference:=new.qty-old.qty; movement_kind:=coalesce(nullif(current_setting('microtrace.movement_kind',true),''),'adjustment');
 end if;
 if difference<>0 then
  select * into item from public.chemicals where id=new.chemical_id;
  insert into public.stock_movements(container_id,chemical_id,chemical_name,unit,delta,kind,actor_id)
    values(new.id,item.id,item.name,item.unit,difference,movement_kind,auth.uid());
 end if;
 return new;
end $$;
create trigger record_stock_movement after insert or update of qty on public.containers for each row execute function private.stock_movement();

-- The server, not a client-supplied PIN/name/status, owns provenance.
create function private.guard_owned() returns trigger language plpgsql security definer set search_path = '' as $$
declare app_role text := private.app_role(); manager boolean := coalesce(private.app_role() in ('staff','principal'),false);
begin
 if auth.uid() is null then return new; end if; -- trusted database/service maintenance only
 if tg_op='INSERT' then
  new.owner_id:=auth.uid(); new.created_at:=now();
  if tg_table_name='requests' then new.requester:=private.app_name(); new.requester_role:=app_role; new.status:='pending'; new.requested_at:=now(); new.decided_by:=null; new.issued_at:=null; new.returned_at:=null;
  elsif tg_table_name='instrument_bookings' then new.booked_by:=private.app_name(); new.booked_by_role:=app_role; new.status:=case when manager and new.status='approved' then 'approved' else 'pending' end; new.decided_by:=case when new.status='approved' then private.app_name() else null end;
  elsif tg_table_name='discrepancies' then new.reported_by:=private.app_name(); new.status:='reported'; new.decided_by:=null; new.resolved_at:=null;
  elsif tg_table_name='incidents' then new.reported_by:=private.app_name();
  elsif tg_table_name='lab_notes' then new.author:=private.app_name(); end if;
 else
  if new.owner_id<>old.owner_id or new.id<>old.id or new.created_at<>old.created_at then raise exception 'Record ownership cannot be changed'; end if;
  if tg_table_name='requests' then
   if not manager and (old.owner_id<>auth.uid() or old.status<>'pending' or new.status<>'withdrawn' or (to_jsonb(new)-'status')<>(to_jsonb(old)-'status')) then raise exception 'Only withdrawal of your pending request is allowed'; end if;
   if manager and new.status in ('issued','returned') and new.status<>old.status and current_setting('microtrace.operation',true) is distinct from 'request_action' then raise exception 'Use the atomic request_action operation'; end if;
  elsif tg_table_name='instrument_bookings' and not manager then
   if old.owner_id<>auth.uid() or old.status not in ('pending','approved') or new.status<>'cancelled' or (to_jsonb(new)-'status'-'decided_by')<>(to_jsonb(old)-'status'-'decided_by') then raise exception 'Only cancellation of your booking is allowed'; end if; new.decided_by:=private.app_name();
  elsif tg_table_name='discrepancies' then
   if new.status='written-off' and old.status<>new.status and current_setting('microtrace.operation',true) is distinct from 'write_off' then raise exception 'Use the atomic resolve_discrepancy operation'; end if;
  elsif tg_table_name='lab_notes' then new.author:=old.author;
  end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['requests','instrument_bookings','discrepancies','incidents','lab_notes'] loop
  execute format('create trigger guard_owned before insert or update on public.%I for each row execute function private.guard_owned()',t);
 end loop;
end $$;

create function private.log_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare entity_id text;
begin
 if tg_op='DELETE' then entity_id:=old.id::text; else entity_id:=new.id::text; end if;
 insert into public.audit_log(actor,action,entity,entity_id) values(coalesce(private.app_name(),'System'),tg_op,tg_table_name,entity_id);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

do $$ declare t text; begin
 foreach t in array array['chemicals','containers','requests','vendors','vendor_prices','purchase_orders','practicals','instrument_bookings','incidents','discrepancies','audit_log','lab_notes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  if t<>'audit_log' then execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.log_change()',t); end if;
 end loop;
end $$;
revoke insert,update,delete on public.audit_log from authenticated;
create policy audit_read on public.audit_log for select to authenticated using ((select private.app_role()) in ('staff','principal'));

-- Catalog and schedule: signed-in active members can read; no anonymous access.
do $$ declare t text; begin
 foreach t in array array['chemicals','containers','practicals','instrument_bookings'] loop
  execute format('create policy member_read on public.%I for select to authenticated using ((select private.app_role()) is not null)',t);
 end loop;
 foreach t in array array['chemicals','containers','vendors','vendor_prices','purchase_orders'] loop
  execute format('create policy manager_write on public.%I for all to authenticated using ((select private.app_role()) in (''staff'',''principal'')) with check ((select private.app_role()) in (''staff'',''principal''))',t);
 end loop;
end $$;
create policy schedule_write on public.practicals for all to authenticated using ((select private.app_role()) in ('teacher','principal')) with check ((select private.app_role()) in ('teacher','principal'));
create policy request_read on public.requests for select to authenticated using (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal'));
create policy request_insert on public.requests for insert to authenticated with check (owner_id=(select auth.uid()) and status='pending' and (select private.app_role()) is not null);
create policy request_update on public.requests for update to authenticated using (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal')) with check (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal'));
create policy booking_insert on public.instrument_bookings for insert to authenticated with check (owner_id=(select auth.uid()) and (status='pending' or (status='approved' and (select private.app_role()) in ('staff','principal'))) and (select private.app_role()) is not null);
create policy booking_update on public.instrument_bookings for update to authenticated using (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal')) with check (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal'));
create policy discrepancy_read on public.discrepancies for select to authenticated using (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal'));
create policy discrepancy_insert on public.discrepancies for insert to authenticated with check (owner_id=(select auth.uid()) and status='reported' and (select private.app_role()) is not null);
create policy discrepancy_update on public.discrepancies for update to authenticated using ((select private.app_role()) in ('staff','principal')) with check ((select private.app_role()) in ('staff','principal'));
create policy incident_read on public.incidents for select to authenticated using (owner_id=(select auth.uid()) or (select private.app_role()) in ('staff','principal'));
create policy incident_insert on public.incidents for insert to authenticated with check (owner_id=(select auth.uid()) and (select private.app_role()) is not null);
create policy incident_update on public.incidents for update to authenticated using ((select private.app_role()) in ('staff','principal')) with check ((select private.app_role()) in ('staff','principal'));
create policy notes_own on public.lab_notes for all to authenticated using (owner_id=(select auth.uid()) and (select private.app_role()) is not null) with check (owner_id=(select auth.uid()) and (select private.app_role()) is not null);

-- Atomic stock transitions: retries cannot subtract/add twice.
create function public.request_action(p_id uuid,p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare req public.requests; item public.chemicals; bottle public.containers; remain numeric; take numeric;
begin
 if coalesce(private.app_role(),'') not in ('staff','principal') then raise exception 'Staff or principal authentication required'; end if;
 select * into req from public.requests where id=p_id for update; if not found then raise exception 'Request not found'; end if;
 select * into item from public.chemicals where id=req.chemical_id;
 perform pg_advisory_xact_lock(hashtextextended(req.chemical_id::text,0));
 perform set_config('microtrace.operation','request_action',true);
 if p_action='issue' then
  if req.status='issued' then return; end if;
  if req.status not in ('pending','approved') then raise exception 'Request is no longer pending'; end if;
  perform set_config('microtrace.movement_kind','issue',true); remain:=req.qty;
  for bottle in select * from public.containers where chemical_id=req.chemical_id and state in ('sealed','opened') and qty>0
    and (expiry is null or expiry>=(now() at time zone 'Asia/Kolkata')::date) and (use_by is null or use_by>=(now() at time zone 'Asia/Kolkata')::date)
    order by least(expiry,use_by) asc nulls last,id for update loop
   take:=least(remain,bottle.qty);
   update public.containers set qty=qty-take,state=case when qty-take=0 then 'depleted' else state end where id=bottle.id;
   remain:=remain-take; exit when remain<=0;
  end loop;
  if remain>0 then raise exception 'Insufficient usable stock; no quantities were changed'; end if;
  update public.requests set status='issued',decided_by=private.app_name(),issued_at=now(),return_due=case when item.category in ('Instrument','Glassware') then (now() at time zone 'Asia/Kolkata')::date+7 else null end where id=p_id;
 elsif p_action='reject' then
  if req.status='rejected' then return; end if;
  if req.status not in ('pending','approved') then raise exception 'Only a pending request can be rejected'; end if;
  update public.requests set status='rejected',decided_by=private.app_name() where id=p_id;
 elsif p_action='return' then
  if req.status='returned' then return; end if;
  if req.status<>'issued' or item.category not in ('Instrument','Glassware') then raise exception 'Only an issued returnable item can be returned'; end if;
  select * into bottle from public.containers where chemical_id=req.chemical_id and state<>'disposed' order by id limit 1 for update;
  if not found then raise exception 'Create a suitable return container first'; end if;
  perform set_config('microtrace.movement_kind','return',true);
  update public.containers set qty=qty+req.qty,state='opened' where id=bottle.id;
  update public.requests set status='returned',returned_at=now(),decided_by=private.app_name() where id=p_id;
 else raise exception 'Unknown request action'; end if;
end $$;

create function public.resolve_discrepancy(p_id uuid,p_decision text) returns void language plpgsql security definer set search_path = '' as $$
declare problem public.discrepancies; bottle public.containers; remain numeric; take numeric;
begin
 if coalesce(private.app_role(),'') not in ('staff','principal') then raise exception 'Staff or principal authentication required'; end if;
 select * into problem from public.discrepancies where id=p_id for update; if not found then raise exception 'Report not found'; end if;
 if p_decision not in ('written-off','declined') then raise exception 'Unknown decision'; end if;
 if problem.status=p_decision then return; end if;
 if problem.status<>'reported' then raise exception 'Already resolved'; end if;
 if p_decision='written-off' then
  perform set_config('microtrace.movement_kind','write_off',true); remain:=problem.qty_lost;
  for bottle in select * from public.containers where chemical_id=problem.chemical_id and state<>'disposed' and qty>0 and (problem.container_id is null or id=problem.container_id) order by least(expiry,use_by) asc nulls last,id for update loop
   take:=least(remain,bottle.qty);
   update public.containers set qty=qty-take,state=case when qty-take=0 then 'depleted' else state end where id=bottle.id;
   remain:=remain-take;exit when remain<=0;
  end loop;
  if remain>0 then raise exception 'Insufficient suitable stock; no write-off applied'; end if;
 end if;
 perform set_config('microtrace.operation','write_off',true);
 update public.discrepancies set status=p_decision,decided_by=private.app_name(),resolved_at=now() where id=p_id;
end $$;

revoke all on function public.request_action(uuid,text),public.resolve_discrepancy(uuid,text) from public,anon;
grant execute on function public.request_action(uuid,text),public.resolve_discrepancy(uuid,text) to authenticated;
-- The UI subscribes only to tables its RLS allows it to read.
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['chemicals','containers','requests','vendors','vendor_prices','purchase_orders','practicals','instrument_bookings','incidents','discrepancies','audit_log','lab_notes'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
 end if;
end $$;
commit;

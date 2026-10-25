-- ============================================================
-- MicroTrace v3 — Supabase schema (SCHEMA ONLY, no seed data)
-- Run in Supabase SQL editor. Then enable Realtime for all tables
-- (Database → Replication → supabase_realtime → add tables) or run:
--   alter publication supabase_realtime add table chemicals, containers,
--     requests, vendors, vendor_prices, purchase_orders, practicals,
--     incidents, discrepancies, audit_log, lab_notes;
-- ============================================================

create extension if not exists pgcrypto;

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
  container_type text not null default 'storage_glassware'
              check (container_type in ('volumetric_glassware','storage_glassware','amber_bottle','plasticware','cryogenic_vial','metal_storage')),
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

-- ---------- instrument bookings (development reference only) ----------
-- The distributed demo build disables cloud access. Do not use these demo
-- policies for a real laboratory without authenticated roles and hardened RLS.
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

-- ---------- RLS: demo policies (open to anon key) ----------
-- For a shared college demo this is convenient; harden before real data:
-- replace with per-device or authenticated-user policies.
alter table chemicals        enable row level security;
alter table containers       enable row level security;
alter table requests         enable row level security;
alter table vendors          enable row level security;
alter table vendor_prices    enable row level security;
alter table purchase_orders  enable row level security;
alter table practicals       enable row level security;
alter table instrument_bookings enable row level security;
alter table incidents        enable row level security;
alter table discrepancies    enable row level security;
alter table audit_log        enable row level security;
alter table lab_notes        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['chemicals','containers','requests','vendors','vendor_prices',
    'purchase_orders','practicals','instrument_bookings','incidents','discrepancies','audit_log','lab_notes'] loop
    execute format('drop policy if exists %I_all on %I;', t, t);
    execute format('create policy %I_all on %I for all using (true) with check (true);', t, t);
  end loop;
end $$;

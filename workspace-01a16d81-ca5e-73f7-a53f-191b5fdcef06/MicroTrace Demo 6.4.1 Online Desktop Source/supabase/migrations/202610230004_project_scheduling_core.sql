-- MicroTrace v3.5 project scheduling core. Applied after scientific unit/category migration.
begin;
-- Project → sub-project → team → bench / resource schedule
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique check (length(trim(project_code)) between 3 and 48),
  title text not null check (length(trim(title)) between 2 and 180),
  description text not null default '',
  parent_project_id uuid references public.projects(id) on delete restrict,
  status text not null default 'planning' check (status in ('planning','active','on_hold','completed','archived')),
  research_lead_id uuid references public.lab_members(id) on delete set null default auth.uid(),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on>=starts_on),
  check (parent_project_id is null or parent_project_id<>id)
);
create index projects_parent_idx on public.projects(parent_project_id);

create table public.project_teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_code text not null check (length(trim(team_code)) between 2 and 48),
  name text not null check (length(trim(name)) between 2 and 120),
  lead_member_id uuid references public.lab_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(project_id,team_code)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.lab_members(id) on delete cascade,
  team_id uuid references public.project_teams(id) on delete set null,
  project_role text not null check(project_role in ('research_lead','co_lead','researcher','technician','student')),
  created_at timestamptz not null default now(),
  primary key(project_id,member_id)
);

create table public.hazard_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location_note text not null default ''
);

create table public.lab_benches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  room_name text not null default '',
  hazard_zone_id uuid references public.hazard_zones(id) on delete set null,
  active boolean not null default true,
  notes text not null default ''
);

create table public.lab_resources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null check(kind in ('bench_tool','instrument','fume_hood','biosafety_cabinet','cold_storage','other')),
  bench_id uuid references public.lab_benches(id) on delete set null,
  requires_exclusive_booking boolean not null default true,
  active boolean not null default true,
  notes text not null default ''
);

create table public.project_bookings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  team_id uuid references public.project_teams(id) on delete set null,
  bench_id uuid not null references public.lab_benches(id) on delete restrict,
  booked_by uuid references public.lab_members(id) on delete set null default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  period tstzrange generated always as (tstzrange(starts_at,ends_at,'[)')) stored,
  state text not null default 'pending' check(state in ('draft','pending','confirmed','active','completed','cancelled','rejected')),
  purpose text not null check(length(trim(purpose)) between 3 and 500),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at>starts_at),
  check(ends_at<=starts_at+interval '24 hours')
);

alter table public.project_bookings add constraint project_booking_no_bench_overlap
  exclude using gist (bench_id with =,period with &&)
  where (state in ('pending','confirmed','active'));
create index project_bookings_project_time_idx on public.project_bookings(project_id,starts_at);

create table public.booking_resource_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.project_bookings(id) on delete cascade,
  resource_id uuid not null references public.lab_resources(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  period tstzrange generated always as (tstzrange(starts_at,ends_at,'[)')) stored,
  state text not null default 'pending' check(state in ('draft','pending','confirmed','active','completed','cancelled','rejected')),
  created_at timestamptz not null default now(),
  check(ends_at>starts_at)
);
alter table public.booking_resource_reservations add constraint booking_resource_no_overlap
  exclude using gist(resource_id with =,period with &&)
  where (state in ('pending','confirmed','active'));

create table public.project_reagent_quotas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  chemical_id uuid not null references public.chemicals(id) on delete restrict,
  dimension text not null check(dimension in ('mass','volume','length','substance_amount','mass_concentration','molar_concentration','count')),
  allocated_base numeric not null check(allocated_base>0),
  reserved_base numeric not null default 0 check(reserved_base>=0),
  consumed_base numeric not null default 0 check(consumed_base>=0),
  created_by uuid references public.lab_members(id) on delete set null default auth.uid(),
  approved_by uuid references public.lab_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(reserved_base+consumed_base<=allocated_base),
  unique(project_id,chemical_id,dimension)
);

create table public.booking_reagent_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.project_bookings(id) on delete cascade,
  quota_id uuid not null references public.project_reagent_quotas(id) on delete restrict,
  requested_base numeric not null check(requested_base>0),
  issued_base numeric not null default 0 check(issued_base>=0),
  state text not null default 'pending' check(state in ('draft','pending','confirmed','active','completed','cancelled','rejected')),
  created_at timestamptz not null default now(),
  check(issued_base<=requested_base)
);

create table public.hazard_classes (
  code text primary key check(code ~ '^[a-z][a-z0-9_]{1,48}$'),
  label text not null
);
insert into public.hazard_classes(code,label) values
 ('acid','Acid / corrosive'),('base','Alkali / corrosive'),('oxidizer','Oxidizer'),('flammable','Flammable'),('toxic','Toxic'),('biohazard','Biohazard')
on conflict(code) do nothing;

create table public.chemical_hazard_classes (
  chemical_id uuid not null references public.chemicals(id) on delete cascade,
  hazard_code text not null references public.hazard_classes(code) on delete cascade,
  primary key(chemical_id,hazard_code)
);
insert into public.chemical_hazard_classes(chemical_id,hazard_code)
select id,storage_group from public.chemicals where storage_group in ('acid','base','oxidizer','flammable','toxic','biohazard')
on conflict do nothing;

create table public.hazard_compatibility_rules (
  hazard_a text not null references public.hazard_classes(code),
  hazard_b text not null references public.hazard_classes(code),
  can_overlap boolean not null default true,
  notes text not null default '',
  primary key(hazard_a,hazard_b),
  check(hazard_a<hazard_b)
);
insert into public.hazard_compatibility_rules(hazard_a,hazard_b,can_overlap,notes) values
 ('acid','oxidizer',false,'Segregate acids and oxidizers within the same hazard zone.'),
 ('flammable','oxidizer',false,'Do not schedule flammable and oxidizer work concurrently in one hazard zone.'),
 ('biohazard','toxic',false,'Requires a dedicated containment and decontamination plan.')
on conflict(hazard_a,hazard_b) do update set can_overlap=excluded.can_overlap,notes=excluded.notes;

create or replace function private.project_can_access(p_project_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.app_role()) in ('staff','principal'),false)
    or exists(select 1 from public.projects p where p.id=p_project_id and p.research_lead_id=(select auth.uid()))
    or exists(select 1 from public.project_members pm where pm.project_id=p_project_id and pm.member_id=(select auth.uid()));
$$;

create or replace function private.project_can_manage(p_project_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.app_role()) in ('staff','principal'),false)
    or exists(select 1 from public.projects p where p.id=p_project_id and p.research_lead_id=(select auth.uid()))
    or exists(select 1 from public.project_members pm where pm.project_id=p_project_id and pm.member_id=(select auth.uid()) and pm.project_role in ('research_lead','co_lead','technician'));
$$;

create or replace function private.assert_booking_hazard_compatibility() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_booking public.project_bookings; current_chemical uuid; has_conflict boolean;
begin
  select b.* into current_booking from public.project_bookings b where b.id=new.booking_id;
  select q.chemical_id into current_chemical from public.project_reagent_quotas q where q.id=new.quota_id;
  if current_booking.id is null or current_chemical is null then raise exception 'Booking or quota not found'; end if;
  if not exists(select 1 from public.lab_benches where id=current_booking.bench_id and hazard_zone_id is not null) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended((select hazard_zone_id::text from public.lab_benches where id=current_booking.bench_id),0));
  select exists(
    select 1
    from public.booking_reagent_reservations existing_reservation
    join public.project_bookings existing_booking on existing_booking.id=existing_reservation.booking_id
    join public.project_reagent_quotas existing_quota on existing_quota.id=existing_reservation.quota_id
    join public.lab_benches existing_bench on existing_bench.id=existing_booking.bench_id
    join public.lab_benches current_bench on current_bench.id=current_booking.bench_id
    join public.chemical_hazard_classes current_hazard on current_hazard.chemical_id=current_chemical
    join public.chemical_hazard_classes existing_hazard on existing_hazard.chemical_id=existing_quota.chemical_id
    join public.hazard_compatibility_rules rule on rule.hazard_a=least(current_hazard.hazard_code,existing_hazard.hazard_code)
      and rule.hazard_b=greatest(current_hazard.hazard_code,existing_hazard.hazard_code)
    where existing_booking.id<>current_booking.id
      and existing_booking.state in ('pending','confirmed','active')
      and existing_bench.hazard_zone_id=current_bench.hazard_zone_id
      and existing_booking.period && current_booking.period
      and rule.can_overlap=false
  ) into has_conflict;
  if has_conflict then raise exception 'Hazard conflict: incompatible work is already scheduled in this hazard zone'; end if;
  return new;
end $$;
create trigger booking_hazard_compatibility before insert on public.booking_reagent_reservations
for each row execute function private.assert_booking_hazard_compatibility();

-- The only live client mutation path for a booking. It locks quota rows and
-- lets exclusion constraints serialize bench/tool conflicts atomically.
create or replace function public.create_project_booking(
  p_project_id uuid,
  p_team_id uuid,
  p_bench_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_purpose text,
  p_notes text default '',
  p_resource_ids uuid[] default '{}',
  p_reagents jsonb default '[]'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare booking_id uuid; resource_id uuid; reagent jsonb; quota public.project_reagent_quotas; requested numeric; caller_role text;
begin
  caller_role:=private.app_role();
  if caller_role is null or not private.project_can_manage(p_project_id) then raise exception 'Project management permission required'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at or p_ends_at>p_starts_at+interval '24 hours' then raise exception 'Invalid booking period'; end if;
  if length(trim(coalesce(p_purpose,'')))<3 then raise exception 'Booking purpose must contain at least three characters'; end if;
  if not exists(select 1 from public.lab_benches where id=p_bench_id and active) then raise exception 'Selected bench is not active'; end if;
  if p_team_id is not null and not exists(select 1 from public.project_teams where id=p_team_id and project_id=p_project_id) then raise exception 'Team does not belong to this project'; end if;

  insert into public.project_bookings(project_id,team_id,bench_id,booked_by,starts_at,ends_at,state,purpose,notes)
  values(p_project_id,p_team_id,p_bench_id,auth.uid(),p_starts_at,p_ends_at,'confirmed',trim(p_purpose),coalesce(p_notes,''))
  returning id into booking_id;

  foreach resource_id in array coalesce(p_resource_ids,'{}') loop
    if not exists(select 1 from public.lab_resources where id=resource_id and active) then raise exception 'Selected resource is not active'; end if;
    insert into public.booking_resource_reservations(booking_id,resource_id,starts_at,ends_at,state)
    values(booking_id,resource_id,p_starts_at,p_ends_at,'confirmed');
  end loop;

  for reagent in select value from jsonb_array_elements(coalesce(p_reagents,'[]'::jsonb)) loop
    requested:=nullif(reagent->>'requested_base','')::numeric;
    if requested is null or requested<=0 then raise exception 'Reagent request must be positive'; end if;
    select * into quota from public.project_reagent_quotas where id=(reagent->>'quota_id')::uuid and project_id=p_project_id for update;
    if not found then raise exception 'Project quota not found'; end if;
    if quota.allocated_base-quota.reserved_base-quota.consumed_base<requested then raise exception 'Project reagent quota exceeded'; end if;
    update public.project_reagent_quotas set reserved_base=reserved_base+requested,updated_at=now() where id=quota.id;
    insert into public.booking_reagent_reservations(booking_id,quota_id,requested_base,issued_base,state)
    values(booking_id,quota.id,requested,0,'confirmed');
  end loop;

  insert into public.audit_log(actor,action,entity,entity_id) values(coalesce(private.app_name(),'System'),'PROJECT_BOOKING_CONFIRMED','project_bookings',booking_id::text);
  return booking_id;
end $$;

-- Timestamps on v3.5 mutable records.
drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists trg_project_bookings_touch on public.project_bookings;
create trigger trg_project_bookings_touch before update on public.project_bookings for each row execute function public.touch_updated_at();
drop trigger if exists trg_project_quotas_touch on public.project_reagent_quotas;
create trigger trg_project_quotas_touch before update on public.project_reagent_quotas for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
commit;

-- MicroTrace v3.5: authenticated project scheduling, normalized scientific units,
-- and semantic inventory categories. This migration intentionally does not touch
-- public.demo_shared_requests or relax any existing live-data policy.
begin;

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Scientific units and normalized inventory values
-- ---------------------------------------------------------------------------
create table public.unit_definitions (
  code text primary key check (code ~ '^[A-Za-z0-9_]+$'),
  label text not null,
  symbol text not null,
  dimension text not null check (dimension in ('mass','volume','length','substance_amount','mass_concentration','molar_concentration','count')),
  scale_to_base numeric not null check (scale_to_base > 0),
  is_system boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.unit_definitions(code,label,symbol,dimension,scale_to_base,sort_order) values
 ('pg','Picogram','pg','mass',1e-12,10),('ng','Nanogram','ng','mass',1e-9,20),('ug','Microgram','µg','mass',1e-6,30),('mg','Milligram','mg','mass',1e-3,40),('g','Gram','g','mass',1,50),('kg','Kilogram','kg','mass',1e3,60),('Mg','Megagram','Mg','mass',1e6,70),('Gg','Gigagram','Gg','mass',1e9,80),
 ('pL','Picolitre','pL','volume',1e-12,10),('nL','Nanolitre','nL','volume',1e-9,20),('uL','Microlitre','µL','volume',1e-6,30),('mL','Millilitre','mL','volume',1e-3,40),('cL','Centilitre','cL','volume',1e-2,45),('dL','Decilitre','dL','volume',1e-1,48),('L','Litre','L','volume',1,50),('daL','Decalitre','daL','volume',1e1,55),('hL','Hectolitre','hL','volume',1e2,58),('kL','Kilolitre','kL','volume',1e3,60),('ML','Megalitre','ML','volume',1e6,70),('GL','Gigalitre','GL','volume',1e9,80),
 ('pm','Picometre','pm','length',1e-12,10),('A','Ångström','Å','length',1e-10,15),('nm','Nanometre','nm','length',1e-9,20),('um','Micrometre','µm','length',1e-6,30),('mm','Millimetre','mm','length',1e-3,40),('cm','Centimetre','cm','length',1e-2,45),('dm','Decimetre','dm','length',1e-1,48),('m','Metre','m','length',1,50),('km','Kilometre','km','length',1e3,60),('Mm','Megametre','Mm','length',1e6,70),('Gm','Gigametre','Gm','length',1e9,80),
 ('pmol','Picomole','pmol','substance_amount',1e-12,10),('nmol','Nanomole','nmol','substance_amount',1e-9,20),('umol','Micromole','µmol','substance_amount',1e-6,30),('mmol','Millimole','mmol','substance_amount',1e-3,40),('mol','Mole','mol','substance_amount',1,50),('kmol','Kilomole','kmol','substance_amount',1e3,60),
 ('pg_per_mL','Picogram per millilitre','pg/mL','mass_concentration',1e-9,10),('ng_per_mL','Nanogram per millilitre','ng/mL','mass_concentration',1e-6,20),('ug_per_mL','Microgram per millilitre','µg/mL','mass_concentration',1e-3,30),('mg_per_mL','Milligram per millilitre','mg/mL','mass_concentration',1,40),('mg_per_L','Milligram per litre','mg/L','mass_concentration',1e-3,45),('g_per_L','Gram per litre','g/L','mass_concentration',1,50),('kg_per_L','Kilogram per litre','kg/L','mass_concentration',1e3,60),
 ('pM','Picomolar','pM','molar_concentration',1e-12,10),('nM','Nanomolar','nM','molar_concentration',1e-9,20),('uM','Micromolar','µM','molar_concentration',1e-6,30),('mM','Millimolar','mM','molar_concentration',1e-3,40),('M','Molar','M','molar_concentration',1,50),
 ('pcs','Pieces','pcs','count',1,10),('units','Units','units','count',1,20),('pkts','Packets','pkts','count',1,30),('boxes','Boxes','boxes','count',1,40),('slants','Slants','slants','count',1,50),('sets','Sets','sets','count',1,60),('rolls','Rolls','rolls','count',1,70)
on conflict(code) do update set label=excluded.label,symbol=excluded.symbol,dimension=excluded.dimension,scale_to_base=excluded.scale_to_base,is_system=true,active=true,sort_order=excluded.sort_order;

create table public.inventory_categories (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  display_name text not null unique check (length(trim(display_name)) between 2 and 80),
  accent_hex text not null check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  icon_key text not null default 'flask-round',
  is_system boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.lab_members(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

insert into public.inventory_categories(key,display_name,accent_hex,icon_key,is_system) values
 ('growth_media','Media Prep / Growth Media','#F59E0B','wheat',true),
 ('acid','Acids / Corrosives','#EF4444','flask-conical',true),
 ('base','Bases / Alkalis','#3B82F6','beaker',true),
 ('general_reagent','General Reagents / Salts','#10B981','flask-round',true),
 ('biohazard','Biohazards / Toxins','#A855F7','biohazard',true),
 ('solvent','Solvents / Flammables','#EA580C','flame',true)
on conflict(key) do update set display_name=excluded.display_name,accent_hex=excluded.accent_hex,icon_key=excluded.icon_key,is_system=true,active=true;

alter table public.chemicals
  add column if not exists inventory_category_key text references public.inventory_categories(key) on delete restrict,
  add column if not exists unit_code text references public.unit_definitions(code),
  add column if not exists unit_dimension text check (unit_dimension in ('mass','volume','length','substance_amount','mass_concentration','molar_concentration','count')),
  add column if not exists min_stock_base numeric;

alter table public.containers
  add column if not exists qty_base numeric,
  add column if not exists unit_size_base numeric,
  add column if not exists unit_code text references public.unit_definitions(code),
  add column if not exists unit_dimension text check (unit_dimension in ('mass','volume','length','substance_amount','mass_concentration','molar_concentration','count')),
  add column if not exists qty_input_unit_code text references public.unit_definitions(code),
  add column if not exists unit_size_input_unit_code text references public.unit_definitions(code);

-- Backfill legacy catalog values without changing their visible qty/unit fields.
update public.chemicals set inventory_category_key = case
  when category='Culture Media' then 'growth_media'
  when storage_group='acid' then 'acid'
  when storage_group='base' then 'base'
  when storage_group in ('biohazard','toxic') or category='Culture' then 'biohazard'
  when storage_group='flammable' then 'solvent'
  else 'general_reagent'
end where inventory_category_key is null;

update public.chemicals set unit_code = case unit
  when 'µg' then 'ug' when 'ug' then 'ug' when 'mg' then 'mg' when 'g' then 'g' when 'kg' then 'kg'
  when 'µL' then 'uL' when 'uL' then 'uL' when 'mL' then 'mL' when 'L' then 'L'
  when 'pcs' then 'pcs' when 'units' then 'units' when 'pkts' then 'pkts' when 'boxes' then 'boxes'
  when 'slants' then 'slants' when 'sets' then 'sets' when 'rolls' then 'rolls'
  else 'pcs'
end where unit_code is null;

update public.chemicals c set
  unit_dimension=u.dimension,
  min_stock_base=c.min_stock*u.scale_to_base
from public.unit_definitions u where u.code=c.unit_code;

update public.containers c set
  unit_code=chem.unit_code,
  unit_dimension=chem.unit_dimension,
  qty_input_unit_code=chem.unit_code,
  unit_size_input_unit_code=chem.unit_code,
  qty_base=c.qty*u.scale_to_base,
  unit_size_base=c.unit_size*u.scale_to_base
from public.chemicals chem join public.unit_definitions u on u.code=chem.unit_code
where c.chemical_id=chem.id and c.unit_code is null;

alter table public.chemicals alter column inventory_category_key set not null;
alter table public.chemicals alter column unit_code set not null;
alter table public.chemicals alter column unit_dimension set not null;
alter table public.chemicals alter column min_stock_base set not null;
alter table public.containers alter column unit_code set not null;
alter table public.containers alter column unit_dimension set not null;
alter table public.containers alter column qty_base set not null;
alter table public.containers alter column unit_size_base set not null;

create or replace function private.normalize_scientific_inventory() returns trigger language plpgsql security definer set search_path = '' as $$
declare unit_row public.unit_definitions; chemical_row public.chemicals;
begin
  if tg_table_name='chemicals' then
    select * into unit_row from public.unit_definitions where code=new.unit_code and active;
    if not found then raise exception 'Unknown or inactive scientific unit'; end if;
    new.unit:=unit_row.symbol;
    new.unit_dimension:=unit_row.dimension;
    new.min_stock_base:=new.min_stock*unit_row.scale_to_base;
  else
    select * into chemical_row from public.chemicals where id=new.chemical_id;
    if not found then raise exception 'Chemical not found'; end if;
    select * into unit_row from public.unit_definitions where code=chemical_row.unit_code and active;
    if not found then raise exception 'Chemical has no valid scientific unit'; end if;
    new.unit_code:=unit_row.code;
    new.unit_dimension:=unit_row.dimension;
    new.qty_input_unit_code:=coalesce(new.qty_input_unit_code,unit_row.code);
    new.unit_size_input_unit_code:=coalesce(new.unit_size_input_unit_code,unit_row.code);
    new.qty_base:=new.qty*unit_row.scale_to_base;
    new.unit_size_base:=new.unit_size*unit_row.scale_to_base;
  end if;
  return new;
end $$;

drop trigger if exists normalize_chemical_scientific_unit on public.chemicals;
create trigger normalize_chemical_scientific_unit before insert or update of unit,unit_code,min_stock on public.chemicals
for each row execute function private.normalize_scientific_inventory();
drop trigger if exists normalize_container_scientific_unit on public.containers;
create trigger normalize_container_scientific_unit before insert or update of chemical_id,qty,unit_size,qty_input_unit_code,unit_size_input_unit_code on public.containers
for each row execute function private.normalize_scientific_inventory();

alter table public.audit_log
  add column if not exists category_snapshot text,
  add column if not exists category_color_snapshot text;

-- Authenticated read access and Staff/Principal-only category curation.
alter table public.unit_definitions enable row level security;
alter table public.inventory_categories enable row level security;
revoke all on public.unit_definitions,public.inventory_categories from public,anon,authenticated;
grant all on public.unit_definitions,public.inventory_categories to service_role;
grant select on public.unit_definitions,public.inventory_categories to authenticated;
grant insert,update,delete on public.inventory_categories to authenticated;
create policy units_read on public.unit_definitions for select to authenticated using ((select private.app_role()) is not null);
create policy category_read on public.inventory_categories for select to authenticated using ((select private.app_role()) is not null);
create policy category_write on public.inventory_categories for all to authenticated using ((select private.app_role()) in ('staff','principal')) with check ((select private.app_role()) in ('staff','principal'));

-- ---------------------------------------------------------------------------
commit;

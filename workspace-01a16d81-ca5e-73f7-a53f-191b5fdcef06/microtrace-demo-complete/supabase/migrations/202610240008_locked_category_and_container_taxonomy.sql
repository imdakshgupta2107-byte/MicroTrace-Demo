-- MicroTrace: strict visual taxonomy for inventory categories and physical vessels.
-- Adds classification metadata only. It does not alter roles, RLS policies or grants.
begin;

insert into public.inventory_categories(key, display_name, accent_hex, icon_key, is_system, active) values
  ('growth_media', 'Media Prep/Growth Media', '#F59E0B', 'wheat', true, true),
  ('acid', 'Acids', '#EF4444', 'flask-conical', true, true),
  ('base', 'Bases/Alkalis', '#3B82F6', 'beaker', true, true),
  ('general_reagent', 'General Reagents/Salts', '#10B981', 'flask-round', true, true),
  ('solvent', 'Solvents & Flammables', '#EA580C', 'flame', true, true),
  ('biohazard', 'Biohazards/Toxins', '#A855F7', 'biohazard', true, true),
  ('glassware', 'Glassware', '#06B6D4', 'flask-round', true, true),
  ('instrument', 'Instruments & Equipment', '#475569', 'microscope', true, true)
on conflict(key) do update set
  display_name = excluded.display_name,
  accent_hex = excluded.accent_hex,
  icon_key = excluded.icon_key,
  is_system = true,
  active = true;

alter table public.containers
  add column if not exists container_type text not null default 'storage_glassware';

alter table public.containers
  drop constraint if exists containers_container_type_check;
alter table public.containers
  add constraint containers_container_type_check check (container_type in (
    'volumetric_glassware', 'storage_glassware', 'amber_bottle',
    'plasticware', 'cryogenic_vial', 'metal_storage'
  ));

-- Classify legacy labels once. New UI writes the locked type key explicitly.
update public.containers
set container_type = case
  when lower(coalesce(label, '')) ~ '(cryo|freeze|cold[ -]?storage)' then 'cryogenic_vial'
  when lower(coalesce(label, '')) ~ '(amber|light[ -]?sensitive|brown bottle)' then 'amber_bottle'
  when lower(coalesce(label, '')) ~ '(graduated|volumetric|burette|cylinder)' then 'volumetric_glassware'
  when lower(coalesce(label, '')) ~ '(petri|microcentrifuge|falcon|plastic|test tube)' then 'plasticware'
  when lower(coalesce(label, '')) ~ '(stainless|metal|steel|autoclavable|drum|tray)' then 'metal_storage'
  else 'storage_glassware'
end
where container_type is null or container_type = 'storage_glassware';

create index if not exists containers_type_idx on public.containers(container_type);
commit;

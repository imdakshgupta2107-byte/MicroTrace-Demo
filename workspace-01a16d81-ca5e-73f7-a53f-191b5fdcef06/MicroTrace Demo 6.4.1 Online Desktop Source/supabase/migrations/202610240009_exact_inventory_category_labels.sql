-- Align the already locked demo taxonomy labels with the exact eight-category
-- product vocabulary. This changes metadata only; colors and access policies
-- remain unchanged.
begin;

update public.inventory_categories
set display_name = case key
  when 'growth_media' then 'Media Prep/Growth Media'
  when 'acid' then 'Acids'
  when 'base' then 'Bases/Alkalis'
  when 'general_reagent' then 'General Reagents/Salts'
  when 'solvent' then 'Solvents & Flammables'
  when 'biohazard' then 'Biohazards/Toxins'
  when 'glassware' then 'Glassware'
  when 'instrument' then 'Instruments & Equipment'
  else display_name
end
where key in (
  'growth_media', 'acid', 'base', 'general_reagent',
  'solvent', 'biohazard', 'glassware', 'instrument'
);

commit;

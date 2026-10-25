-- MicroTrace: fill every directly selectable scientific exponent from 10^-10 to 10^10.
-- Catalog-only change for the shared demo; no RLS, authentication or operational data changes.
begin;

insert into public.unit_definitions(code,label,symbol,dimension,scale_to_base,is_system,active,sort_order) values
  ('g_e_neg10','Ten to the minus ten grams','10⁻¹⁰ g','mass',1e-10,true,true,20),
  ('g_e_neg8','Ten to the minus eight grams','10⁻⁸ g','mass',1e-8,true,true,22),
  ('g_e_neg7','Ten to the minus seven grams','10⁻⁷ g','mass',1e-7,true,true,23),
  ('g_e_neg5','Ten to the minus five grams','10⁻⁵ g','mass',1e-5,true,true,25),
  ('g_e_neg4','Ten to the minus four grams','10⁻⁴ g','mass',1e-4,true,true,26),
  ('g_e4','Ten thousand grams','10⁴ g','mass',1e4,true,true,64),
  ('g_e5','One hundred thousand grams','10⁵ g','mass',1e5,true,true,65),
  ('g_e7','Ten million grams','10⁷ g','mass',1e7,true,true,67),
  ('g_e8','One hundred million grams','10⁸ g','mass',1e8,true,true,68),
  ('L_e_neg10','Ten to the minus ten litres','10⁻¹⁰ L','volume',1e-10,true,true,20),
  ('L_e_neg8','Ten to the minus eight litres','10⁻⁸ L','volume',1e-8,true,true,22),
  ('L_e_neg7','Ten to the minus seven litres','10⁻⁷ L','volume',1e-7,true,true,23),
  ('L_e_neg5','Ten to the minus five litres','10⁻⁵ L','volume',1e-5,true,true,25),
  ('L_e_neg4','Ten to the minus four litres','10⁻⁴ L','volume',1e-4,true,true,26),
  ('L_e4','Ten thousand litres','10⁴ L','volume',1e4,true,true,64),
  ('L_e5','One hundred thousand litres','10⁵ L','volume',1e5,true,true,65),
  ('L_e7','Ten million litres','10⁷ L','volume',1e7,true,true,67),
  ('L_e8','One hundred million litres','10⁸ L','volume',1e8,true,true,68)
on conflict(code) do update set label=excluded.label,symbol=excluded.symbol,dimension=excluded.dimension,scale_to_base=excluded.scale_to_base,is_system=true,active=true,sort_order=excluded.sort_order;

with exponents(exponent) as (
  select * from unnest(array[-10,-8,-7,-5,-4,-2,-1,1,2,4,5,6,7,8,9,10])
)
insert into public.unit_definitions(code,label,symbol,dimension,scale_to_base,is_system,active,sort_order)
select
  'g_per_L_e_' || case when exponent < 0 then 'neg' || abs(exponent)::text else exponent::text end,
  'Ten to the ' || case when exponent < 0 then 'minus ' || abs(exponent)::text else exponent::text end || ' grams per litre',
  '10^' || exponent::text || ' g/L', 'mass_concentration', power(10::numeric, exponent), true, true, 100 + exponent
from exponents
on conflict(code) do update set label=excluded.label,symbol=excluded.symbol,dimension=excluded.dimension,scale_to_base=excluded.scale_to_base,is_system=true,active=true,sort_order=excluded.sort_order;

with exponents(exponent) as (
  select * from unnest(array[-10,-8,-7,-5,-4,-2,-1,1,2,4,5,7,8,9,10])
)
insert into public.unit_definitions(code,label,symbol,dimension,scale_to_base,is_system,active,sort_order)
select
  'molar_e_' || case when exponent < 0 then 'neg' || abs(exponent)::text else exponent::text end,
  'Ten to the ' || case when exponent < 0 then 'minus ' || abs(exponent)::text else exponent::text end || ' molar',
  '10^' || exponent::text || ' M', 'molar_concentration', power(10::numeric, exponent), true, true, 130 + exponent
from exponents
on conflict(code) do update set label=excluded.label,symbol=excluded.symbol,dimension=excluded.dimension,scale_to_base=excluded.scale_to_base,is_system=true,active=true,sort_order=excluded.sort_order;

commit;

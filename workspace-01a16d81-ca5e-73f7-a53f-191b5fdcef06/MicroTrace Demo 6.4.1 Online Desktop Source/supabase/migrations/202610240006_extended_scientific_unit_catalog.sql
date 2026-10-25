-- MicroTrace: extended scientific unit catalog for universal calculator/input dropdowns.
-- Adds safe catalog entries only; it does not relax RLS or modify operational data.
begin;

insert into public.unit_definitions(code,label,symbol,dimension,scale_to_base,is_system,active,sort_order) values
  ('yg','Yoctogram','yg','mass',1e-24,true,true,1),
  ('zg','Zeptogram','zg','mass',1e-21,true,true,2),
  ('ag','Attogram','ag','mass',1e-18,true,true,3),
  ('fg','Femtogram','fg','mass',1e-15,true,true,5),
  ('cg','Centigram','cg','mass',1e-2,true,true,42),
  ('dg','Decigram','dg','mass',1e-1,true,true,44),
  ('dag','Decagram','dag','mass',1e1,true,true,52),
  ('hg','Hectogram','hg','mass',1e2,true,true,55),
  ('t','Metric tonne','t','mass',1e6,true,true,65),
  ('g_1e10','Ten-billion grams','10¹⁰ g','mass',1e10,true,true,85),
  ('Tg','Teragram','Tg','mass',1e12,true,true,90),
  ('Pg','Petagram','Pg','mass',1e15,true,true,95),
  ('oz','Ounce','oz','mass',28.349523125,true,true,46),
  ('lb','Pound','lb','mass',453.59237,true,true,57),

  ('yL','Yoctolitre','yL','volume',1e-24,true,true,1),
  ('zL','Zeptolitre','zL','volume',1e-21,true,true,2),
  ('aL','Attolitre','aL','volume',1e-18,true,true,3),
  ('fL','Femtolitre','fL','volume',1e-15,true,true,5),
  ('cm3','Cubic centimetre','cm³','volume',1e-3,true,true,41),
  ('m3','Cubic metre','m³','volume',1e3,true,true,62),
  ('L_1e10','Ten-billion litres','10¹⁰ L','volume',1e10,true,true,85),
  ('TL','Teralitre','TL','volume',1e12,true,true,90),
  ('gal_us','US gallon','gal (US)','volume',3.785411784,true,true,53),
  ('gal_imp','Imperial gallon','gal (Imp)','volume',4.54609,true,true,54),
  ('floz_us','US fluid ounce','fl oz (US)','volume',0.0295735295625,true,true,37),
  ('bbl_us','US barrel','bbl (US)','volume',158.987294928,true,true,57),

  ('ymol','Yoctomole','ymol','substance_amount',1e-24,true,true,1),
  ('zmol','Zeptomole','zmol','substance_amount',1e-21,true,true,2),
  ('amol','Attomole','amol','substance_amount',1e-18,true,true,3),
  ('fmol','Femtomole','fmol','substance_amount',1e-15,true,true,5),
  ('Mmol','Megamole','Mmol','substance_amount',1e6,true,true,60),
  ('Gmol','Gigamole','Gmol','substance_amount',1e9,true,true,70),

  ('fg_per_mL','Femtogram per millilitre','fg/mL','mass_concentration',1e-12,true,true,5),
  ('g_per_mL','Gram per millilitre','g/mL','mass_concentration',1e3,true,true,55),
  ('kg_per_m3','Kilogram per cubic metre','kg/m³','mass_concentration',1,true,true,51),
  ('g_per_gal_us','Gram per US gallon','g/gal (US)','mass_concentration',0.2641720523581484,true,true,48),

  ('fM','Femtomolar','fM','molar_concentration',1e-15,true,true,5),
  ('kM','Kilomolar','kM','molar_concentration',1e3,true,true,60),
  ('MM','Megamolar','MM','molar_concentration',1e6,true,true,70)
on conflict(code) do update set
  label=excluded.label,
  symbol=excluded.symbol,
  dimension=excluded.dimension,
  scale_to_base=excluded.scale_to_base,
  is_system=true,
  active=true,
  sort_order=excluded.sort_order;

commit;

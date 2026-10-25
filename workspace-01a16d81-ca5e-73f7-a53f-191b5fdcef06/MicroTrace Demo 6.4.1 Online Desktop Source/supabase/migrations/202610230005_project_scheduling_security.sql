-- MicroTrace v3.5 project scheduling security and Realtime policies.
begin;
-- Authenticated RLS only. No public/anon access is granted.
-- ---------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array[
    'projects','project_teams','project_members','hazard_zones','lab_benches','lab_resources','project_bookings','booking_resource_reservations','project_reagent_quotas','booking_reagent_reservations','hazard_classes','chemical_hazard_classes','hazard_compatibility_rules'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

grant select on public.hazard_zones,public.lab_benches,public.lab_resources,public.hazard_classes,public.chemical_hazard_classes,public.hazard_compatibility_rules to authenticated;
grant select,insert,update,delete on public.projects,public.project_teams,public.project_members,public.project_reagent_quotas to authenticated;
grant select on public.project_bookings,public.booking_resource_reservations,public.booking_reagent_reservations to authenticated;
create policy benches_read on public.lab_benches for select to authenticated using ((select private.app_role()) is not null);
create policy resources_read on public.lab_resources for select to authenticated using ((select private.app_role()) is not null);
create policy hazard_zone_read on public.hazard_zones for select to authenticated using ((select private.app_role()) is not null);
create policy hazard_class_read on public.hazard_classes for select to authenticated using ((select private.app_role()) is not null);
create policy chemical_hazard_read on public.chemical_hazard_classes for select to authenticated using ((select private.app_role()) is not null);
create policy hazard_rules_read on public.hazard_compatibility_rules for select to authenticated using ((select private.app_role()) is not null);

create policy benches_manage on public.lab_benches for all to authenticated using ((select private.app_role()) in ('staff','principal')) with check ((select private.app_role()) in ('staff','principal'));
create policy resources_manage on public.lab_resources for all to authenticated using ((select private.app_role()) in ('staff','principal')) with check ((select private.app_role()) in ('staff','principal'));

create policy projects_read on public.projects for select to authenticated using (private.project_can_access(id));
create policy projects_insert on public.projects for insert to authenticated with check ((select private.app_role()) in ('teacher','staff','principal') and research_lead_id=(select auth.uid()));
create policy projects_update on public.projects for update to authenticated using (private.project_can_manage(id)) with check (private.project_can_manage(id));
create policy projects_delete on public.projects for delete to authenticated using ((select private.app_role()) in ('staff','principal'));

create policy teams_read on public.project_teams for select to authenticated using (private.project_can_access(project_id));
create policy teams_write on public.project_teams for all to authenticated using (private.project_can_manage(project_id)) with check (private.project_can_manage(project_id));
create policy members_read on public.project_members for select to authenticated using (private.project_can_access(project_id));
create policy members_write on public.project_members for all to authenticated using (private.project_can_manage(project_id)) with check (private.project_can_manage(project_id));
create policy quotas_read on public.project_reagent_quotas for select to authenticated using (private.project_can_access(project_id));
create policy quotas_write on public.project_reagent_quotas for all to authenticated using (private.project_can_manage(project_id)) with check (private.project_can_manage(project_id));
create policy bookings_read on public.project_bookings for select to authenticated using (private.project_can_access(project_id));
create policy booking_resources_read on public.booking_resource_reservations for select to authenticated using (exists(select 1 from public.project_bookings b where b.id=booking_id and private.project_can_access(b.project_id)));
create policy booking_reagents_read on public.booking_reagent_reservations for select to authenticated using (exists(select 1 from public.project_bookings b where b.id=booking_id and private.project_can_access(b.project_id)));

revoke all on function public.create_project_booking(uuid,uuid,uuid,timestamptz,timestamptz,text,text,uuid[],jsonb) from public,anon;
grant execute on function public.create_project_booking(uuid,uuid,uuid,timestamptz,timestamptz,text,text,uuid[],jsonb) to authenticated;
revoke all on function private.project_can_access(uuid),private.project_can_manage(uuid),private.assert_booking_hazard_compatibility(),private.normalize_scientific_inventory() from public,anon;
grant execute on function private.project_can_access(uuid),private.project_can_manage(uuid) to authenticated,service_role;

-- Realtime remains scoped by the RLS policies above.
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['inventory_categories','projects','project_teams','lab_benches','lab_resources','project_bookings','project_reagent_quotas','booking_resource_reservations','booking_reagent_reservations'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;

commit;

begin;
create table private.sender_verifications(fingerprint text primary key,verified_at timestamptz not null);
create function private.record_sender_test() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.kind='test' and new.status='sent' and new.sender_fingerprint is not null then
  insert into private.sender_verifications values(new.sender_fingerprint,now()) on conflict(fingerprint) do update set verified_at=excluded.verified_at;
 end if; return new;
end $$;
create trigger remember_sender_test after update on public.email_outbox for each row when(new.status='sent' and old.status is distinct from new.status) execute function private.record_sender_test();
create function public.automation_sender_verified(p_fingerprint text,p_recent boolean default false) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from private.sender_verifications where fingerprint=p_fingerprint and (not p_recent or verified_at>now()-interval '24 hours'));
$$;
create function public.automation_directory() returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.full_name,'role',m.role,'email',u.email,'verified',u.email_confirmed_at is not null) order by m.full_name),'[]'::jsonb)
 from public.lab_members m join auth.users u on u.id=m.id where m.active and m.role in ('staff','principal');
$$;
create function public.automation_configure(p_actor uuid,p_settings jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare principal_ids uuid[];staff_ids uuid[];
begin
 if not exists(select 1 from public.lab_members where id=p_actor and active and role='principal') then raise exception 'Principal required'; end if;
 perform 1 from public.automation_settings where id for update;
 if (p_settings->>'expected_updated_at')::timestamptz is distinct from (select updated_at from public.automation_settings where id) then raise exception 'Settings changed; reload before saving'; end if;
 select coalesce(array_agg(value::uuid),'{}') into principal_ids from jsonb_array_elements_text(p_settings->'principal_recipient_ids');
 select coalesce(array_agg(value::uuid),'{}') into staff_ids from jsonb_array_elements_text(p_settings->'staff_recipient_ids');
 if exists(select 1 from unnest(principal_ids) as chosen(id) where not exists(select 1 from public.lab_members m join auth.users u on u.id=m.id where m.id=chosen.id and m.active and m.role='principal' and u.email_confirmed_at is not null)) then raise exception 'Select verified principal accounts only'; end if;
 if exists(select 1 from unnest(staff_ids) as chosen(id) where not exists(select 1 from public.lab_members m join auth.users u on u.id=m.id where m.id=chosen.id and m.active and m.role in ('staff','principal') and u.email_confirmed_at is not null)) then raise exception 'Select verified staff/principal accounts only'; end if;
 update public.automation_settings set delivery_enabled=false,activated_at=null,
  principal_recipient_ids=principal_ids,staff_recipient_ids=staff_ids,web_app_url=p_settings->>'web_app_url',
  weekly_enabled=(p_settings->>'weekly_enabled')::boolean,low_stock_enabled=(p_settings->>'low_stock_enabled')::boolean,expiry_enabled=(p_settings->>'expiry_enabled')::boolean,updated_at=now() where id;
 update public.email_outbox set status='cancelled',error_code='SETTINGS_CHANGED_REAPPROVAL_REQUIRED' where status='pending' and kind<>'test';
 insert into public.automation_events(actor_id,action) values(p_actor,'SETTINGS_SAVED_DELIVERY_PAUSED');
end $$;
create function public.automation_switch(p_actor uuid,p_enabled boolean,p_fingerprint text) returns void language plpgsql security definer set search_path = '' as $$
declare settings public.automation_settings;
begin
 if not exists(select 1 from public.lab_members where id=p_actor and active and role='principal') then raise exception 'Principal required'; end if;
 select * into settings from public.automation_settings where id for update;
 if p_enabled then
  if not exists(select 1 from private.automation_runner where id and last_tick>now()-interval '5 minutes') then raise exception 'Scheduler heartbeat required before activation'; end if;
  if settings.delivery_enabled then return; end if;
  if not public.automation_sender_verified(p_fingerprint,true) then raise exception 'Send a successful approved test within the last 24 hours first'; end if;
  if settings.web_app_url !~ '^https://[^/]+/?$' then raise exception 'Configure a hosted HTTPS app root first'; end if;
  if not(settings.weekly_enabled or settings.low_stock_enabled or settings.expiry_enabled) then raise exception 'Enable at least one rule'; end if;
  if settings.weekly_enabled and not exists(select 1 from public.lab_members m join auth.users u on u.id=m.id where m.id=any(settings.principal_recipient_ids) and m.active and m.role='principal' and u.email_confirmed_at is not null) then raise exception 'Choose a verified principal recipient'; end if;
  if (settings.low_stock_enabled or settings.expiry_enabled) and not exists(select 1 from public.lab_members m join auth.users u on u.id=m.id where m.id=any(settings.staff_recipient_ids) and m.active and m.role in ('staff','principal') and u.email_confirmed_at is not null) then raise exception 'Choose a verified staff recipient'; end if;
 end if;
 update public.automation_settings set delivery_enabled=p_enabled,activated_at=case when p_enabled then now() else null end,updated_at=now() where id;
 if not p_enabled then update public.email_outbox set status='cancelled',error_code='DELIVERY_PAUSED' where status='pending' and kind<>'test'; end if;
 insert into public.automation_events(actor_id,action) values(p_actor,case when p_enabled then 'DELIVERY_ACTIVATED' else 'DELIVERY_PAUSED' end);
end $$;
revoke all on function public.automation_sender_verified(text,boolean),public.automation_directory(),public.automation_configure(uuid,jsonb),public.automation_switch(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.automation_sender_verified(text,boolean),public.automation_directory(),public.automation_configure(uuid,jsonb),public.automation_switch(uuid,boolean,text) to service_role;
commit;

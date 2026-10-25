begin;
alter table private.automation_runner add column last_tick timestamptz;
create or replace function public.automation_lease() returns uuid language plpgsql security definer set search_path = '' as $$
declare token uuid;
begin
 update private.automation_runner set lease_until=now()+interval '180 seconds',lease_token=gen_random_uuid(),last_tick=now() where id and (lease_until is null or lease_until<now()) returning lease_token into token;
 return token;
end $$;
create function public.automation_heartbeat() returns timestamptz language sql stable security definer set search_path = '' as $$ select last_tick from private.automation_runner where id; $$;
revoke all on function public.automation_heartbeat() from public,anon,authenticated;
grant execute on function public.automation_heartbeat() to service_role;

create function public.automation_prepare_test(p_actor uuid,p_request_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare target_email text;existing public.email_outbox;
begin
 perform pg_advisory_xact_lock(hashtextextended('microtrace:test',0));
 select u.email into target_email from public.lab_members m join auth.users u on u.id=m.id where m.id=p_actor and m.active and m.role='principal' and u.email_confirmed_at is not null;
 if target_email is null then raise exception 'Verified principal account required'; end if;
 select * into existing from public.email_outbox where dedupe_key='test:'||p_request_id;
 if found then if existing.recipient_id<>p_actor then raise exception 'Test owner mismatch'; end if;return existing.id;end if;
 if exists(select 1 from public.email_outbox where kind='test' and status in ('processing','unknown')) then raise exception 'Review uncertain test in Gmail Sent before another test'; end if;
 if (select count(*) from public.email_outbox where kind='test' and recipient_id=p_actor and created_at>now()-interval '24 hours')>=5 then raise exception 'Five tests per day limit'; end if;
 insert into public.email_outbox(id,dedupe_key,recipient_id,recipient_email,kind) values(p_request_id,'test:'||p_request_id,p_actor,target_email,'test');
 insert into public.automation_events(actor_id,action) values(p_actor,'TEST_EMAIL_EXPLICITLY_APPROVED');
 return p_request_id;
end $$;
revoke all on function public.automation_prepare_test(uuid,uuid) from public,anon,authenticated;
grant execute on function public.automation_prepare_test(uuid,uuid) to service_role;

-- Purchase receipts are idempotent and atomic too.
create function public.receive_purchase(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare purchase public.purchase_orders;
begin
 if coalesce(private.app_role(),'') not in ('staff','principal') then raise exception 'Staff or principal required'; end if;
 select * into purchase from public.purchase_orders where id=p_id for update;
 if not found then raise exception 'Purchase order not found'; end if;
 if purchase.status='received' then return; end if;
 if purchase.status<>'ordered' then raise exception 'Only an ordered purchase can be received'; end if;
 perform set_config('microtrace.movement_kind','receipt',true);
 insert into public.containers(chemical_id,label,qty,unit_size,state,location) values(purchase.chemical_id,'PO receipt',purchase.packs*purchase.pack_size,purchase.packs*purchase.pack_size,'sealed','Receipt area');
 update public.purchase_orders set status='received',received_at=now() where id=p_id;
end $$;
revoke all on function public.receive_purchase(uuid) from public,anon;
grant execute on function public.receive_purchase(uuid) to authenticated;
commit;

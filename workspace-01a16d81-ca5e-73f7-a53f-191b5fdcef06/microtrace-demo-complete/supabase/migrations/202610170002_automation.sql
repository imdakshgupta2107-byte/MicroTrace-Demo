begin;
create table public.automation_settings (
 id boolean primary key default true check(id), delivery_enabled boolean not null default false,
 weekly_enabled boolean not null default true, low_stock_enabled boolean not null default true, expiry_enabled boolean not null default true,
 timezone text not null default 'Asia/Kolkata' check(timezone='Asia/Kolkata'),
 principal_recipient_ids uuid[] not null default '{}', staff_recipient_ids uuid[] not null default '{}',
 web_app_url text not null default '', activated_at timestamptz, updated_at timestamptz not null default now(),
 check(cardinality(principal_recipient_ids)<=20 and cardinality(staff_recipient_ids)<=20)
);
insert into public.automation_settings(id) values(true);
create table public.automation_jobs (job_key text primary key,kind text not null,created_at timestamptz not null default now(),details jsonb not null default '{}');
create table public.automation_reports (
 id uuid primary key default gen_random_uuid(), job_key text not null unique, kind text not null check(kind in ('weekly','daily')),
 period_start timestamptz not null, period_end timestamptz not null, content jsonb not null, created_at timestamptz not null default now()
);
create table public.automation_alerts (
 id uuid primary key default gen_random_uuid(),signal_key text not null,kind text not null check(kind in ('low_stock','expiry')),
 entity_id text not null,stage text not null,snapshot jsonb not null,
 first_seen timestamptz not null default now(),last_seen timestamptz not null default now(),resolved_at timestamptz
);
create unique index active_signal_unique on public.automation_alerts(signal_key) where resolved_at is null;
create table public.email_outbox (
 id uuid primary key default gen_random_uuid(),dedupe_key text not null unique,recipient_id uuid not null references auth.users(id),recipient_email text not null,
 kind text not null check(kind in ('weekly','daily','test')),report_id uuid references public.automation_reports(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','processing','sent','failed','unknown','cancelled')),
 attempts integer not null default 0,created_at timestamptz not null default now(),next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,sent_at timestamptz,provider_message_id text,error_code text,sender_fingerprint text
);
create index outbox_pending_idx on public.email_outbox(next_attempt_at) where status='pending';
create table public.automation_events (id bigint generated always as identity primary key,actor_id uuid references auth.users(id) on delete set null,action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create table private.automation_runner (id boolean primary key check(id),lease_until timestamptz,lease_token uuid);
insert into private.automation_runner values(true,null,null);

do $$ declare t text; begin
 foreach t in array array['automation_settings','automation_jobs','automation_reports','automation_alerts','email_outbox','automation_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.automation_reports,public.automation_alerts to authenticated;
create policy reports_read on public.automation_reports for select to authenticated using ((select private.app_role())='principal' or (kind='daily' and (select private.app_role())='staff'));
create policy alerts_read on public.automation_alerts for select to authenticated using ((select private.app_role()) in ('staff','principal'));
-- No authenticated client can write settings, delivery records, jobs, or reports.

create function public.automation_lease() returns uuid language plpgsql security definer set search_path = '' as $$
declare token uuid;
begin
 update private.automation_runner set lease_until=now()+interval '180 seconds',lease_token=gen_random_uuid() where id and (lease_until is null or lease_until<now()) returning lease_token into token;
 return token;
end $$;
create function public.automation_release(p_token uuid) returns void language sql security definer set search_path = '' as $$ update private.automation_runner set lease_until=null,lease_token=null where id and lease_token=p_token; $$;

create function public.automation_aggregate(p_start timestamptz,p_end timestamptz) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
 'pending_requests',(select count(*) from public.requests where status in ('pending','approved')),
 'unresolved_discrepancies',(select count(*) from public.discrepancies where status='reported'),
 'consumption',coalesce((select jsonb_agg(row_data) from (select jsonb_build_object('id',coalesce(chemical_id::text,'removed'),'name',chemical_name,'unit',unit,'quantity',sum(-delta)) as row_data from public.stock_movements where kind='issue' and delta<0 and occurred_at>=p_start and occurred_at<p_end group by chemical_id,chemical_name,unit order by chemical_name) s),'[]'::jsonb),
 'write_offs',coalesce((select jsonb_agg(row_data) from (select jsonb_build_object('id',coalesce(chemical_id::text,'removed'),'name',chemical_name,'unit',unit,'quantity',sum(-delta)) as row_data from public.stock_movements where kind='write_off' and delta<0 and occurred_at>=p_start and occurred_at<p_end group by chemical_id,chemical_name,unit order by chemical_name) s),'[]'::jsonb));
$$;

-- Atomic job + alert lifecycle + report + recipient-specific outbox insertion.
-- A repeated cron call cannot create the same job/delivery twice.
create function public.automation_record_job(p_job_key text,p_kind text,p_start timestamptz,p_end timestamptz,p_content jsonb,p_signals jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare settings public.automation_settings; job_inserted text; report_id uuid; signal jsonb; existing_id uuid; new_signals jsonb:='[]'; recipient record; keys text[]:='{}';
begin
 select * into settings from public.automation_settings where id for update;
 if not settings.delivery_enabled then return jsonb_build_object('status','disabled'); end if;
 if p_kind not in ('weekly','daily') then raise exception 'Invalid job kind'; end if;
 insert into public.automation_jobs(job_key,kind) values(p_job_key,p_kind) on conflict do nothing returning job_key into job_inserted;
 if job_inserted is null then return jsonb_build_object('status','duplicate'); end if;
 if p_kind='daily' then
  for signal in select value from jsonb_array_elements(p_signals) loop
   keys:=array_append(keys,signal->>'signal_key');
   select id into existing_id from public.automation_alerts where signal_key=signal->>'signal_key' and resolved_at is null;
   if existing_id is null then
    insert into public.automation_alerts(signal_key,kind,entity_id,stage,snapshot) values(signal->>'signal_key',signal->>'kind',signal->>'entity_id',signal->>'stage',signal);
    new_signals:=new_signals||jsonb_build_array(signal);
   else update public.automation_alerts set snapshot=signal,last_seen=now() where id=existing_id;
   end if;
  end loop;
  update public.automation_alerts set resolved_at=now() where resolved_at is null and not(signal_key=any(keys));
  if jsonb_array_length(new_signals)=0 then return jsonb_build_object('status','no_new_alerts'); end if;
  p_content:=jsonb_set(p_content,'{signals}',new_signals);
 end if;
 insert into public.automation_reports(job_key,kind,period_start,period_end,content) values(p_job_key,p_kind,p_start,p_end,p_content) returning id into report_id;
 for recipient in select m.id,u.email from public.lab_members m join auth.users u on u.id=m.id
  where m.active and u.email_confirmed_at is not null and u.email is not null and (
   (p_kind='weekly' and m.role='principal' and m.id=any(settings.principal_recipient_ids)) or
   (p_kind='daily' and m.role in ('staff','principal') and m.id=any(settings.staff_recipient_ids))) loop
  insert into public.email_outbox(dedupe_key,recipient_id,recipient_email,kind,report_id) values(p_job_key||':'||recipient.id,recipient.id,recipient.email,p_kind,report_id) on conflict do nothing;
 end loop;
 update public.automation_jobs set details=jsonb_build_object('report_id',report_id,'new_signals',jsonb_array_length(new_signals)) where job_key=p_job_key;
 return jsonb_build_object('status','recorded','report_id',report_id);
end $$;

create function public.automation_claim_mail(p_id uuid default null) returns setof public.email_outbox language plpgsql security definer set search_path = '' as $$
begin
 -- Never auto-resend a worker that died after making a potentially successful POST.
 update public.email_outbox set status='unknown',error_code='WORKER_LEASE_EXPIRED_REVIEW_SENT_FOLDER',lease_until=null where status='processing' and lease_until<now();
 return query with chosen as (
  select e.id from public.email_outbox e join public.automation_settings s on s.id join public.lab_members m on m.id=e.recipient_id and m.active join auth.users u on u.id=e.recipient_id
  where e.status='pending' and e.next_attempt_at<=now() and (p_id is null or e.id=p_id)
    and u.email_confirmed_at is not null and u.email=e.recipient_email
    and ((e.kind='test' and e.created_at>now()-interval '5 minutes' and m.role='principal') or
       (s.delivery_enabled and ((e.kind='weekly' and m.role='principal' and m.id=any(s.principal_recipient_ids)) or (e.kind='daily' and m.role in ('staff','principal') and m.id=any(s.staff_recipient_ids)))))
  order by e.created_at,e.id for update of e skip locked limit 2
 ) update public.email_outbox e set status='processing',attempts=attempts+1,lease_until=now()+interval '5 minutes' from chosen where e.id=chosen.id returning e.*;
end $$;

create function public.automation_retention() returns void language plpgsql security definer set search_path = '' as $$
begin
 delete from public.email_outbox where status in ('sent','failed','cancelled') and created_at<now()-interval '90 days';
 delete from public.automation_reports r where created_at<now()-interval '180 days' and not exists(select 1 from public.email_outbox e where e.report_id=r.id);
 delete from public.automation_alerts where resolved_at<now()-interval '90 days';
 delete from public.automation_jobs where created_at<now()-interval '90 days';
 delete from public.automation_events where created_at<now()-interval '180 days';
end $$;

revoke all on function public.automation_lease(),public.automation_release(uuid),public.automation_aggregate(timestamptz,timestamptz),public.automation_record_job(text,text,timestamptz,timestamptz,jsonb,jsonb),public.automation_claim_mail(uuid),public.automation_retention() from public,anon,authenticated;
grant execute on function public.automation_lease(),public.automation_release(uuid),public.automation_aggregate(timestamptz,timestamptz),public.automation_record_job(text,text,timestamptz,timestamptz,jsonb,jsonb),public.automation_claim_mail(uuid),public.automation_retention() to service_role;
commit;

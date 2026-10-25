-- Temporary shared PIN-demo transport only.
-- This deliberately permits anonymous request CRUD so PIN-mode browsers can share
-- requests without email accounts. It is not appropriate for real laboratory data.
begin;

create table if not exists public.demo_shared_requests (
  id uuid primary key default gen_random_uuid(),
  chemical_id text not null,
  container_id text,
  qty numeric not null check (qty > 0),
  purpose text not null check (length(trim(purpose)) between 1 and 500),
  requester text not null check (length(trim(requester)) between 1 and 120),
  requester_role text not null check (requester_role in ('student','teacher','staff','principal')),
  status text not null default 'pending' check (status in ('pending','approved','issued','returned','rejected','withdrawn')),
  decided_by text,
  note text,
  requested_at timestamptz not null default now(),
  issued_at timestamptz,
  return_due date,
  returned_at timestamptz,
  created_by_device text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists demo_shared_requests_requested_at_idx
  on public.demo_shared_requests (requested_at desc);
alter table public.demo_shared_requests enable row level security;
revoke all on public.demo_shared_requests from public, anon, authenticated;
grant select, insert, update, delete on public.demo_shared_requests to anon;

drop policy if exists demo_shared_requests_select on public.demo_shared_requests;
drop policy if exists demo_shared_requests_insert on public.demo_shared_requests;
drop policy if exists demo_shared_requests_update on public.demo_shared_requests;
drop policy if exists demo_shared_requests_delete on public.demo_shared_requests;
create policy demo_shared_requests_select on public.demo_shared_requests for select to anon using (true);
create policy demo_shared_requests_insert on public.demo_shared_requests for insert to anon with check (true);
create policy demo_shared_requests_update on public.demo_shared_requests for update to anon using (true) with check (true);
create policy demo_shared_requests_delete on public.demo_shared_requests for delete to anon using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'demo_shared_requests'
  ) then
    alter publication supabase_realtime add table public.demo_shared_requests;
  end if;
end $$;

commit;

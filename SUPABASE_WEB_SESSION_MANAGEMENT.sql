-- Yuki Yoshikawa v6.0.1 web account-center audit storage.
-- Run once in the Supabase SQL Editor before deploying the upgraded web panel.
create table if not exists public.wa_web_session_audit (
  id uuid primary key default gen_random_uuid(),
  owner_number text not null,
  action text not null,
  session_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wa_web_session_audit_owner_created_idx
  on public.wa_web_session_audit (owner_number, created_at desc);
create index if not exists wa_web_session_audit_session_idx
  on public.wa_web_session_audit (session_id, created_at desc);

alter table public.wa_web_session_audit enable row level security;
revoke all on public.wa_web_session_audit from anon, authenticated;
grant all on public.wa_web_session_audit to service_role;

comment on table public.wa_web_session_audit is
  'Append-only owner-scoped audit trail for Yuki web pairing and individual WhatsApp session logout actions.';

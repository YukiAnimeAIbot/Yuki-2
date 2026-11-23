-- Yuki durable storage schema. Run in Supabase SQL Editor using the project owner.
create table if not exists public.bot_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.bot_bans (
  jid text primary key,
  reason text not null default 'No reason provided',
  banned_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.group_settings (
  group_jid text primary key check (group_jid like '%@g.us'),
  settings jsonb not null default '{}'::jsonb,
  authorization jsonb,
  updated_at timestamptz not null default now()
);
alter table public.bot_state enable row level security;
alter table public.bot_bans enable row level security;
alter table public.group_settings add column if not exists authorization jsonb;
alter table public.group_settings enable row level security;
revoke all on public.bot_state from anon, authenticated;
revoke all on public.bot_bans from anon, authenticated;
revoke all on public.group_settings from anon, authenticated;
grant all on public.bot_state to service_role;
grant all on public.bot_bans to service_role;
grant all on public.group_settings to service_role;

-- Persistent, privacy-scoped Yuki memory. Service-role access only.
create table if not exists public.yuki_memories (
  scope text not null check (scope in ('user','group')),
  scope_id text not null,
  memory jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (scope, scope_id)
);
alter table public.yuki_memories enable row level security;
revoke all on public.yuki_memories from anon, authenticated;
grant all on public.yuki_memories to service_role;
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

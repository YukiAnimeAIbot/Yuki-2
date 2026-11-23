# Supabase and MEGA storage — v5.4.0

## Active storage

- `bot_state`: bot state, encrypted WhatsApp auth snapshots and other durable state.
- `group_settings`: per-group settings and authorization.
- `bot_bans`: global bot bans.
- MEGA: custom menu media bytes.
- Supabase: menu media reference, MIME type, size and update timestamp.

## Setup

1. Run `SUPABASE_STORAGE_SCHEMA.sql` in Supabase.
2. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the hosting environment.
3. Configure `MEGA_EMAIL` and `MEGA_PASSWORD` to enable custom menu uploads.
4. Review `SUPABASE_CLEANUP_REMOVED_SYSTEMS.sql` before executing its targeted destructive cleanup.

The removed profile storage is not required by this build. No live Supabase or MEGA account test has been performed in this workspace.

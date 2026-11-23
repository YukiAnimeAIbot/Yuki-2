# Persistence and cleanup — v5.4.0

- Supabase `bot_state` remains the durable store for bot state and WhatsApp authentication.
- `group_settings` remains the durable store for per-group configuration and authorization.
- `bot_bans` remains the durable bot-ban store.
- MEGA stores custom menu media bytes; Supabase stores the active reference and metadata.
- The only configured Owner is `OWNER_NUMBER`; owner identities are not loaded from a dynamic database list.
- Group membership is never removed automatically by application code. Only explicit Owner `/leave` invokes `groupLeave`.
- Removed profile, AFK, download/conversion, message-control and dynamic-owner systems are not initialized by the runtime.

Apply `SUPABASE_STORAGE_SCHEMA.sql` for the active core schema. Review `SUPABASE_CLEANUP_REMOVED_SYSTEMS.sql` before applying its destructive cleanup.

Validation: `npm test` and `npm run security-audit` pass in the source workspace. Live WhatsApp, Supabase, MEGA and third-party provider tests require deployment credentials and have not been performed here.

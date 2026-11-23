# v5.4.1 Repair and deployment verification

## Repairs applied
- Added AES-256-GCM encryption for WhatsApp auth credentials and Signal key snapshots stored in Supabase `bot_state`.
- Added strict validation for `AUTH_SNAPSHOT_ENCRYPTION_KEY` (32 bytes, supplied as 64 hex characters or canonical base64).
- Added transparent in-place migration for legacy plaintext auth snapshots. The encryption key must be set before startup and retained permanently.
- Unified `SUPABASE_STORAGE_SCHEMA.sql`, `SUPABASE_CLEAN_CANONICAL.sql`, `SUPABASE_COMPLETE.sql`, and `SUPABASE_FRESH_ALL.sql`; each now creates all runtime-required tables: `bot_state`, `bot_bans`, and `group_settings`.
- Removed the heavily obfuscated third-party audio adapter. `/play` search remains, but audio sending is intentionally disabled until a reviewed provider is configured.
- Changed the health endpoint to return HTTP 503 while startup is incomplete and HTTP 200 only after database checks, state hydration, session restoration, and Telegram initialization have run.
- Updated version labels, package metadata, lockfile root metadata, security audit and tests.

## Checks completed locally
- `node --check` for runtime JavaScript modules.
- `node scripts/auth-crypto-test.js`: AES-GCM round-trip, legacy snapshot detection, wrong-key rejection, malformed-key rejection, and tamper rejection.
- `node scripts/security-audit.js`.
- `node scripts/permission-smoke-test.js`.
- `npm test`.

## Required before production
1. Generate and set a persistent `AUTH_SNAPSHOT_ENCRYPTION_KEY` in Render. Do not change it later.
2. Back up Supabase, then apply one canonical schema file (recommended: `SUPABASE_STORAGE_SCHEMA.sql`). Do not run the optional cleanup SQL unless its deletions are intended.
3. Confirm Supabase service-role credentials and table access in the actual project.
4. Complete a clean `npm ci` with registry access and inspect `npm audit` results.
5. Test WhatsApp pairing/reconnect, Telegram pairing, Groq, MEGA and all commands against staging credentials.
6. Do not enable audio playback until a trusted provider is integrated and independently reviewed.

## Important migration behavior
Legacy plaintext auth snapshots are encrypted in place the first time they are read, but only if the same persistent encryption key is configured. Take a database backup first. If the key is lost or changed, encrypted WhatsApp sessions cannot be restored; users will need to pair again.

## Release status
Static tests pass. Live integrations and production deployment are not certified because this environment has no access to the user's Supabase, WhatsApp, Telegram, Groq, MEGA or Render credentials.


## v5.5.1 follow-up repair pass (2026-11-16)
- Corrected group-admin warning permissions and protected peer admins from moderation by another group admin.
- Supabase is explicitly mandatory; startup validates configuration and required tables before hydrating state. `SUPABASE_REQUIRED=false` is unsupported and fails with a clear error.
- Regression tests and security audit pass. A fresh `npm ci` timed out in the audit environment, so repeat it with reliable registry access before production.

## v6.0.1 Web Account Center migration

Before deploying v6.0.1, run `SUPABASE_WEB_SESSION_MANAGEMENT.sql` in the Supabase SQL Editor. Configure `OWNER_NUMBER` and a private `YUKI_WEB_ADMIN_TOKEN` of at least 32 characters. Keep `AUTH_SNAPSHOT_ENCRYPTION_KEY` unchanged. After deploy, test a fresh pairing, session restoration after restart, and individual logout with at least two linked sessions.

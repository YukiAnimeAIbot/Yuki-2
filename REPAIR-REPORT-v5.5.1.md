# Yuki v5.5.1 Repair Report

## Applied repairs
- Reconciled the complete `groups.json` snapshot with Supabase `group_settings`, deleting stale group rows before upserting current rows.
- Restricted Telegram `/pair` and `/unpair` to private chats.
- Removed WhatsApp phone numbers and pairing codes from application logs.
- Added failure cleanup for Supabase auth initialization, socket construction, and failed pairing-code requests so session locks do not remain stuck.
- Updated the pinned `libsignal` lockfile URL from SSH to HTTPS and installed `git` in the Docker image for Git-based npm dependencies.
- Simplified Docker dependency installation to a deterministic `npm ci` without mutating the lockfile during image build.
- Added `/health`, `/ready`, and `/live` endpoints; Render's health check now uses `/health`.
- Improved optional HTTPS uptime-heartbeat handling, configurable interval, startup timing, and transition-only logging.
- Kept the Render service plan set to `free`. No paid plan or always-on claim is configured.
- Corrected `/play` documentation to state that search is available but audio delivery is disabled.
- Clarified that bot-wide ban commands are Owner-only in this build; inactive global moderator/guidance stubs are not advertised as active roles.

## Deployment notes
- Keep `AUTH_SNAPSHOT_ENCRYPTION_KEY` unchanged across deployments.
- Configure `UPTIME_MONITOR_URL` only with an HTTPS heartbeat/webhook URL. For polling monitors, monitor `https://YOUR-SERVICE.onrender.com/health` externally instead.
- Render Free services may sleep when idle and can have cold starts. An external monitor polling `/health` every 5 minutes can provide inbound traffic to reduce idle spin-down; the app-side heartbeat is outbound and does not keep Render awake. External monitoring still cannot guarantee uninterrupted availability.
- Run `npm ci`, `npm test`, and `npm run security-audit` before deployment; then verify Supabase and live WhatsApp/Telegram integrations using real credentials.


## v5.5.1 follow-up repair pass (2026-11-16)
- Fixed `/warn` and `/clearwarn`: real WhatsApp group admins can now moderate ordinary members even though both have the same internal `member` role.
- Added target-admin checks to `/warn`, `/clearwarn`, `/promote`, `/demote`, and `/kick`; ordinary group admins cannot moderate peer admins.
- Preserved the configured Owner exception for group-admin targets while preventing self-moderation and moderation of another configured Owner.
- Made the Supabase startup contract explicit. Supabase is mandatory for durable bot state and encrypted WhatsApp auth; startup now checks configuration, connectivity, and all required tables before state hydration. `SUPABASE_REQUIRED=false` now fails immediately with a clear explanation instead of failing later during hydration/session restore.
- Added regression coverage for warning permissions and target hierarchy.
- Added the `/gs` command to the standalone command reference.

## Follow-up verification
- `npm test` passed after the repair pass, including AES-GCM tests, permission smoke tests, upgrade smoke tests, and JavaScript syntax checks.
- `npm run security-audit` passed.
- All four canonical Supabase SQL files are byte-identical and include the runtime tables `bot_state`, `bot_bans`, `group_settings`, and `yuki_memories`.
- A fresh `npm ci --no-audit --no-fund` could not be completed in this environment because the command timed out. It must be rerun in an environment with reliable npm registry access before deployment certification.
- Live Supabase, WhatsApp, Telegram, Groq, MEGA, and Render tests remain unverified because this repair environment does not have the deployment credentials.

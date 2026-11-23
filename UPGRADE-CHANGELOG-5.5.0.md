# Yuki v5.5.0 — approved upgrade

## Included
- Added Supabase-backed, scope-separated user/group memory records.
- Added `/memories`, Owner-only `/memory`, and Owner-only `/memoryclear` with explicit confirmation for full deletion.
- Added configurable `OWNER_DISPLAY_NAME` for Yuki’s verified Creator/Owner address style.
- Added Owner-only `/identity`, `/botinfo`, `/connection`, `/session` status commands.
- Added `/gs` group-system status and actual-group-admin `/active` and `/inactive` controls.
- Added `/search <query>` with Brave Search support and a limited keyless DuckDuckGo instant-answer fallback.
- Tightened direct-name addressing so incidental mentions of the word Yuki do not automatically trigger AI.
- Removed the default 5–10 second AI delay; configurable delay remains available.
- Restricted Telegram WhatsApp pairing to configured Telegram administrators; the public-pairing environment flag cannot bypass this restriction.
- Added the `yuki_memories` schema to all canonical Supabase SQL install files.
- Restored public `/invite` requests (Yuki still needs group-admin rights to fetch the real link).
- Existing menu image and existing features were retained.

## Required deployment action
Run the updated Supabase SQL schema before starting the new version. Configure `OWNER_NUMBER`, `TELEGRAM_ADMIN_ID`, Supabase credentials, Groq credentials and MEGA credentials in the hosting environment.

## Not claimed as live-tested
WhatsApp, Telegram, Groq, Supabase, MEGA and hosting integrations require real credentials and live accounts. The package-level tests validate syntax, crypto, security checks and local permission smoke tests only.

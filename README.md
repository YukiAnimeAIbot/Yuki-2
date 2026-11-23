# Ink Yuki WhatsApp Bot v6.0.0

Node.js WhatsApp bot with Groq-powered Yuki AI, group administration and moderation, anime/manga lookup, `/play` music search (audio delivery temporarily disabled pending a vetted provider), Telegram pairing, MEGA menu-media storage, scoped persistent memory, web search and Supabase persistence.

## Active commands
See `YUKI-COMMANDS.md` for the complete command list. `/` is the only command prefix.

## Retained systems
- Groq AI and Yuki personality with bundled AI reaction stickers
- WhatsApp Baileys connection, AES-256-GCM encrypted auth snapshots and Supabase session restoration
- Private Telegram pairing restricted to configured `TELEGRAM_ADMIN_ID` accounts
- Single Owner configured only with `OWNER_NUMBER`
- `/join`, `/leave`, `/groups` with explicit Owner authorization
- No automatic group leaving; only explicit Owner `/leave` calls `groupLeave`
- Per-group Yuki on/off state with `/active` and `/inactive` admin aliases
- Supabase-scoped user/group memories: `/memories`, Owner-only `/memory`, `/memoryclear`
- Owner-only `/identity`, `/botinfo`, `/connection`, `/session` status commands
- `/search <query>` using Tavily when `TAVILY_API_KEY` is configured, optional Brave Search secondary provider, and DuckDuckGo Instant Answers as the keyless fallback
- Group management, anti-link, anti-word, warnings, mute and bans
- Text welcome/goodbye messages
- `/play` YouTube search; audio delivery is intentionally disabled until a trusted provider is configured
- Anime and manga search/information commands
- `/setmenuimage` and `/menu` with MEGA-backed media and Supabase metadata
- Render/Docker hosting, health endpoint and uptime support

## Removed systems
Legacy profile-management system, AFK, `/test`, `/bots`, `/admins`, all download/media conversion commands except `/play`, automatic link downloads, `/antigcstatus`, `/msgs`, welcome/goodbye image setters, and dynamic owner management. Their runtime modules and command routes have been removed.

## Setup
1. Use Node.js 20 or newer.
2. Install with `npm ci`.
3. Supabase is mandatory in this release; do not set `SUPABASE_REQUIRED=false`. Configure `OWNER_NUMBER`, optional `OWNER_DISPLAY_NAME`, `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SNAPSHOT_ENCRYPTION_KEY`, `MEGA_EMAIL`, and `MEGA_PASSWORD` in hosting environment settings. Set `TELEGRAM_ADMIN_ID` for private Telegram pairing. Optionally set `TAVILY_API_KEY` for primary full web search; `BRAVE_SEARCH_API_KEY` remains an optional secondary provider. If neither key is configured, `/search` uses limited DuckDuckGo Instant Answers. Generate the encryption key once with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; keep the same value permanently across deployments and backups.
4. Configure Telegram credentials only when using Telegram pairing.
5. Run the updated `SUPABASE_STORAGE_SCHEMA.sql` in Supabase before first launch; it now creates the `yuki_memories` table required by v5.5.1. The other three install-schema filenames now contain the same canonical schema.
6. Run `npm test` and `npm run security-audit` before deployment. The `/health` and `/ready` endpoints return HTTP 503 until startup and database checks have completed; `/live` reports process liveness. Render uses `/health` for its health check. The Render plan remains `free`.

## Memory and search
User memories are limited to harmless anime, manga, character, genre and community preferences. `/memories` only returns the requesting user’s record. `/memory` and `/memoryclear` are Owner-only; clearing all records requires `/memoryclear all confirm`. Group memory stores only the group name/context, never a member’s private memory.

`/search <query>` tries Tavily first when `TAVILY_API_KEY` is configured, then optional Brave Search when `BRAVE_SEARCH_API_KEY` is configured. If a configured provider fails or returns no results, Yuki falls back to DuckDuckGo Instant Answers. Without either API key, DuckDuckGo is used directly; it provides limited instant-answer summaries, not a full web search index. Search-provider failures do not prevent the bot from starting.


## Uptime monitoring (Render Free)

The Render service remains on the **Free** plan. The app exposes:
- `https://YOUR-SERVICE.onrender.com/health` — readiness check (HTTP 200 only after startup and Supabase checks pass; otherwise HTTP 503).
- `https://YOUR-SERVICE.onrender.com/ready` — same readiness result.
- `https://YOUR-SERVICE.onrender.com/live` — process liveness (HTTP 200 while the process is running).

For an external polling monitor such as UptimeRobot, create an HTTPS monitor for `/health` at a 5-minute interval. `UPTIME_MONITOR_URL` is optional and is for heartbeat/webhook services (for example, a heartbeat URL supplied by your monitoring provider); when set, Yuki sends an HTTPS GET after startup and every `UPTIME_MONITOR_INTERVAL_MS` milliseconds (default 300000, minimum 60000). Do not set it to Yuki's own `/health` URL. Render Free services spin down after 15 minutes without inbound traffic. An external HTTP monitor polling `/health` every 5 minutes sends inbound requests and can prevent idle spin-down while the monitor is operating. This is not a guarantee of uninterrupted availability: Render can still restart or suspend a Free service, and the first request after an idle spin-down can otherwise have a cold start. The app-side `UPTIME_MONITOR_URL` heartbeat is outbound and does not keep this Render service awake.

## Menu media
Use `/setmenuimage` with attached or quoted image, video, audio, document or sticker media (maximum 50 MB). MEGA stores media bytes; Supabase stores the active media reference and metadata. `/menu` sends the saved media and the full command menu. If no uploaded media is configured, `assets/menu.jpg` is used.

## Group membership guarantee
The application has no automatic group-leave path. Only the configured Owner can invoke `/leave` to call WhatsApp's group-leave operation. The bot cannot prevent an external group administrator or WhatsApp from removing/disconnecting it.

## Database cleanup
`SUPABASE_CLEANUP_REMOVED_SYSTEMS.sql` removes the profile-system tables and only the obsolete state keys/settings associated with removed features. Review it before running; SQL changes are destructive and are not executed by this package.

## Upgrade notes (v5.5.1)
- The original bundled `assets/menu.jpg` is preserved.
- The sticker collection was deduplicated from 532 files to 360 unique WebP files and each remaining sticker has a mood manifest entry.
- Default artificial AI reply delay is now zero; command/provider/group anti-flood limits remain.
- Numeric WhatsApp LIDs are no longer reported as phone numbers.
- `PUBLIC_PAIRING=true` cannot bypass the Telegram administrator allowlist.

## Security repair notes (v5.4.1)
- WhatsApp credentials and Signal keys are now encrypted with AES-256-GCM before Supabase storage. Existing plaintext snapshots are migrated in place on first read when the encryption key is configured. Do not rotate or lose `AUTH_SNAPSHOT_ENCRYPTION_KEY`; without it existing linked sessions cannot be decrypted.
- The prior obfuscated audio-provider module has been removed. `/play` search remains, but audio delivery is fail-closed until a trusted, documented provider is added.
- `SUPABASE_CLEANUP_REMOVED_SYSTEMS.sql` remains optional and destructive. Back up the database and review it before execution.


## Yuki Account Center (new)

The root URL (`/`) serves the responsive Yuki pairing and session-management page. Existing health checks remain available at `/health`, `/ready`, and `/live`.

Set `YUKI_WEB_ADMIN_TOKEN` in the hosting environment to a randomly generated secret of at least 32 characters. Keep it private. The website asks the Owner to enter this token; the backend verifies it before pairing, listing sessions, or logging out a session. Do not put the token in public source control. Pairing uses the existing Baileys connection and encrypted Supabase auth-state store. Session listing and logout are restricted to saved session IDs, and logout affects only the selected session.

The activity lists use the last 7 days as the active window. Members with no observed message activity are included in the inactive/untracked list. Anti-link warnings are stored in the existing Supabase-backed `group_settings.settings.warns` state and are retained after the fourth-warning removal.


Note: `/play` keeps its existing search and command routing. If the trusted audio adapter is not configured, Yuki shares the official track link; direct MP3 delivery remains disabled until an approved provider is configured. See `YUKI_UPGRADE_NOTES.md`.


## Yuki v6.0.0

See `YUKI-V6-CHANGELOG.md` for the v6 feature list, Groq vision configuration, test coverage and deployment notes. The new default vision model is `qwen/qwen3.8-27b`; configure `GROQ_API_KEY` and ensure that model is enabled for the Groq project.

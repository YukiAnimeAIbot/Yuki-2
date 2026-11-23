# Yuki v6.0.0 — Advanced Evolution

## Implemented in this release
- Introduced modular core command runtime, access-control helpers, AI metrics, Groq vision utilities, response layouts and resource counters.
- Centralized Owner identity normalization without changing the configured Owner number.
- Added Groq vision support for stickers directly quoted/replied to by a user. The bot downloads the quoted sticker through Baileys, enforces a configurable size limit, and submits it as a data URL to the configured Groq vision model.
- Vision requests use `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`) and do not silently fall back to text-only models.
- Added AI request/failure/latency counters, approximate Groq request-payload byte accounting, inbound quoted-sticker byte accounting, and a bounded sticker image limit. These counters are diagnostic estimates, not Render billing-meter totals.
- Added per-message failure isolation with a user-facing error for failed slash commands.
- Updated menu branding and package version to 6.0.0.
- Preserved the existing sticker library, one-sticker-after-successful-AI-reply behavior, broadcast implementation, WhatsApp/Telegram/Supabase/MEGA integrations and existing command handlers.

## Environment additions
- `GROQ_VISION_MODEL=qwen/qwen3.8-27b`
- `GROQ_REQUEST_TIMEOUT_MS=25000`
- `GROQ_MAX_IMAGE_BYTES=8388608`

## Important deployment notes
- Configure `GROQ_API_KEY` and ensure the key has access to `qwen/qwen3.8-27b`.
- Keep existing Supabase and `AUTH_SNAPSHOT_ENCRYPTION_KEY` values unchanged.
- Existing text model IDs are configurable. Review Groq's current model catalogue before changing them.
- This package can be syntax- and regression-tested locally, but live WhatsApp, Groq, Telegram, Supabase and MEGA behavior requires deployment credentials and a real connected session.

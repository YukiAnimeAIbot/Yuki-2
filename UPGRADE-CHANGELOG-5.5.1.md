# Yuki v5.5.1 — repair release

- Fixed stale Supabase group-setting rows so removed groups stay removed after restart.
- Restricted Telegram pairing and unpairing to private chats.
- Removed pairing credentials and phone numbers from logs.
- Added failure-safe cleanup for connection initialization and pairing failures.
- Fixed Docker build prerequisites for the pinned Git-based `libsignal` dependency and made lockfile installation deterministic.
- Added readiness, liveness and configurable external heartbeat monitoring.
- Kept Render on the Free plan.
- Corrected `/play` documentation and Owner-only ban-role documentation.

# Fixes and validation — v5.4.0

- Removed obsolete command routes and runtime integrations requested for this build.
- Replaced dynamic Owner storage with a single `OWNER_NUMBER` environment value.
- Removed all automatic `groupLeave` paths; the only remaining call is inside explicit Owner `/leave`.
- Updated menu media handling and complete command menu.
- Added targeted Supabase cleanup SQL for profile-only tables and obsolete state keys/settings.
- Added regression tests for removed commands, Owner-only join/leave and no automatic leaving.

Validation completed: JavaScript syntax checks, permission smoke tests and security audit pass. Live WhatsApp, Supabase, MEGA and third-party provider validation remains a deployment-time check.

# Ink Yuki 5.3.4 — Upgrade Changelog

## Command routing and responses
- Standardized command recognition to `/` only; `#` is no longer an accepted command prefix.
- Changed unknown slash-command response to “No such command baka!” with a cute Yuki-style menu hint.
- Added a shared cute Yuki response wrapper for feature and fun/anime text responses.
- Added a working menu constant and rotating image/text menu handler; these were referenced by the existing source but were missing.

## Permissions
- Bot Owner remains the global exception for bot commands and systems.
- Group management checks now compare actual WhatsApp participant admin flags within the current group.
- Fixed a permission bug: the admin checker called `.some()` on a `Set`, causing actual group admins to be rejected. It now spreads the set before checking participant identities.
- Group/Owner-only denial text now uses the requested cute Yuki message and does not explain Owner access.

## Group lifecycle
- Added Owner-only `/join` with an invitation link argument or a quoted invitation link.
- Added Owner-only `/leave` for the current group or `/leave <group ID>`.
- Added Owner-only `/groups` and `/groups <group ID>`. Full group inventory replies are sent privately to the Owner even when invoked in a group.
- Group authorization and join messages now refer to the Owner rather than obsolete Mod/Guidance roles.

## Persistence and maintenance
- Supabase state-save failures are surfaced to logs and rethrown to callers rather than being silently converted to success.
- Added local cache write error logging.
- Updated package/version metadata to 5.3.4.
- Expanded the bundled security audit to check all three bundled Supabase schema files and the slash-only prefix contract.
- Added offline permission smoke tests to `npm test`.

## Validation performed
- `node --check` across all 12 JavaScript files: passed.
- `npm test`: passed, including offline permission smoke tests for Owner group listing, actual group-admin scope, cute denial, Owner-only join, and leave-by-ID.
- `npm run security-audit`: passed.

## Not live-tested
No live WhatsApp session, Render deployment, external provider, or real Supabase credentials were available during this repair. The mock tests validate handler behavior, not live connectivity.

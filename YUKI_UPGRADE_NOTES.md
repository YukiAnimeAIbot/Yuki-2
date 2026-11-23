# Yuki v5.5.1 — Compatibility-preserving upgrade notes

## Implemented in this package

- Anti-link warnings now increment to four per group/member, are serialized within the bot process, and are saved through the existing Supabase-backed `group_settings` state. Warning messages are text-only. The fourth warning triggers group removal when the bot has the required WhatsApp admin permission. The fourth-warning record is retained instead of being cleared.
- `/active` and `/inactive` now list group members based on observed message activity. The active window is seven days; never-observed and older members are listed as inactive/untracked. `/yuki on` and `/yuki off` remain the separate response controls.
- Activity observations are flushed to the existing Supabase-backed `bot_state` record (`file:activity`).
- The menu text has a new cute Yuki layout. Existing `sendMenuMedia()`, MEGA storage, `assets/menu.jpg` fallback and `/setmenuimage` command path are preserved.
- A responsive Yuki Account Center is served at `/`. Existing `/health`, `/ready` and `/live` health routes remain.
- Pairing uses the existing Baileys `connectWhatsApp()` workflow and encrypted `supabase-auth-state.js` store. The website's owner-only APIs create pairing requests, list actual saved sessions, and log out one selected saved session. Session metadata and a capped audit trail are stored in the existing `bot_state` table. Pairing codes are returned only to the authenticated request and are not written to logs.
- Website API authorization requires `YUKI_WEB_ADMIN_TOKEN` (at least 32 characters), compared using `crypto.timingSafeEqual`. Pairing requests for the same number are rate-limited to one per minute.
- Existing Telegram pairing remains connected.

## Required deployment setting

Set `YUKI_WEB_ADMIN_TOKEN` in Render as a secret environment variable. Generate a value with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit the generated value to GitHub or put it in the website source. The Owner enters it into the Account Center when using protected actions.

## Supabase

The new website metadata, activity and audit records reuse the existing `public.bot_state` table. Anti-link warning counters reuse `public.group_settings.settings.warns`. Run `SUPABASE_YUKI_UPGRADE.sql` in Supabase SQL Editor as a compatibility check/migration before deployment. Existing encrypted WhatsApp auth rows are not rewritten by this upgrade.

## Not yet completed / requires an approved provider

- `/play` search still finds the track and now returns the official YouTube track link if the audio adapter is not configured. Actual MP3 delivery remains disabled because the project intentionally removed its previous unverified third-party provider. No new unverified downloader has been inserted. To restore direct MP3 delivery, provide an approved/licensed provider's API documentation and credentials or endpoint contract; then the adapter can be integrated and tested without changing the `/play` command router.
- Live WhatsApp pairing, Supabase persistence, real session logout and Render browser tests cannot be completed from a source ZIP alone. They require the Owner's configured Render environment, Supabase project and a test WhatsApp account. The automated checks in this ZIP are source-level/unit smoke tests, not a claim of live integration success.

## Verification run

- `npm test` — passed, including the new Yuki upgrade regression checks.
- `npm run security-audit` — passed.
- `node --check index.js` and `node --check features.js` — passed as part of `npm test`.

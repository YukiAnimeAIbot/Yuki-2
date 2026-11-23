# Yuki Yoshikawa — Web Account Center v6.0.1

## What changed

- Rebuilt `web/index.html` as a responsive Yuki-themed account center with Home, Pairing, Sessions and Help views.
- Added a country-code-aware international phone input (accepts a leading `+`, `00`, spaces and punctuation; backend receives normalized digits).
- Kept pairing code generation on the existing Baileys connection workflow. The actual generated code is returned only to the authenticated request and copied from the displayed value.
- Added modern Clipboard API support with a manual-copy fallback.
- Added a custom Yuki logout confirmation dialog and per-session logout action.
- Added bounded API request timeouts, loading states, empty states, status refresh and navigation.
- Owner access now requires both a high-entropy `YUKI_WEB_ADMIN_TOKEN` and a valid server-side `OWNER_NUMBER`. The browser cannot choose the owner identity.
- Web session metadata is scoped to the configured owner. Explicitly scoped sessions for another owner are not listed or allowed to be logged out. Legacy sessions without web metadata remain visible only within this single-owner bot deployment.
- Removed storage of the unverified phone number from web session metadata.
- Added persisted `Expired` and `Disconnected` session states while preserving verified phone-number-only display (LIDs are not presented as phone numbers).
- Added a dedicated `wa_web_session_audit` table for pairing-code issuance and logout-request/completion events. Audit failure blocks the protected operation; pairing resources are cleaned up if issuance cannot be audited.

## Supabase migration

Run `SUPABASE_WEB_SESSION_MANAGEMENT.sql` in the Supabase SQL Editor before deploying. The same migration is appended to the supplied full/fresh-install SQL scripts and upgrade/storage SQL files.

WhatsApp auth credentials and Signal keys continue to be encrypted using AES-256-GCM in the existing Supabase `bot_state` auth snapshots. Keep `AUTH_SNAPSHOT_ENCRYPTION_KEY` stable across deploys.

## Required environment variables

- `OWNER_NUMBER`: configured owner WhatsApp number in international digits.
- `YUKI_WEB_ADMIN_TOKEN`: private random token, at least 32 characters.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `AUTH_SNAPSHOT_ENCRYPTION_KEY`: persistent 32-byte key (64 hex characters or canonical base64).

## Pairing-code expiry behavior

Baileys/WhatsApp controls the pairing code's actual lifetime. The account center explicitly tells the user to use the code promptly and request a new code if WhatsApp rejects it. It does not fabricate an expiry timestamp or countdown.

## Validation performed

- JavaScript syntax check across the project.
- Inline browser JavaScript syntax check.
- `npm test` including the new `scripts/web-account-center-test.js`.
- `npm run security-audit` / `scripts/security-audit.js`.
- Archive integrity verification.

## Live checks still required by the deployment owner

A source archive cannot prove a live WhatsApp link, a live Supabase migration, clipboard permissions in every browser, or restoration against the owner's production credentials. After applying the migration and configuring the secrets, verify one new pairing, a restart restore, a two-session individual logout test, and the `/health` endpoint before relying on production.

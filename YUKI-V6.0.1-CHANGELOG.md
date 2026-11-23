# Yuki v6.0.1 — Account Center repair

- Rebuilt the Yuki Account Center with responsive Home, Pairing, Sessions and Help views.
- Added international phone formatting, loading/error states and real pairing-code copy with fallback.
- Added custom per-session logout confirmation and status display.
- Bound protected web access to the configured Owner and scoped session metadata to that Owner.
- Added dedicated Supabase audit records and SQL migration.
- Improved pairing failure cleanup and disconnected/expired status persistence.
- Kept WhatsApp authentication snapshots encrypted in Supabase and preserved existing bot modules.
- Added account-center automated regression checks.

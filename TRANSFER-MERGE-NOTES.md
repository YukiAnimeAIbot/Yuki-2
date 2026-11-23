# Runtime integration notes — v5.4.0

- `ported-kord.js` now provides anime and manga lookup only.
- `third-party-apis.js` contains only external providers used by `/play`.
- `antiword.js` provides the retained anti-word protection.
- `mega-menu-store.js` stores custom menu media in MEGA and mirrors metadata to Supabase.
- `/setmenuimage` accepts image, video, audio, document or sticker media up to 50 MB.
- `/menu` sends the saved media with the complete current command list, or uses `assets/menu.jpg` when no custom media exists.
- AI sticker replies use bundled WebP assets; sticker conversion commands are not registered.
- Group joins persist authorization state; only explicit configured-Owner `/leave` can call the group-leave API.

Run `npm test` and `npm run security-audit` before deployment. External service tests require the user's live credentials.

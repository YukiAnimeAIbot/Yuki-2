# Yuki Active Systems — v5.4.0

Retained: WhatsApp connection and Supabase auth persistence, Groq AI and Yuki personality, Telegram pairing, single environment-configured Owner, group lifecycle controls, group-specific Yuki toggle, group management and moderation, anti-link, anti-word, welcome/goodbye text, `/play`, anime/manga lookup, menu media storage in MEGA, uptime and hosting health endpoints.

Removed from runtime: Yuki profile system and profile storage, AFK, test command, deployed-bot/admin/activity listing commands, all media-download commands except `/play`, sticker/image conversion commands, automatic link downloading, anti-GC status command, message-control commands, welcome/goodbye image setters and image persistence, dynamic owner management, and their dedicated source modules.

Group membership policy: the bot never calls `groupLeave` automatically. Only an explicitly authorized `/leave` command from the single configured Owner can leave a group. WhatsApp administrators, WhatsApp service events, disconnections, restarts, and joining another group cannot trigger voluntary leaving. External removal by a WhatsApp administrator or platform is outside the bot's control.

The active Owner is `OWNER_NUMBER` only. No owner list is hydrated from Supabase and no runtime add/remove-owner commands exist.

Activity timestamps remain internally for the quiet-message watcher; there are no `/active` or `/inactive` commands. This is not an AFK system.

Existing Supabase tables are not dropped automatically. Apply `SUPABASE_CLEANUP_REMOVED_SYSTEMS.sql` only after reviewing its destructive profile-table removal and targeted state cleanup. It preserves shared `bot_state`, `group_settings`, and `bot_bans` tables.

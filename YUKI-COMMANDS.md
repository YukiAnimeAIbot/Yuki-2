# Yuki Commands — v6.0.0

Only `/` is the command prefix.

## General
- `/menu`, `/help`, `/ping`, `/uptime`, `/support`, `/search <query>`
- `/yuki on`, `/yuki off`, `/active`, `/inactive` — current group only; actual group admins may toggle

## Music
- `/play <song, artist, or YouTube URL>` — YouTube search only; audio delivery is disabled until a vetted provider is configured

## Anime and manga
- `/anime <title>`, `/manga <title>`, `/animequote`, `/animenews`
- `/character <name>`, `/animechar <name>`
- `/animesearch <title>`, `/animeinfo <title>`
- `/animewatch <title>`, `/watching <title>`
- `/season`, `/animeseason`
- `/animerec`, `/recommend`, `/airing`, `/nextep`

## Group management
- `/gs` — show the current group’s configured systems
- `/welcome on|off`, `/setwelcome <text>`
- `/goodbye on|off`, `/setgoodbye <text>`
- `/setrules <text>`, `/rules`, `/setdesc <text>`, `/setname <name>`
- `/open`, `/close`, `/resetlink`, `/invite` (any member can request the link; Yuki must be a group admin)
- `/promote`, `/demote`, `/kick`, `/tagall`, `/hidetag`, `/pin`, `/unpin`

## Protection and moderation
- `/antilink on|off`, `/setantillink <mode>`, `/antiword on|off`
- `/warn`, `/clearwarn`, `/mute`, `/unmute`, `/delete`, `/d`
- `/ban`, `/unban`, `/bans`

## Owner only
- `/join <WhatsApp invitation link>` (or reply to an invitation link)
- `/leave [group-id]`, `/groups [group-id]`
- `/setmenuimage`, `/broadcast`, `/maintenance on|off`
- `/identity`, `/botinfo`, `/connection`, `/session` — Owner-only status
- `/botstart`, `/resume`, `/restart`, `/shutdown`, `/clear`

`/setmenuimage` accepts image, video, audio, document, or sticker media attached to the command or quoted by it, up to 50 MB. Media is stored in MEGA and its metadata in Supabase. `/menu` displays the saved media with the full command list; `assets/menu.jpg` is the fallback image.

## Telegram
- `/start`, `/help`, `/pair <number>`, `/unpair`, `/status`, `/ai <message>`

## Removed
Legacy profile-management system, AFK, `/test`, `/bots`, `/admins`, all media-download commands except `/play`, sticker conversion commands, `/antigcstatus`, `/msgs`, welcome/goodbye image setters, dynamic owner commands, and their dedicated runtime modules are not part of this build.

## Persistent memory and system commands (v5.5 upgrade)
- `/memories` — view only your own saved anime/community preferences.
- `/search <query>` — search the web; configure `TAVILY_API_KEY` for full web search; optional `BRAVE_SEARCH_API_KEY` is a secondary provider. DuckDuckGo Instant Answers is the keyless fallback.
- `/memory` — Owner-only private archive of user and group memory records.
- `/memoryclear @user` — Owner-only clear one user's memory.
- `/memoryclear group` — Owner-only clear the current group's shared context.
- `/memoryclear all confirm` — Owner-only clear all user and group memory records (confirmation required).
- `/identity`, `/botinfo`, `/connection`, `/session` — Owner-only connected identity and service configuration status.
- `/gs` — show current group's configured systems.
- `/active`, `/inactive` — actual group admins (or verified bot Owner) enable/disable Yuki AI in the current group.

**Supabase migration required:** run the updated `SUPABASE_COMPLETE.sql` (or another updated canonical schema file) to create the `yuki_memories` table before deploying this upgrade. Private Telegram pairing is restricted to IDs configured in `TELEGRAM_ADMIN_ID`; `PUBLIC_PAIRING=true` no longer grants public pairing.

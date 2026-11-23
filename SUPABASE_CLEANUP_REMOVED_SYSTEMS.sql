-- DESTRUCTIVE CLEANUP for Yuki v5.4.0 removed systems.
-- Review before execution. This removes Yuki profile data/tables and obsolete state only.
-- It preserves bot_state, bot_bans, group_settings, group membership authorization,
-- AI memory, active group toggles, moderation, and menu-media state.

begin;

-- Remove profile records and avatar-cleanup metadata by dropping the profile-only tables.
drop table if exists public.yuki_user_badges;
drop table if exists public.yuki_media_cleanup;
drop table if exists public.yuki_badges;
drop table if exists public.yuki_profiles;

-- Remove only obsolete bot_state entries created by the retired AFK and dynamic-owner
-- stores, plus the retired welcome/goodbye image metadata. Do not delete activity.json:
-- it is still used internally by the retained quiet-message watcher.
delete from public.bot_state
where key in ('file:afk', 'file:owners', 'file:global-media')
   or key ilike '%afk.json'
   or key ilike '%owners.json'
   or key ilike '%global-media.json';

-- Remove settings exclusively belonging to deleted command systems while retaining
-- all other per-group settings and authorization records.
update public.group_settings
set settings = coalesce(settings, '{}'::jsonb)
  - 'msgs' - 'autodl' - 'welcomeImage' - 'goodbyeImage',
    updated_at = now()
where coalesce(settings, '{}'::jsonb) ?| array['msgs','autodl','welcomeImage','goodbyeImage'];

commit;

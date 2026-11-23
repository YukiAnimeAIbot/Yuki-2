'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let bad = 0;
function fail(message) { console.error(message); bad++; }
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]|GROQ_API_KEY\s*=\s*['"]|TELEGRAM_BOT_TOKEN\s*=\s*['"]/.test(source)) fail(`Possible hard-coded secret in ${file}`);
}
for (const file of ['SUPABASE_CLEAN_CANONICAL.sql', 'SUPABASE_COMPLETE.sql', 'SUPABASE_FRESH_ALL.sql']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!/create table if not exists public\.bot_state/i.test(source) || !/create table if not exists public\.bot_bans/i.test(source) || !/create table if not exists public\.group_settings/i.test(source) || !/create table if not exists public\.yuki_memories/i.test(source)) fail(`Missing active runtime tables in ${file}`);
}
const memory = fs.readFileSync(path.join(root, 'supabase.js'), 'utf8');
if (!/saveYukiMemory/.test(memory) || !/getYukiMemory/.test(memory) || !/clearYukiMemory/.test(memory)) fail('Persistent scoped Yuki memory APIs are missing.');
const telegram = fs.readFileSync(path.join(root, 'telegram.js'), 'utf8');
if (/function canPair\(ctx\)\s*\{\s*if\s*\(config\.PUBLIC_PAIRING\)/.test(telegram)) fail('Public Telegram pairing bypass must not be enabled.');
const auth = fs.readFileSync(path.join(root, 'supabase-auth-state.js'), 'utf8');
const authCrypto = fs.readFileSync(path.join(root, 'auth-crypto.js'), 'utf8');
if (!/auth-crypto/.test(auth) || !/aes-256-gcm/.test(authCrypto) || !/AUTH_SNAPSHOT_ENCRYPTION_KEY/.test(authCrypto) || !/enc:v1:/.test(authCrypto)) fail('WhatsApp auth encryption or key validation is missing.');
const audio = fs.readFileSync(path.join(root, 'kord-yt-audio.js'), 'utf8');
if (/fetch\s*\(/.test(audio) || /https?:\/\//.test(audio)) fail('Audio adapter must not contain unreviewed outbound network calls.');
const feature = fs.readFileSync(path.join(root, 'features.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const ported = fs.readFileSync(path.join(root, 'ported-kord.js'), 'utf8');
const forbidden = [/yuki-profile/i,/afk-store/i,/setwelcomeimage/i,/setgoodbyeimage/i,/addowner/i,/delowner/i,/antigcstatus/i,/cmd\s*===\s*['"]msgs['"]/i,/cmd\s*===\s*['"]test['"]/i,/cmd\s*===\s*['"]admins['"]/i,/cmd\s*===\s*['"]active['"]/i,/cmd\s*===\s*['"]inactive['"]/i,/cmd\s*===\s*['"]bots['"]/i,/autodl/i];
for (const [file, source] of [['features.js',feature],['index.js',index],['ported-kord.js',ported]]) for (const pattern of forbidden) if (pattern.test(source)) fail(`Removed feature reference ${pattern} remains in ${file}`);
if ((feature.match(/\.groupLeave\(/g) || []).length !== 1) fail('Only one groupLeave call must remain, inside explicit Owner /leave.');
if (/groupLeave\(/.test(index)) fail('index.js must not contain an automatic groupLeave path.');
if (fs.existsSync(path.join(root,'yuki-profile.js')) || fs.existsSync(path.join(root,'afk-store.js'))) fail('Removed profile/AFK runtime module still exists.');
if (!/OWNER_NUMBER/.test(fs.readFileSync(path.join(root,'config.js'),'utf8'))) fail('Single OWNER_NUMBER configuration is missing.');
if (!/\/play/.test(fs.readFileSync(path.join(root,'YUKI-COMMANDS.md'),'utf8'))) fail('Retained /play command missing from documentation.');
console.log(bad ? `Security audit found ${bad} issue(s).` : 'Security audit checks passed.');
process.exitCode = bad ? 1 : 0;

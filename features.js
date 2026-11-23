
function isGroupChat(chatId) { return typeof chatId === 'string' && chatId.endsWith('@g.us'); }
const BOT_PREFIX = '/';
function getCommandPrefix(raw = '') { return String(raw || '').trim().startsWith('/') ? BOT_PREFIX : ''; }
function isCommand(raw = '') { const t = String(raw || '').trim(); return t.startsWith('/') && t.length > 1; }
const YUKI_DENIAL = "╭━━〔 🌸 𝒀𝑼𝑲𝑰 〕━━╮\n\nYou don't have permission for this, baka! 💗\n\n╰━━━━━━━━━━━━━━╯";
function cuteResponse(value) {
  const text = String(value ?? '');
  if (!text.trim()) return 'Ehehe~ 💗';
  if (/no such command baka/i.test(text)) return text;
  if (/you don't have permission for this, baka/i.test(text)) return YUKI_DENIAL;
  if (/^(╭━━|╔════|┌─❖|🌸 𝒀𝒖𝒌𝒊)/.test(text.trim())) return text;
  return `🌸 𝒀𝒖𝒌𝒊~ ${text}`;
}
'use strict';

/**
 * 𝒀𝒖𝒌𝒊 community features.
 * Internal role hierarchy is independent from WhatsApp admin status.
 * WhatsApp admin status is checked only immediately before actions that require it.
 */
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('./config');
const SUPABASE = require('./supabase');
const OWNER_STORE = require('./owner-store');


const configuredDataDir = process.env.YUKI_DATA_DIR;

const DATA_DIR =
  configuredDataDir && !configuredDataDir.startsWith('/var/data')
    ? configuredDataDir
    : path.join(__dirname, 'data');

const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const BOTBAN_FILE = path.join(DATA_DIR, 'botbans.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');
const QUIET_FILE = path.join(DATA_DIR, 'quiet.json');
const MAINTENANCE_FILE = path.join(DATA_DIR, 'maintenance.json');
const MENU = `╭━━━〔 🌸 𝒀𝑼𝑲𝑰 — 𝑪𝑼𝑻𝑬 𝑴𝑬𝑵𝑼 〕━━━╮
│  ❄️ YUKI YOSHIKAWA • v6.0.0
│  ADVANCED AI • SMART REPLIES • ANIME & MAGIC ♡
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 🫧 𝑮𝑬𝑵𝑬𝑹𝑨𝑳 〕
│ /menu • /help • /ping • /uptime
│ /support • /search
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 💗 𝑨𝑰 & 𝑪𝑯𝑨𝑻 〕
│ Chat naturally with Yuki
│ /yuki on • /yuki off
│ /active • /inactive — member activity lists
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 🎧 𝑴𝑼𝑺𝑰𝑪 〕
│ /play <song, artist or YouTube URL>
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 🎀 𝑨𝑵𝑰𝑴𝑬 & 𝑴𝑨𝑵𝑮𝑨 〕
│ /anime • /manga • /animequote • /animenews
│ /character • /animechar • /animesearch • /animeinfo
│ /animewatch • /watching • /season • /animeseason
│ /animerec • /recommend • /airing • /nextep
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 🛡️ 𝑮𝑹𝑶𝑼𝑷 𝑴𝑨𝑵𝑨𝑮𝑬𝑴𝑬𝑵𝑻 〕
│ /gs • /welcome on|off • /setwelcome <text>
│ /goodbye on|off • /setgoodbye <text>
│ /setrules <text> • /rules • /setdesc <text>
│ /setname <name> • /open • /close • /resetlink
│ /invite • /promote • /demote • /kick
│ /tagall • /hidetag • /pin • /unpin
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 🔒 𝑮𝑹𝑶𝑼𝑷 𝑷𝑹𝑶𝑻𝑬𝑪𝑻𝑰𝑶𝑵 〕
│ /antilink on|off • /setantillink <mode>
│ /antiword on|off • /warn • /clearwarn
│ /mute • /unmute • /delete • /d
│ Anti-link: 4 warnings, then automatic removal
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 👑 𝑶𝑾𝑵𝑬𝑹 〕
│ /join • /leave • /groups • /setmenuimage
│ /broadcast • /identity • /botinfo • /connection
│ /session • /memory • /memoryclear
│ /maintenance • /botstart • /resume
│ /ban • /unban • /bans • /restart • /shutdown
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─〔 🧠 𝑴𝑬𝑴𝑶𝑹𝒀 & 𝑻𝑬𝑳𝑬𝑮𝑹𝑨𝑴 〕
│ /memories • /start • /help • /pair • /unpair
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✧･ﾟ: *✧･ﾟ:* 𝑬𝒏𝒋𝒐𝒚 𝒚𝒐𝒖𝒓 𝒔𝒕𝒂𝒚, 𝒔𝒆𝒏𝒑𝒂𝒊~ ♡ *:･ﾟ✧*:･ﾟ✧`;
function getPrefix() { return '/'; }
async function sendMenuMedia(sock, chatId, msg) {
  const menuStore = require('./mega-menu-store');
  try {
    const saved = menuStore.readState();
    if (!saved || saved.provider !== 'mega') {
      const fallbackPath = path.join(__dirname, 'assets', 'menu.jpg');
      if (fs.existsSync(fallbackPath)) return sock.sendMessage(chatId, { image: fs.readFileSync(fallbackPath), caption: MENU }, msg ? { quoted: msg } : undefined);
      return sock.sendMessage(chatId, { text: MENU }, msg ? { quoted: msg } : undefined);
    }
    const { state, buffer } = await menuStore.load();
    const type = state.type;
    const payload = type === 'video' ? { video: buffer, caption: MENU, mimetype: state.mimetype, gifPlayback: state.gifPlayback } :
      type === 'audio' ? { audio: buffer, mimetype: state.mimetype, ptt: state.ptt } :
      type === 'document' ? { document: buffer, mimetype: state.mimetype, fileName: state.fileName || 'menu-media', caption: MENU } :
      type === 'sticker' ? { sticker: buffer } : { image: buffer, caption: MENU, mimetype: state.mimetype };
    if (type === 'audio' || type === 'sticker') await sock.sendMessage(chatId, { text: MENU }, msg ? { quoted: msg } : undefined);
    return await sock.sendMessage(chatId, payload, msg ? { quoted: msg } : undefined);
  } catch (e) {
    console.error('⚠️ MEGA menu media unavailable; using bundled menu image:', e.message);
    const fallbackPath = path.join(__dirname, 'assets', 'menu.jpg');
    if (fs.existsSync(fallbackPath)) return sock.sendMessage(chatId, { image: fs.readFileSync(fallbackPath), caption: MENU }, msg ? { quoted: msg } : undefined);
    return sock.sendMessage(chatId, { text: MENU }, msg ? { quoted: msg } : undefined);
  }
}

const YUKI_REACTION_DIR = path.join(__dirname, 'assets', 'yuki-reaction');
const YUKI_REACTION_STATE_FILE = path.join(DATA_DIR, 'yuki-reaction.json');

const OWNER_NUMBER = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');

function readJSON(file, fallback) {
  const cached = typeof SUPABASE.readCachedState === 'function' ? SUPABASE.readCachedState(file, undefined) : undefined;
  if (cached !== undefined && cached !== null) return cached;
  return fallback;
}
function writeJSON(file, value) {
  // In-memory cache is only for the current process; Supabase is the durable source of truth.
  const save = typeof SUPABASE.writeCachedState === 'function' ? SUPABASE.writeCachedState(file, value) : SUPABASE.saveState(file, value);
  Promise.resolve(save).catch(e => console.error(`❌ Supabase persistent state save failed (${path.basename(file)}):`, e.message));
}
function normalizeJid(jid) { return String(jid || '').replace(/:\d+/, ''); }
function digits(jid) { return normalizeJid(jid).split('@')[0].replace(/\D/g, ''); }
function fmt(v) { return Number(v || 0).toLocaleString(); }
function ownerJid() { return OWNER_NUMBER ? OWNER_NUMBER + '@s.whatsapp.net' : ''; }
function isOwner(jid) { return !!OWNER_NUMBER && digits(jid) === OWNER_NUMBER; }

async function refreshStaffRoles() { return { mods: [], guidances: [] }; }
function getRoles() { return { mods: [], guidances: [] }; }
function saveRoles() { return getRoles(); }
function roleOf(jid) { return isOwner(jid) ? 'owner' : 'member'; }
const rank={member:0,guidance:0,mod:0,owner:3};
function isPrivileged(jid,min='guidance'){ return isOwner(jid); }
function pRoleLabel(jid) { return isOwner(jid) ? ' 👑' : ''; }

// Only the real WhatsApp admins of a group may change that group's settings or moderation state.
// Global Owner access remains unrestricted; bot staff status alone is not enough.
const GROUP_CONTROL_COMMANDS = new Set([
  'welcome','setwelcome','goodbye','setgoodbye','setrules','setdesc','setname','open','close','resetlink',
  'promote','demote','kick','tagall','hidetag','pin','unpin','antilink','setantillink',
  'warn','clearwarn','mute','unmute','delete','d','yuki'
]);
async function isActualWhatsAppGroupAdmin(sock, chatId, jid) {
  if (!isGroupChat(chatId)) return false;
  try {
    const meta = await sock.groupMetadata(chatId);
    const wanted = digits(jid);
    return (meta?.participants || []).some(p => {
      if (p?.admin !== 'admin' && p?.admin !== 'superadmin') return false;
      return [...participantJids(p)].some(x => digits(x) === wanted);
    });
  } catch { return false; }
}

function getGroups() {
  const g = readJSON(GROUPS_FILE, { settings: {}, allowedGroups: {} });
  g.settings = g.settings || {};
  g.allowedGroups = g.allowedGroups || {};
  return g;
}
function saveGroups(g) { writeJSON(GROUPS_FILE, g); }

// Membership is retained; the bot never leaves groups automatically.
async function groupHasOwnerOrMod(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    return (meta.participants || []).some(p => {
      const identities = participantJids(p);
      return Array.from(identities).some(member => isOwner(member) || roleOf(member) === 'mod' || roleOf(member) === 'guidance');
    });
  } catch {
    return false;
  }
}

function unwrapMessageContent(message) {
  return message?.ephemeralMessage?.message
    || message?.viewOnceMessage?.message
    || message?.viewOnceMessageV2?.message
    || message?.viewOnceMessageV2Extension?.message
    || message || {};
}
function quotedMessageObject(msg) {
  const m = unwrapMessageContent(msg?.message);
  const ctx = m?.extendedTextMessage?.contextInfo
    || m?.imageMessage?.contextInfo
    || m?.videoMessage?.contextInfo
    || m?.documentMessage?.contextInfo
    || m?.stickerMessage?.contextInfo
    || m?.audioMessage?.contextInfo
    || {};
  return ctx.quotedMessage ? unwrapMessageContent(ctx.quotedMessage) : null;
}
function messageMediaNode(message) {
  const m = unwrapMessageContent(message);
  if (m.imageMessage) return { node: m.imageMessage, type: 'image', kind: 'image', mime: m.imageMessage.mimetype || 'image/jpeg', caption: m.imageMessage.caption || '' };
  if (m.videoMessage) return { node: m.videoMessage, type: 'video', kind: 'video', mime: m.videoMessage.mimetype || 'video/mp4', caption: m.videoMessage.caption || '', gifPlayback: !!m.videoMessage.gifPlayback };
  if (m.audioMessage) return { node: m.audioMessage, type: 'audio', kind: 'audio', mime: m.audioMessage.mimetype || 'audio/mpeg', ptt: !!m.audioMessage.ptt };
  if (m.documentMessage) return { node: m.documentMessage, type: 'document', kind: 'document', mime: m.documentMessage.mimetype || 'application/octet-stream', fileName: m.documentMessage.fileName || 'file' };
  if (m.stickerMessage) return { node: m.stickerMessage, type: 'sticker', kind: 'sticker', mime: m.stickerMessage.mimetype || 'image/webp' };
  return null;
}
async function downloadMediaNode(media) {
  if (!media?.node) return null;
  const stream = await downloadContentFromMessage(media.node, media.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function getImageFromMessage(msg) {
  const current = messageMediaNode(msg);
  if (current?.kind === 'image') return { data: await downloadMediaNode(current), mime: current.mime };
  const quoted = quotedMessageObject(msg);
  const q = messageMediaNode(quoted);
  if (q?.kind === 'image') return { data: await downloadMediaNode(q), mime: q.mime };
  return null;
}
function extractMentionedJids(msg) {
  const m = unwrapMessageContent(msg?.message);
  const contexts = [
    m?.extendedTextMessage?.contextInfo,
    m?.imageMessage?.contextInfo,
    m?.videoMessage?.contextInfo,
    m?.documentMessage?.contextInfo,
    m?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo,
    m?.audioMessage?.contextInfo,
  ].filter(Boolean);
  return Array.from(new Set(contexts.flatMap(c => c?.mentionedJid || []).map(normalizeJid).filter(Boolean)));
}
function nextOwnerReactionSticker() {
  const files = fs.existsSync(YUKI_REACTION_DIR)
    ? fs.readdirSync(YUKI_REACTION_DIR).filter(f => /\.webp$/i.test(f)).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];
  if (!files.length) return null;
  const state = readJSON(YUKI_REACTION_STATE_FILE, { next: 0 });
  const index = Number.isInteger(state.next) ? state.next % files.length : 0;
  state.next = (index + 1) % files.length;
  writeJSON(YUKI_REACTION_STATE_FILE, state);
  return path.join(YUKI_REACTION_DIR, files[index]);
}
async function reactToOwnerMention(sock, msg, chatId, inGroup) {
  if (!inGroup) return false;
  const mentions = extractMentionedJids(msg);
  if (!mentions.some(j => isOwner(j))) return false;
  const file = nextOwnerReactionSticker();
  if (!file) return false;
  try {
    await sock.sendMessage(chatId, { sticker: fs.readFileSync(file) });
    return true;
  } catch (e) {
    console.log('[yuki-reaction] sticker send failed:', e?.message || e);
    return false;
  }
}

function groupSettings(jid) {
  const g = getGroups();
  if (!g.settings[jid]) { g.settings[jid] = {
    welcome: false,
    welcomeText: '🌸 ようこそ! (Yōkoso!) 🌸\n\n💙 Welcome to 𝒀𝒖𝒌𝒊 AI!\n\n👤 @user\n\n✨ Your anime companion is ready to chat, help, and have fun with you.\n\n🌸 「一緒に頑張ろう！」\nLet’s do our best together!\n\n💫 Enjoy your stay!',
    antilink: false,
    antilinkMode: 'all',
    warns: {},
    bans: {},
    muted: {},
    goodbye: false,
    goodbyeText: '👋 Goodbye @user. Take care and see you again! 🌸',
    rules: '',
  }; saveGroups(g); };
  return g.settings[jid];
}
function saveGroupSettings(jid, s) {
  const g = getGroups(); g.settings[jid] = s; saveGroups(g);
}
async function persistGroupSettings(jid, s) {
  const g = getGroups(); g.settings[jid] = s;
  await SUPABASE.saveState(GROUPS_FILE, g);
}
const ANTI_LINK_WARNING_QUEUES = new Map();
async function incrementAntiLinkWarning(groupJid, userIdentity) {
  const queueKey = `${String(groupJid)}:${normalizeJid(userIdentity)}`;
  const previous = ANTI_LINK_WARNING_QUEUES.get(queueKey) || Promise.resolve();
  let warning = 0;
  const task = previous.catch(() => {}).then(async () => {
    const settings = groupSettings(groupJid);
    settings.warns = settings.warns || {};
    const identity = normalizeJid(userIdentity);
    warning = Math.min(4, Math.max(0, Number(settings.warns[identity] || 0)) + 1);
    settings.warns[identity] = warning;
    await persistGroupSettings(groupJid, settings);
  });
  ANTI_LINK_WARNING_QUEUES.set(queueKey, task);
  try { await task; return warning; }
  finally { if (ANTI_LINK_WARNING_QUEUES.get(queueKey) === task) ANTI_LINK_WARNING_QUEUES.delete(queueKey); }
}

let ACTIVITY_CACHE = null;
let ACTIVITY_DIRTY = false;
function getActivity() { if (ACTIVITY_CACHE) return ACTIVITY_CACHE; ACTIVITY_CACHE = readJSON(ACTIVITY_FILE, {}); return ACTIVITY_CACHE; }
function flushActivity() { if (!ACTIVITY_DIRTY || !ACTIVITY_CACHE) return; const snapshot = structuredClone(ACTIVITY_CACHE); writeJSON(ACTIVITY_FILE, snapshot); ACTIVITY_DIRTY = false; SUPABASE.saveState(ACTIVITY_FILE, snapshot).catch(e => { ACTIVITY_DIRTY = true; console.error('[activity] Supabase save failed:', e.message); }); }
setInterval(flushActivity, 30000).unref?.();
function touchActivity(group, jid) {
  const a = getActivity(); a[group] = a[group] || {};
  const ids = [normalizeJid(jid)].filter(Boolean);
  for (const id of ids) a[group][id] = Date.now();
  a[group] = Object.fromEntries(Object.entries(a[group]).sort((x,y) => y[1]-x[1]).slice(0, 1000)); ACTIVITY_DIRTY = true;
}
function getGroupActivity(group) { return { ...(getActivity()[String(group)] || {}) }; }

function getBotBans() {
  const raw = readJSON(BOTBAN_FILE, {});
  if (Array.isArray(raw)) return Object.fromEntries(raw.map(j => [normalizeJid(j), { reason: 'No reason provided', at: Date.now() }]));
  return raw && typeof raw === 'object' ? raw : {};
}
function saveBotBans(a) {
  const value = a && typeof a === 'object' ? a : {};
  writeJSON(BOTBAN_FILE, value);
  SUPABASE.saveBotBans(value).catch(() => {});
}
function isBotBanned(jid) { return Object.prototype.hasOwnProperty.call(getBotBans(), normalizeJid(jid)); }
function botBanInfo(jid) { return getBotBans()[normalizeJid(jid)] || null; }
function maintenanceState() { return !!readJSON(MAINTENANCE_FILE, { enabled:false }).enabled; }
function setMaintenance(enabled, by) { writeJSON(MAINTENANCE_FILE, { enabled:!!enabled, by:normalizeJid(by||''), updated_at:Date.now() }); }

const QUIET_AFTER_MS = Math.max(10, Number(process.env.QUIET_AFTER_MINUTES || 60)) * 60 * 1000;
const QUIET_COOLDOWN_MS = Math.max(30, Number(process.env.QUIET_MESSAGE_COOLDOWN_MINUTES || 360)) * 60 * 1000;
const QUIET_MESSAGES = [
  '🌸 Ehehe~ it got so quiet in here... is everyone secretly watching anime? 👀💙',
  '✨ Psst... 𝒀𝒖𝒌𝒊 is still here~ someone tell me what anime you are watching! 🎀',
  '🌙 The group is peaceful today... shall we wake it up with an anime question? 💙',
  '🎀 Quiet mode detected~ who wants a random anime challenge? 😌✨',
  '💙 Yuki pokes the group gently... anybody alive? 👀🌸',
  '🍵 It is a little too quiet here~ come chat with Yuki for a bit! 🌸',
  '✨ Random question: if you could live in any anime world, which one would you choose? 👀',
];
function getQuietState() { return readJSON(QUIET_FILE, {}); }
function saveQuietState(s) { writeJSON(QUIET_FILE, s); }
function pickRandom(a) { return a[Math.floor(Math.random() * a.length)]; }

async function startQuietWatcher(sock) {
  if (!sock || sock.__yukiQuietWatcher) return;
  sock.__yukiQuietWatcher = true;
  const tick = async () => {
    try {
      const activity = getActivity();
      const state = getQuietState();
      const now = Date.now();
      for (const jid of Object.keys(activity)) {
        if (!jid || !jid.endsWith('@g.us')) continue;
        const groupActivity = activity[jid] || {};
        const lastTimes = Object.values(groupActivity).map(Number).filter(Boolean);
        if (!lastTimes.length) continue;
        const lastActivity = Math.max(...lastTimes);
        if (now - lastActivity < QUIET_AFTER_MS) continue;
        if (now - Number(state[jid] || 0) < QUIET_COOLDOWN_MS) continue;

        // Only speak in groups that still have an Owner or Mod present.
        if (!(await groupHasOwnerOrMod(sock, jid))) continue;
        const message = pickRandom(QUIET_MESSAGES);
        await sock.sendMessage(jid, { text: message }).catch(() => {});
        state[jid] = now;
      }
      saveQuietState(state);
    } catch (e) {
      console.log('quiet watcher error:', e.message);
    }
  };
  // Do not send immediately on startup; wait until the first interval.
  sock.__yukiQuietTimer = setInterval(tick, 15 * 60 * 1000);
  if (sock.__yukiQuietTimer.unref) sock.__yukiQuietTimer.unref();
}

function parseTargets(msg) {
  const ctx = msg?.message?.extendedTextMessage?.contextInfo || {};
  const mentioned = (ctx.mentionedJid || []).map(normalizeJid);
  const quoted = ctx.stanzaId ? normalizeJid(ctx.participant || '') : '';
  return Array.from(new Set([...mentioned, quoted].filter(Boolean)));
}
function parseNumber(raw) {
  const n = Number(String(raw || '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
async function targetFromArgs(args,msg,sock,chatId) {
  const ts=parseTargets(msg); let candidate=ts.length?ts[0]:''; let phone='';
  if(candidate && (candidate.endsWith('@lid')||candidate.endsWith('@hosted.lid')) && sock && chatId?.endsWith('@g.us')) {
    try { const meta=await sock.groupMetadata(chatId); const hit=(meta?.participants||[]).find(p=>participantJids(p).has(candidate)); if(hit){ const ids=participantJids(hit); candidate=[...ids].find(j=>j.endsWith('@s.whatsapp.net'))||candidate; } } catch {}
  }
  if(!candidate){ phone=String(args[0]||'').replace(/\D/g,''); if(phone.length>=7) candidate=phone+'@s.whatsapp.net'; }
  if(!candidate) return '';
  phone=digits(candidate); if(phone.length<7) return '';
  try {
    if(sock?.onWhatsApp){
      const results=await sock.onWhatsApp(phone); const hit=Array.isArray(results)?results.find(x=>x?.exists&&x?.jid):null;
      if(hit?.jid) candidate=normalizeJid(hit.jid); else if(!ts.length) return '';
    }
  } catch {
    if(!ts.length && chatId?.endsWith('@g.us') && !(await groupParticipant(sock,chatId,candidate))) return '';
  }
  if(ts.length && chatId?.endsWith('@g.us')) {
    const member=await groupParticipant(sock,chatId,candidate); if(member){ const ids=participantJids(member); candidate=[...ids].find(j=>j.endsWith('@s.whatsapp.net'))||candidate; }
  }
  return normalizeJid(candidate);
}

async function send(sock, chatId, text, msg, mentions) {
  return sock.sendMessage(chatId, { text: cuteResponse(text), ...(mentions?.length ? {mentions} : {}) }, msg ? {quoted: msg} : undefined);
}
async function sendTyping(sock, chatId, ms=350) {
  const wait = Math.max(150, Math.min(1800, Number(ms)||350));
  try {
    global.__YUKI_TYPING_UNTIL = global.__YUKI_TYPING_UNTIL || new Map();
    global.__YUKI_TYPING_UNTIL.set(chatId, Date.now() + wait + 100);
    await sock.presenceSubscribe(chatId).catch(()=>{});
    await sock.sendPresenceUpdate('composing', chatId).catch(()=>{});
  } catch {}
  await new Promise(r=>setTimeout(r, wait));
}
function participantJids(p) {
  const out = new Set();
  for (const value of [p?.id, p?.lid, p?.phoneNumber, p?.jid]) {
    const j = normalizeJid(value || '');
    if (!j) continue;
    out.add(j);
    if (/^\d{7,}$/.test(j)) out.add(`${j}@s.whatsapp.net`);
  }
  return out;
}

function jidsMatch(a, b) {
  const aa = normalizeJid(a || '');
  const bb = normalizeJid(b || '');
  return !!aa && !!bb && aa === bb;
}

async function groupParticipant(sock, chatId, jid) {
  try {
    const wanted = normalizeJid(jid);
    const meta = await sock.groupMetadata(chatId);
    return (meta?.participants || []).find(p => participantJids(p).has(wanted)) || null;
  } catch {
    return null;
  }
}

async function adminsOf(sock, chatId) {
  try {
    const meta = await sock.groupMetadata(chatId);
    const admins = new Set();
    for (const p of (meta.participants || [])) {
      if (p.admin !== 'admin' && p.admin !== 'superadmin') continue;
      for (const j of participantJids(p)) admins.add(j);
    }
    return admins;
  } catch { return new Set(); }
}

async function botIsAdmin(sock, chatId) {
  const me = normalizeJid(sock?.user?.id || '');
  const meLid = normalizeJid(sock?.user?.lid || '');
  const admins = await adminsOf(sock, chatId);
  return admins.has(me) || (meLid && admins.has(meLid));
}

async function hasGroupAdminAccess(sock, chatId, senderJid) {
  // Global staff roles are intentionally NOT a substitute for WhatsApp
  // group-admin status. Owner remains the single global exception.
  if (isOwner(senderJid)) return true;
  return isActualWhatsAppGroupAdmin(sock, chatId, senderJid);
}

function canManageTarget(sender, target, senderIsGroupAdmin = false, targetIsGroupAdmin = false) {
  // Never allow a user to moderate themselves or another configured Owner.
  if (!sender || !target || digits(sender) === digits(target) || isOwner(target)) return false;
  if (isOwner(sender)) return true;

  // Explicit bot staff hierarchy takes precedence when configured.
  const sr = rank[roleOf(sender)] ?? rank.member;
  const tr = rank[roleOf(target)] ?? rank.member;
  if (sr > tr) return true;

  // A WhatsApp group admin may manage ordinary members, but not peer admins.
  return !!senderIsGroupAdmin && !targetIsGroupAdmin && tr === rank.member;
}

function canManage(sender, target, needed='guidance') {
  const sr = rank[roleOf(sender)], tr = rank[roleOf(target)];
  return sr >= rank[needed] && sr > tr;
}
function templateWelcome(text, jid) {
  const tag = '@' + digits(jid);
  return String(text || '').replace(/@user\b/gi, tag);
}
async function handleFeatureCommand({sock,msg,text,chatId,inGroup,senderJid}) {
  // Most feature commands are group-only, but verified Owner can use global controls from DM too.
  const raw = String(text || '').trim();
  const prefix=getCommandPrefix(raw);
  const isGsForGate = /^\/gs(?:\s|$)/i.test(raw);
  const firstCmd = isGsForGate ? 'gs' : (isCommand(raw) ? raw.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : '');
  // Owner DMs may use global/non-group commands. Commands that require a real
  // WhatsApp group remain group-only even for the Owner, while group-control
  // commands continue to use the real WhatsApp-admin check below.
  const GROUP_ONLY_COMMANDS = new Set([
    ...GROUP_CONTROL_COMMANDS,
    'gs','rules','setrules','setwelcome','welcome',
    'setgoodbye','goodbye','setdesc','setname','open','close','resetlink',
    'invite','promote','demote','kick','tagall','hidetag','pin','unpin',
    'warn','clearwarn','mute','unmute','delete','d',
    'antilink','setantillink'
  ]);
  if (!inGroup && GROUP_ONLY_COMMANDS.has(firstCmd)) return false;
  if (!inGroup && !isOwner(senderJid) && !['join','leave','groups'].includes(firstCmd)) return false;

  const isGsAlias = /^\/gs(?:\s|$)/i.test(String(raw || '').trim());
  if (!isCommand(raw) && !isGsAlias) return false;
  const parts = (isGsAlias ? String(raw).trim().slice(1) : raw.slice(prefix.length)).trim().split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  const args = parts;

  // Owner-only group lifecycle and live membership inspection.
  if (['join','leave','groups'].includes(cmd)) {
    if (!isOwner(senderJid)) { await send(sock, chatId, YUKI_DENIAL, msg); return true; }
    if (cmd === 'join') {
      const ctx = msg?.message?.extendedTextMessage?.contextInfo || {};
      const quoted = ctx.quotedMessage || {};
      const quotedText = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || '';
      const source = `${args.join(' ')}\n${quotedText}`;
      const match = source.match(/https?:\/\/(?:chat\.)?whatsapp\.com\/([A-Za-z0-9_-]+)/i);
      if (!match) { await send(sock, chatId, 'Ehh~ senpai, give me a valid group invitation link or reply to a message containing one, baka~ 🌸', msg); return true; }
      try {
        const joined = await sock.groupAcceptInvite(match[1]);
        if (!joined || !String(joined).endsWith('@g.us')) throw new Error('WhatsApp did not return a group ID');
        const state = getGroups(); state.allowedGroups[joined] = { authorizedBy: normalizeJid(senderJid), authorizedAt: Date.now(), method: 'owner-join-link', permanent: true }; await SUPABASE.saveState(GROUPS_FILE, state);
        await send(sock, chatId, `Yaaay~ I joined the group successfully, senpai! 💗\nGroup ID: ${joined}`, msg);
      } catch (e) { await send(sock, chatId, `Awww~ I couldn't join that group, baka. The link may be invalid, expired, or unavailable. 🌸\n${String(e?.message || '').slice(0,180)}`, msg); }
      return true;
    }
    if (cmd === 'leave') {
      const target = String(args[0] || (isGroupChat(chatId) ? chatId : '')).trim();
      if (!/^\d{5,}-\d+@g\.us$|^\d{5,}@g\.us$/.test(target)) { await send(sock, chatId, 'Umm~ use /leave inside the group, or /leave <group-id> from chat, senpai~ 💗', msg); return true; }
      try {
        const groups = await sock.groupFetchAllParticipating();
        if (!groups?.[target]) { await send(sock, chatId, "Ehh~ I'm not in that group right now, senpai! 🌸", msg); return true; }
        await sock.groupLeave(target);
        const state = getGroups(); delete state.allowedGroups[target]; delete state.settings[target]; await SUPABASE.saveState(GROUPS_FILE, state);
        await send(sock, chatId, `Okay~ I left that group, senpai. Bye-bye! 🌸\nGroup ID: ${target}`, msg);
      } catch (e) { await send(sock, chatId, `Awww~ I couldn't leave that group, baka. 🌸\n${String(e?.message || '').slice(0,180)}`, msg); }
      return true;
    }
    const groups = await sock.groupFetchAllParticipating().catch(() => null);
    if (!groups) { await send(sock, chatId, 'Awww~ I could not fetch my group list right now, senpai. Try again in a moment~ 🌸', msg); return true; }
    const responseChat = isGroupChat(chatId) ? senderJid : chatId; // Keep the full group inventory private to the Owner.
    const responseQuote = responseChat === chatId ? msg : null;
    const wanted = String(args[0] || '').trim();
    if (wanted) {
      const g = groups[wanted];
      await send(sock, responseChat, g ? `Ehehe~ found it! 💗\nName: ${g.subject || '(name unavailable)'}\nID: ${wanted}` : `Ehh~ I'm not in that group, baka. 🌸`, responseQuote);
      return true;
    }
    const entries = Object.entries(groups);
    const lines = entries.length ? entries.map(([id,g],i) => `${i+1}. 🌸 ${String(g.subject || '(name unavailable)').replace(/[\r\n]/g,' ').slice(0,100)}\n   ID: ${id}`).join('\n\n') : "I'm not in any groups right now, senpai~ 🥺";
    await send(sock, responseChat, `╭━━〔 🌸 𝒀𝑼𝑲𝑰 — 𝑮𝑹𝑶𝑼𝑷𝑺 〕━━╮\n\n📊 Total Groups: ${entries.length}\n\n${lines}\n\nFufufu~ that's my group list! 💗\n╰━━━━━━━━━━━━━━━━━━╯`, responseQuote);
    return true;
  }

  await refreshStaffRoles({force:true});
  const role = roleOf(senderJid);
  const settings = groupSettings(chatId);

  // Group control is based on WhatsApp's real admin flag, not Yuki's global staff role.
  // Owner is the only global exception and retains full access.
  if (inGroup && GROUP_CONTROL_COMMANDS.has(cmd) && !isOwner(senderJid)) {
    const waAdmin = await isActualWhatsAppGroupAdmin(sock, chatId, senderJid);
    if (!waAdmin) {
      await send(sock, chatId, YUKI_DENIAL, msg);
      return true;
    }
  }

  if (maintenanceState() && !isPrivileged(senderJid,'guidance')) return true;
  if (inGroup) touchActivity(chatId, senderJid);

  // Global bot bans are enforced before any user command, including fun/anime/media.
  if (isBotBanned(senderJid) && !isOwner(senderJid)) {
    await send(sock, chatId, '⛔ You are currently blocked from using 𝒀𝒖𝒌𝒊’s commands.', msg);
    return true;
  }


  // /menu and command-specific help
  if (cmd === 'gs') {
    if (!inGroup) { await send(sock, chatId, '🌸 Use /gs inside the group whose settings you want to inspect.', msg); return true; }
    const s = groupSettings(chatId);
    const yes = v => v ? '✅ ENABLED' : '❌ DISABLED';
    const set = v => String(v || '').trim() ? '✅ SET' : '— NOT SET';
    let subject = '';
    try { subject = (await sock.groupMetadata(chatId))?.subject || ''; } catch {}
    const text = `╭━━〔 ❄️ 𝒀𝑼𝑲𝑰 — GROUP SETTINGS 〕━━╮
┃ 🏷️ Group: ${subject || 'Unknown'}
┃ 🆔 ID: ${chatId}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🌸 YUKI & GROUP 〕━━╮
┃ 🌸 Yuki group toggle: ${s.yukiEnabled === undefined ? '⚠️ NOT CONFIGURED' : yes(!!s.yukiEnabled)}
┃ 🎉 Welcome: ${yes(!!s.welcome)}
┃ 👋 Goodbye: ${yes(!!s.goodbye)}
┃ 🔗 Anti-link: ${yes(!!s.antilink)}
┃ 📜 Rules: ${set(s.rules)}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🎉 WELCOME MESSAGE 〕━━╮
${String(s.welcomeText || '(No custom welcome message saved)').split('\n').map(x => '┃ ' + x).join('\n')}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 👋 GOODBYE MESSAGE 〕━━╮
${String(s.goodbyeText || '(No custom goodbye message saved)').split('\n').map(x => '┃ ' + x).join('\n')}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🛡️ OTHER SETTINGS 〕━━╮
┃ 🔗 Anti-link mode: ${s.antilinkMode || 'all'}
┃ ⚠️ Users with warnings: ${Object.keys(s.warns || {}).length}
┃ 🔇 Muted users: ${Object.keys(s.muted || {}).length}
┃ 🚫 Banned users: ${Object.keys(s.bans || {}).length}
╰━━━━━━━━━━━━━━━━━━━━━━╯
🌸 Settings shown are the values currently loaded by Yuki.`;
    await send(sock, chatId, text, msg); return true;
  }

  if (cmd === 'menu') { await sendMenuMedia(sock,chatId,msg); return true; }
  if (cmd === 'help') {
    const requested = String(args[0] || '').toLowerCase().replace(/^\//, '');
    if (!requested) { await sendMenuMedia(sock,chatId,msg); return true; }
    const helpMap = {
      antilink: '`/antilink on|off` — Toggle Anti-Link. Actual group admin only (or bot Owner).',
      setantillink: '`/setantillink <platform|all|status>` — Configure Anti-Link mode. Actual group admin only (or bot Owner).',
      open: '`/open` — Open the group so everyone can send messages. Actual group admin only (or bot Owner).',
      close: '`/close` — Close the group so only admins can send messages. Actual group admin only (or bot Owner).',
      kick: '`/kick @user` — Remove a member. Actual group admin only (or bot Owner).',
      promote: '`/promote @user` — Promote a member to WhatsApp admin. Actual group admin only (or bot Owner).',
      demote: '`/demote @user` — Remove WhatsApp admin status. Actual group admin only (or bot Owner).',
      tagall: '`/tagall [message]` — Mention everyone. Actual group admin only (or bot Owner).',
      hidetag: '`/hidetag [message]` — Mention everyone without displaying the list. Actual group admin only (or bot Owner).',
    };
    const usage = helpMap[requested];
    if (usage) return send(sock,chatId,`📖 *HELP — /${requested} or /${requested}*\n\n${usage}`,msg).then(()=>true);
    return send(sock,chatId,`❔ No detailed help is available for "/${requested}" yet.\nUse */menu* to see the full command list.`,msg).then(()=>true);
  }
  if (cmd === 'uptime') {
    if(!isPrivileged(senderJid,'guidance')) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const sec=Math.floor(process.uptime()); const h=Math.floor(sec/3600); const m=Math.floor((sec%3600)/60); const s=sec%60;
    return send(sock,chatId,`⏱️ *Yuki Uptime*\n\n${h}h ${m}m ${s}s\n🟢 Status: online`,msg).then(()=>true);
  }

  if (cmd === 'maintenance') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const v=String(args[0]||'').toLowerCase();
    if(v==='on'){ setMaintenance(true,senderJid); return send(sock,chatId,'🛠️ Maintenance mode is now ON. 𝒀𝒖𝒌𝒊 will only process Owner/Mod/Guidance commands.',msg).then(()=>true); }
    if(v==='off'){ setMaintenance(false,senderJid); return send(sock,chatId,'🟢 Maintenance mode is now OFF. 𝒀𝒖𝒌𝒊 is back to normal.',msg).then(()=>true); }
    return send(sock,chatId,`Usage: /maintenance on | /maintenance off\nCurrent: ${maintenanceState()?'ON':'OFF'}`,msg).then(()=>true);
  }

  if (cmd === 'botstart' || cmd === 'resume') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    setMaintenance(false,senderJid);
    return send(sock,chatId,'🟢 𝒀𝒖𝒌𝒊 is back online and accepting commands. 🌸',msg).then(()=>true);
  }

  if (cmd === 'shutdown') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    await send(sock,chatId,'⏻ 𝒀𝒖𝒌𝒊 is shutting down safely. Render can bring her back online. 🌙',msg);
    setTimeout(()=>process.exit(0),1000); return true;
  }

  if (cmd === 'broadcast') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const message = await buildBroadcastMessage(msg, args.join(' ').trim());
    if (!message) return send(sock,chatId,'Usage: /broadcast <message> — or reply to a message/media and use /broadcast',msg).then(()=>true);
    const groups=await sock.groupFetchAllParticipating().catch(()=>({}));
    let sentCount=0, pinnedCount=0;
    for(const jid of Object.keys(groups||{})){
      try {
        const sent = await sock.sendMessage(jid, message);
        sentCount++;
        if (sent?.key && await botIsAdmin(sock, jid)) {
          try { await sock.sendMessage(jid, { pin: { key: sent.key, type: 1 } }); pinnedCount++; } catch (e) { console.log('[broadcast] pin skipped:', e?.message || e); }
        }
      } catch (e) { console.log('[broadcast] send failed:', jid, e?.message || e); }
    }
    return send(sock,chatId,`📢 Broadcast finished.\n
Sent: *${sentCount}* groups\nPinned: *${pinnedCount}* groups where Yuki is admin.`,msg).then(()=>true);
  }

  if (cmd === 'clear') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const ctx=msg?.message?.extendedTextMessage?.contextInfo||{}; if(!ctx.stanzaId) return send(sock,chatId,'↩️ Reply to a message, then use /clear.',msg).then(()=>true); const key={remoteJid:chatId,fromMe:false,id:ctx.stanzaId,participant:ctx.participant||undefined}; try{await sock.sendMessage(chatId,{delete:key}); return send(sock,chatId,'🧹 Cleared the replied message.',msg).then(()=>true);}catch{ return send(sock,chatId,'❌ I could not clear that message.',msg).then(()=>true);}
  }

  if (cmd === 'restart') {
    if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    await send(sock,chatId,'♻️ Restarting Yuki safely. Render will bring her back online automatically. 🌸',msg);
    setTimeout(()=>process.exit(0),1200);
    return true;
  }


  if (cmd === 'support') {
    const sub=String(args[0]||'').toLowerCase();
    if (sub === 'set' || sub === 'add') {
      if(!isOwner(senderJid)) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
      const key=String(args[1]||'').toLowerCase();
      const value=args.slice(2).join(' ').trim();
      if(!['youtube','whatsapp','tiktok'].includes(key) || !value) return send(sock,chatId,'Usage: /support set youtube <link> | whatsapp <link> | tiktok <link>',msg).then(()=>true);
      const data=readJSON(path.join(DATA_DIR,'support.json'),{}); data[key]=value; writeJSON(path.join(DATA_DIR,'support.json'),data);
      return send(sock,chatId,`✅ Support ${key} link saved.`,msg).then(()=>true);
    }
    const data=getSupportLinks();
    return send(sock,chatId,`📬 *Contact Support*\n\n▶️ YouTube: ${data.youtube||'Not set'}\n💬 WhatsApp: ${data.whatsapp||'Not set'}\n🎵 TikTok: ${data.tiktok||'Not set'}`,msg);

  }

  // Bot bans. Owner-only in this build. These block the user from using Yuki anywhere.
  if (cmd === 'ban' || cmd === 'unban' || cmd === 'bans') {
    if (!isPrivileged(senderJid,'guidance')) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const bans=getBotBans();
    if(cmd==='bans' || (cmd==='ban' && String(args[0]||'').toLowerCase()==='status')) {
      const list=Object.entries(bans);
      return send(sock,chatId,list.length?'🔒 *𝒀𝒖𝒌𝒊 Bot Bans*\n\n'+list.map(([j,v])=>`• @${digits(j)} — ${v?.reason||'No reason provided'}`).join('\n'):'✅ No users are banned from Yuki.',msg,list.map(([j])=>j)).then(()=>true);
    }
    const target=await targetFromArgs(args,msg,sock,chatId); if(!target) return send(sock,chatId,`Usage: /${cmd} @user${cmd==='ban'?' <reason>':''}`,msg).then(()=>true);
    if(isOwner(target) || rank[roleOf(target)]>=rank[roleOf(senderJid)]) return send(sock,chatId,'⛔ You cannot ban an equal or higher staff member.',msg).then(()=>true);
    if(cmd==='ban') {
      const hasTargetToken = parseTargets(msg).length === 0;
      const reason = (hasTargetToken ? args.slice(1) : args).join(' ').trim() || 'No reason provided';
      bans[target]={reason:reason.slice(0,300),by:normalizeJid(senderJid),at:Date.now()}; saveBotBans(bans);
      return send(sock,chatId,`🔒 @${digits(target)} is now banned from using Yuki.\nReason: ${reason.slice(0,300)}`,msg,[target]).then(()=>true);
    }
    delete bans[target]; saveBotBans(bans); return send(sock,chatId,`🔓 @${digits(target)} can use Yuki again.`,msg,[target]).then(()=>true);
  }

  // Activity
  if (cmd === 'rules') {
    return send(sock,chatId,settings.rules ? `📜 *GROUP RULES*\n\n${settings.rules}` : '📜 No group rules have been set yet. Use /setrules <rules>.',msg).then(()=>true);
  }
  if (cmd === 'setrules') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const value=args.join(' ').trim(); if(!value) return send(sock,chatId,'Usage: /setrules <rules>',msg).then(()=>true); settings.rules=value.slice(0,3000); saveGroupSettings(chatId,settings); return send(sock,chatId,'✅ Group rules saved.',msg).then(()=>true);
  }
  if (cmd === 'goodbye') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const v=(args[0]||'').toLowerCase(); if(v!=='on'&&v!=='off') return send(sock,chatId,'Usage: /goodbye on | /goodbye off',msg).then(()=>true); settings.goodbye=v==='on'; saveGroupSettings(chatId,settings); return send(sock,chatId,`👋 Goodbye messages are now *${settings.goodbye?'ON':'OFF'}*.`,msg).then(()=>true);
  }
  if (cmd === 'setgoodbye') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const value=raw.replace(new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'setgoodbye\\s*','i'),'').trim(); if(!/@user\b/i.test(value)) return send(sock,chatId,'❌ Goodbye message must contain @user.',msg).then(()=>true); settings.goodbyeText=value.slice(0,1500); saveGroupSettings(chatId,settings); return send(sock,chatId,'✅ Goodbye message saved.',msg).then(()=>true);
  }
  if (cmd === 'setname') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be a group admin first.',msg).then(()=>true); const name=args.join(' ').trim(); if(!name) return send(sock,chatId,'Usage: /setname <name>',msg).then(()=>true);
    try { await sock.groupUpdateSubject(chatId,name.slice(0,100)); return send(sock,chatId,'✅ Group name updated.',msg).then(()=>true); } catch(e){ return send(sock,chatId,'❌ Could not change the group name.',msg).then(()=>true); }
  }
  if (cmd === 'open' || cmd === 'close') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true); if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be a group admin first.',msg).then(()=>true);
    try { await sock.groupSettingUpdate(chatId,cmd==='close'?'announcement':'not_announcement'); return send(sock,chatId,cmd==='close'?'🔒 Group closed — only admins can send messages.':'🔓 Group opened — everyone can send messages.',msg).then(()=>true); } catch { return send(sock,chatId,'❌ Could not change group message permissions.',msg).then(()=>true); }
  }
  if (cmd === 'resetlink') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true); if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be a group admin first.',msg).then(()=>true);
    try { const code=await sock.groupRevokeInvite(chatId); return send(sock,chatId,`🔄 Group link reset.\nhttps://chat.whatsapp.com/${code}`,msg).then(()=>true); } catch { return send(sock,chatId,'❌ Could not reset the group link.',msg).then(()=>true); }
  }

  // Welcome
  if (cmd === 'welcome') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const v=(args[0]||'').toLowerCase();
    if(v==='on'||v==='off'){ settings.welcome=v==='on'; saveGroupSettings(chatId,settings); await send(sock,chatId,`🌸 Welcome messages are now *${settings.welcome?'ON':'OFF'}*.`,msg); }
    else await send(sock,chatId,'Usage: /welcome on | /welcome off',msg);
    return true;
  }
  if (cmd === 'setwelcome') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const value=raw.replace(new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'setwelcome\\s*','i'),'').trim();
    if(!/@user\b/i.test(value)) return send(sock,chatId,'❌ Your welcome must contain `@user` so I can tag the new member.',msg).then(()=>true);
    settings.welcomeText=value.slice(0,1500); saveGroupSettings(chatId,settings);
    await send(sock,chatId,'✅ Welcome message saved. Example: @user will be replaced with the new member tag.',msg); return true;
  }

  // Toggle protections
  // Anti-Link is intentionally stricter: only the bot owner or an actual
  // WhatsApp group admin can change it. Mod/Guidance roles cannot toggle it.
  if (cmd === 'setantillink') {
    const sender = normalizeJid(senderJid);
    const owner = isOwner(senderJid);
    const admins = await adminsOf(sock, chatId);
    const isWaAdmin = admins.has(sender);
    if (!owner && !isWaAdmin) return send(sock,chatId,'┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 ⛔ 𝘼𝘾𝘾𝙀𝙎𝙎 𝘿𝙀𝙉𝙄𝙀𝘿 」\n│✑ 𝙊𝙣𝙡𝙮 𝙩𝙝𝙚 𝙜𝙧𝙤𝙪𝙥 𝙊𝙬𝙣𝙚𝙧 𝙤𝙧 𝙖𝙘𝙩𝙪𝙖𝙡 𝙖𝙙𝙢𝙞𝙣𝙨 𝙘𝙖𝙣 𝙘𝙝𝙖𝙣𝙜𝙚 𝙩𝙝𝙞𝙨.\n└────────────┈ ⳹',msg).then(()=>true);
    const v=String(args[0]||'').toLowerCase();
    const allowed=['whatsapp','telegram','discord','facebook','instagram','all','status'];
    if(!allowed.includes(v)) return send(sock,chatId,'┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 📖 𝙐𝙎𝘼𝙂𝙀 」\n│✑ /setantillink whatsapp\n│✑ /setantillink telegram\n│✑ /setantillink discord\n│✑ /setantillink facebook\n│✑ /setantillink instagram\n│✑ /setantillink all\n│✑ /setantillink status\n│\n└────────────┈ ⳹',msg).then(()=>true);
    if(v==='status') {
      const mode=settings.antilinkMode||'all';
      return send(sock,chatId,`┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 📊 𝙎𝙏𝘼𝙏𝙐𝙎 」\n│✑ 🛡️ 𝙎𝙩𝙖𝙩𝙪𝙨: ${settings.antilink?'ON':'OFF'}\n│✑ 🔗 𝙈𝙤𝙙𝙚: ${mode.toUpperCase()}\n│✑ 🧹 𝙒𝙖𝙧𝙣𝙞𝙣𝙜𝙨: 𝟰 𝙢𝙖𝙭 𝙥𝙚𝙧 𝙪𝙨𝙚𝙧\n│\n└────────────┈ ⳹`,msg).then(()=>true);
    }
    settings.antilinkMode=v; saveGroupSettings(chatId,settings);
    return send(sock,chatId,`┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 ✨ 𝙎𝙀𝙏𝙏𝙄𝙉𝙂 𝙎𝘼𝙑𝙀𝘿 」\n│✑ 🔗 𝙈𝙤𝙙𝙚: ${v.toUpperCase()}\n│✑ 🛡️ 𝘼𝙣𝙩𝙞-𝙇𝙞𝙣𝙠: ${settings.antilink?'ON':'OFF'}\n│✑ 💾 𝙎𝙖𝙫𝙚𝙙 𝙥𝙚𝙧 𝙜𝙧𝙤𝙪𝙥\n│\n└────────────┈ ⳹`,msg).then(()=>true);
  }
  if (cmd === 'antilink') {
    const sender = normalizeJid(senderJid);
    const owner = isOwner(senderJid);
    const admins = await adminsOf(sock, chatId);
    const isWaAdmin = admins.has(sender);
    if (!owner && !isWaAdmin) return send(sock,chatId,'┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 ⛔ 𝘼𝘾𝘾𝙀𝙎𝙎 𝘿𝙀𝙉𝙄𝙀𝘿 」\n│✑ 𝙊𝙣𝙡𝙮 𝙩𝙝𝙚 𝙜𝙧𝙤𝙪𝙥 𝙊𝙬𝙣𝙚𝙧 𝙤𝙧 𝙖𝙘𝙩𝙪𝙖𝙡 𝙖𝙙𝙢𝙞𝙣𝙨 𝙘𝙖𝙣 𝙘𝙝𝙖𝙣𝙜𝙚 𝘼𝙣𝙩𝙞-𝙇𝙞𝙣𝙠.\n└────────────┈ ⳹',msg).then(()=>true);
    const v=(args[0]||'').toLowerCase();
    if(!['on','off'].includes(v)) return send(sock,chatId,'┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 📖 𝙐𝙎𝘼𝙂𝙀 」\n│✑ /antilink on\n│✑ /antilink off\n└────────────┈ ⳹',msg).then(()=>true);
    settings.antilink=v==='on'; saveGroupSettings(chatId,settings);
    await send(sock,chatId,`┌─❖\n│「 🫧 𝙔𝙐𝙆𝙄 𝘼𝙉𝙏𝙄-𝙇𝙄𝙉𝙆 」\n└┬❖ 「 🛡️ 𝙎𝙏𝘼𝙏𝙐𝙎 」\n│✑ 𝘼𝙣𝙩𝙞-𝙇𝙞𝙣𝙠: ${settings.antilink?'ON':'OFF'}\n│✑ 🔗 𝙈𝙤𝙙𝙚: ${(settings.antilinkMode||'all').toUpperCase()}\n└────────────┈ ⳹`,msg); return true;
  }

  // Moderation helpers
  const modAction = async (action) => {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be a WhatsApp group admin first.',msg).then(()=>true);
    return action();
  };

  if (cmd === 'promote' || cmd === 'demote' || cmd === 'kick') {
    const target=await targetFromArgs(args,msg,sock,chatId);
    if(!target) return send(sock,chatId,`Usage: /${cmd} @user or reply to a member.`,msg).then(()=>true);
    const senderAdmin = await isActualWhatsAppGroupAdmin(sock,chatId,senderJid);
    const targetAdmin = await isActualWhatsAppGroupAdmin(sock,chatId,target);
    if(!canManageTarget(senderJid,target,senderAdmin,targetAdmin)) return send(sock,chatId,'⛔ You cannot manage the Owner, Mod, Guidance, or an equal/higher staff member.',msg).then(()=>true);
    return modAction(async()=>{
      try { await sock.groupParticipantsUpdate(chatId,[target],cmd==='kick'?'remove':cmd); await send(sock,chatId,`✅ ${cmd} completed for @${digits(target)}.`,msg,[target]); }
      catch(e){ await send(sock,chatId,`❌ ${cmd} failed: ${e.message}`,msg); }
      return true;
    });
  }

  if (cmd === 'tagall' || cmd === 'hidetag') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const meta=await sock.groupMetadata(chatId).catch(()=>null);
    if(!meta) return send(sock,chatId,'❌ I could not read the group members.',msg).then(()=>true);
    const members=(meta.participants||[]).map(p=>normalizeJid(p.id)).filter(Boolean);
    const note=args.join(' ').trim();
    if(cmd==='hidetag') await sock.sendMessage(chatId,{text:cuteResponse(note||'Ehehe~ 🌸'),mentions:members},{quoted:msg});
    else await sock.sendMessage(chatId,{text:cuteResponse((note?note+'\n\n':'')+members.map(x=>'• @'+digits(x)).join('\n')),mentions:members},{quoted:msg});
    return true;
  }

  if (cmd === 'warn' || cmd === 'clearwarn') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const target=await targetFromArgs(args,msg,sock,chatId);
    if(!target) return send(sock,chatId,`Usage: /${cmd} @user`,msg).then(()=>true);
    const senderIsOwner = isOwner(senderJid);
    const senderIsGroupAdmin = await isActualWhatsAppGroupAdmin(sock,chatId,senderJid);
    const targetIsGroupAdmin = await isActualWhatsAppGroupAdmin(sock,chatId,target);
    if (!canManageTarget(senderJid,target,senderIsGroupAdmin,targetIsGroupAdmin)) {
      return send(sock,chatId, senderIsOwner ? '⛔ You cannot warn yourself or another configured Owner.' : '⛔ Group admins can only manage regular members, not peer admins or the Owner.',msg).then(()=>true);
    }
    settings.warns=settings.warns||{};
    if(cmd==='clearwarn'){
      delete settings.warns[target]; saveGroupSettings(chatId,settings); await send(sock,chatId,`🧹 Warnings cleared for @${digits(target)}.`,msg,[target]); return true;
    }
    settings.warns[target]=(settings.warns[target]||0)+1; const n=settings.warns[target]; saveGroupSettings(chatId,settings);
    if(n>=3 && await botIsAdmin(sock,chatId)){
      try { await sock.groupParticipantsUpdate(chatId,[target],'remove'); delete settings.warns[target]; saveGroupSettings(chatId,settings); await send(sock,chatId,`⚠️ @${digits(target)} reached 3 warns and was removed.`,msg,[target]); }
      catch { await send(sock,chatId,`⚠️ @${digits(target)} reached 3 warns, but I couldn't remove them.`,msg,[target]); }
    } else await send(sock,chatId,`⚠️ @${digits(target)} received warning ${n}/3.`,msg,[target]);
    return true;
  }

  if (cmd === 'setdesc') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const desc=args.join(' ').trim(); if(!desc) return send(sock,chatId,'Usage: /setdesc <description>',msg).then(()=>true);
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ I need group-admin permission to change the description.',msg).then(()=>true);
    try { await sock.groupUpdateDescription(chatId,desc.slice(0,500)); await send(sock,chatId,'📝 Group description updated.',msg); } catch(e){ await send(sock,chatId,'❌ Could not update description: '+e.message,msg); }
    return true;
  }

  if (cmd === 'invite') {
    // Any group member may request the real invite link; Yuki herself must have admin rights.
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ I need group-admin permission to fetch the group link.',msg).then(()=>true);
    try { const code=await sock.groupInviteCode(chatId); await send(sock,chatId,`🔗 https://chat.whatsapp.com/${code}`,msg); } catch(e){ await send(sock,chatId,'❌ Could not get the group link.',msg); }
    return true;
  }

  if (cmd === 'delete' || cmd === 'd') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be group admin to delete messages.',msg).then(()=>true);
    const ctx=msg?.message?.extendedTextMessage?.contextInfo||{};
    if(!ctx.stanzaId) return send(sock,chatId,'↩️ Reply to the message you want me to delete.',msg).then(()=>true);
    const key={remoteJid:chatId,fromMe:false,id:ctx.stanzaId,participant:ctx.participant||undefined};
    try { await sock.sendMessage(chatId,{delete:key}); await send(sock,chatId,'🗑️ Deleted.',msg); } catch(e){ await send(sock,chatId,'❌ Delete failed. I may need admin permission.',msg); }
    return true;
  }

  if (cmd === 'pin' || cmd === 'unpin') {
    if(!(await hasGroupAdminAccess(sock,chatId,senderJid))) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    if(!(await botIsAdmin(sock,chatId))) return send(sock,chatId,'⚠️ Yuki must be group admin to pin/unpin.',msg).then(()=>true);
    const ctx=msg?.message?.extendedTextMessage?.contextInfo||{};
    if(!ctx.stanzaId) return send(sock,chatId,`↩️ Reply to a message, then use .${cmd}.`,msg).then(()=>true);
    const key={remoteJid:chatId,fromMe:normalizeJid(ctx.participant||'')===normalizeJid(sock.user?.id||''),id:ctx.stanzaId,participant:ctx.participant||undefined};
    try { await sock.sendMessage(chatId,{pin:{key,type:cmd==='pin'?1:0}}); await send(sock,chatId,cmd==='pin'?'📌 Pinned.':'📌 Unpinned.',msg); } catch(e){ console.log('pin error:',e.message); await send(sock,chatId,'❌ Pin failed. Make sure 𝒀𝒖𝒌𝒊 is admin and the replied message can be pinned.',msg); }
    return true;
  }

  if (cmd === 'mute' || cmd === 'unmute') {
    const senderIsGroupAdmin = await hasGroupAdminAccess(sock,chatId,senderJid);
    if(!senderIsGroupAdmin) return send(sock,chatId,YUKI_DENIAL,msg).then(()=>true);
    const target=normalizeJid(await targetFromArgs(args,msg,sock,chatId)); if(!target) return send(sock,chatId,`Usage: /${cmd} @user`,msg).then(()=>true);
    if(normalizeJid(target)===normalizeJid(senderJid)) return send(sock,chatId,'⛔ You cannot mute or unmute yourself.',msg).then(()=>true);
    const senderRole=roleOf(senderJid), targetRole=roleOf(target);
    const senderIsOwner=isOwner(senderJid), senderIsGlobalStaff=isPrivileged(senderJid,'guidance');
    // A normal WhatsApp group admin may mute/unmute regular members only.
    // Global Guidance/Mod/Owner staff follow the existing hierarchy and cannot be overridden by lower staff.
    if(!senderIsOwner && !senderIsGlobalStaff && targetRole!=='member') return send(sock,chatId,'⛔ Group admins can only mute/unmute regular members.',msg).then(()=>true);
    if(!senderIsOwner && senderIsGlobalStaff && rank[senderRole] <= rank[targetRole]) return send(sock,chatId,'⛔ You cannot mute/unmute equal or higher staff.',msg).then(()=>true);
    settings.muted=settings.muted||{};
    if(cmd==='mute'){ settings.muted[target]={by:normalizeJid(senderJid),at:Date.now()}; saveGroupSettings(chatId,settings); return send(sock,chatId,`🔇 @${digits(target)} is now muted from Yuki in this group.`,msg,[target]).then(()=>true); }
    if(!settings.muted[target]) return send(sock,chatId,`ℹ️ @${digits(target)} is not muted.`,msg,[target]).then(()=>true);
    delete settings.muted[target]; saveGroupSettings(chatId,settings); return send(sock,chatId,`🔊 @${digits(target)} is now unmuted for Yuki in this group.`,msg,[target]).then(()=>true);
  }



  return false;
}

async function preMessage({sock,msg,text,chatId,inGroup,senderJid}) {
  if(!inGroup) return { ignore: true };
  touchActivity(chatId, senderJid);

  // Automatic Owner reaction: actual WhatsApp mention metadata, sequential sticker rotation.
  await reactToOwnerMention(sock, msg, chatId, inGroup).catch(() => {});

  if (isBotBanned(senderJid) && !isPrivileged(senderJid,'guidance')) {
    return { ignore: true };
  }
  const gs0 = groupSettings(chatId);
  if (gs0.muted && gs0.muted[normalizeJid(senderJid)] && !isPrivileged(senderJid,'guidance')) return { ignore: true };
  if (maintenanceState() && !isPrivileged(senderJid,'guidance')) return { ignore: true };

  // Reject users who are blocked from bot features.
  if(isBotBanned(senderJid) && !isOwner(senderJid) && isCommand(text)) {
    await send(sock,chatId,'⛔ You are blocked from using Yuki commands.',msg);
    return {ignore:true};
  }

  return {ignore:false};
}

async function onGroupParticipantsUpdate({sock,update}) {
  await refreshStaffRoles({force:true});
  const jid=normalizeJid(update?.id || update?.jid || '');
  const action=String(update?.action || '');
  const participants=(update?.participants||[]).map(normalizeJid).filter(Boolean);
  if(!jid || !participants.length) return;
  const me=normalizeJid(sock?.user?.id||'');
  const actor=normalizeJid(update?.author || update?.actor || update?.by || '');
  const g=getGroups();
  if(action==='remove') {
    const s=groupSettings(jid);
    if(s.goodbye) {
      for(const p of participants) { if(p===me) continue; const text=templateWelcome(s.goodbyeText,p); await sock.sendMessage(jid,{text,mentions:[p]}).catch(()=>{}); }
    }
  }
  g.allowedGroups=g.allowedGroups||{};

  if(action==='add' && participants.includes(me)) {
    const authorizedByActor = actor && isOwner(actor);
    const alreadyAuthorized = !!g.allowedGroups[jid];
    if (!alreadyAuthorized) {
      g.allowedGroups[jid] = {
        authorizedBy: actor || null,
        authorizedAt: Date.now(),
        method: authorizedByActor ? 'added-by-owner' : 'group-added',
        permanent: true
      };
      await SUPABASE.saveState(GROUPS_FILE, g);
    }
    const s=groupSettings(jid);
    const welcomeTarget = actor || participants[0];
    const botWelcome = `🌸 Thank you for adding Yuki to the group!\n\nHi everyone, I’m Yuki. I’ll stay here unless the configured Owner explicitly uses /leave. 💙\n\n👑 Added/authorized by: @${digits(welcomeTarget)}\n✨ Use */menu* to see what I can do.`;
    await sock.sendMessage(jid,{text:botWelcome,mentions:welcomeTarget?[welcomeTarget]:[]}).catch(()=>{});
    return;
  }

  // Membership is never revoked automatically. Only the configured Owner's
  // explicit /leave command may call groupLeave(). Record every group addition.
  if (!g.allowedGroups[jid]) {
    g.allowedGroups[jid] = { authorizedBy: actor || null, authorizedAt: Date.now(), method: actor && isOwner(actor) ? 'owner-added' : 'group-added', permanent: true };
    await SUPABASE.saveState(GROUPS_FILE, g);
  }

  if(action==='add') {
    const s=groupSettings(jid);
    s.bans=s.bans||{};
    for(const p of participants) {
      if(p===me) continue;
      if(s.bans[p]) {
        if(await botIsAdmin(sock,jid)) await sock.groupParticipantsUpdate(jid,[p],'remove').catch(()=>{});
        continue;
      }
      if(s.welcome) {
        const text=templateWelcome(s.welcomeText,p);
        await sock.sendMessage(jid,{text,mentions:[p]}).catch(()=>{});
      }
    }
  }
}


async function hydrateSupabaseState() {
  await refreshStaffRoles({force:true});
  const files = [GROUPS_FILE, ACTIVITY_FILE, path.join(DATA_DIR,'menu-media.json'), BOTBAN_FILE, QUIET_FILE, MAINTENANCE_FILE, YUKI_REACTION_STATE_FILE, path.join(DATA_DIR,'support.json')];
  // Include other known JSON-backed state stores so remote state is restored before commands run.
  for (const name of ['active-chats.json']) files.push(path.join(DATA_DIR, name));

  await SUPABASE.hydrateJsonFiles(files);

  const remoteBans = await SUPABASE.loadBotBans();
  if (remoteBans && Object.keys(remoteBans).length) {
    const localBans = getBotBans();
    const merged = { ...localBans, ...remoteBans };
    writeJSON(BOTBAN_FILE, merged);
  }
}

module.exports = {
  MENU,
  roleOf,
  refreshStaffRoles,
  rank,
  isOwner,
  isPrivileged,
  isActualWhatsAppGroupAdmin,
  canManageTarget,
  groupSettings,
  saveGroupSettings,
  persistGroupSettings,
  incrementAntiLinkWarning,
  handleFeatureCommand,
  preMessage,
  onGroupParticipantsUpdate,
  startQuietWatcher,
  ownerJid,
  hydrateSupabaseState,
  maintenanceState,
  setMaintenance,
  isBotBanned,
  botBanInfo,
  sendTyping,
  getPrefix,
  sendMenuMedia,
  getGroupActivity,
  reactToOwnerMention,
};

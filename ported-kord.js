'use strict';
// Compatibility port of selected Kord commands for Yuki's Baileys 6.x runtime.
// External API endpoints are public third-party services; configure optional keys in .env.
const axios = require('axios');
const FEATURES = require('./features');
const SUPABASE = require('./supabase');

const enc = encodeURIComponent;
const aliases = new Map();
function map(names, fn) { for (const n of names.split('|')) aliases.set(n, fn); }
const api = axios.create({ timeout: 25000, headers: { 'User-Agent': 'YukiBot/1.0' } });
const { configuredBlockedWords, containsBlockedWord } = require('./antiword');
function groupJid(jid) { return String(jid||'').endsWith('@g.us'); }
function senderJid(msg) { return msg.key?.participantPn || msg.key?.participantAlt || msg.key?.participant || msg.key?.remoteJid || ''; }
function normJid(v) { return String(v || '').replace(/:\d+/, ''); }
function jidDigits(v) { return normJid(v).split('@')[0].replace(/\D/g, ''); }
function identityMatches(a,b) { const x=normJid(a), y=normJid(b); return !!x && !!y && (x===y || (jidDigits(x).length>=7 && jidDigits(x)===jidDigits(y))); }
async function isAdmin(sock, jid, who) {
  try {
    const meta=await sock.groupMetadata(jid);
    return (meta.participants||[]).some(p => ['admin','superadmin'].includes(p.admin) && [p.id,p.jid,p.lid,p.phoneNumber].some(v => identityMatches(v,who)));
  } catch { return false; }
}
async function botAdmin(sock,jid) { return isAdmin(sock,jid,sock.user?.id || sock.user?.lid || ''); }
function send(sock,jid,text,msg,extra={}) { return sock.sendMessage(jid,{text,...extra},{quoted:msg}); }
function setting(jid) { return FEATURES.groupSettings(jid); }
function saveSetting(jid,s) { FEATURES.saveGroupSettings(jid,s); }
async function json(url) { const r=await api.get(url); return r.data; }

// Independent anime metadata fallback. Jikan remains primary; AniList is queried
// only when the primary request fails or has no usable results.
async function searchAniList(search, type='ANIME', perPage=5) {
  const query = `query ($search: String, $type: MediaType, $perPage: Int) { Page(perPage: $perPage) { media(search: $search, type: $type, isAdult: false, sort: SEARCH_MATCH) { id siteUrl title { romaji english native } description(asHtml: false) episodes chapters volumes averageScore status format startDate { year month day } coverImage { large } } } }`;
  const response = await api.post('https://graphql.anilist.co', {
    query,
    variables: { search: String(search || '').slice(0, 100), type, perPage: Math.min(Math.max(Number(perPage) || 5, 1), 10) }
  }, { timeout: 12000, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
  const items = response.data?.data?.Page?.media;
  if (!Array.isArray(items)) throw new Error('AniList returned no media results');
  return items.map(a => ({
    title: a.title?.english || a.title?.romaji || a.title?.native || 'Untitled',
    url: a.siteUrl || `https://anilist.co/${type === 'MANGA' ? 'manga' : 'anime'}/${a.id}`,
    score: a.averageScore ? a.averageScore / 10 : null,
    episodes: a.episodes ?? null, chapters: a.chapters ?? null, volumes: a.volumes ?? null,
    status: a.status || 'Unknown', type: a.format || 'Unknown',
    year: a.startDate?.year || null,
    synopsis: String(a.description || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"'),
    images: { jpg: { large_image_url: a.coverImage?.large, image_url: a.coverImage?.large } },
    source: 'AniList'
  }));
}
async function searchAnimeWithFallback(title, perPage=5) {
  let primaryError;
  try {
    const d = await json('https://api.jikan.moe/v4/anime?q=' + enc(title) + '&limit=' + Math.min(perPage, 10));
    if (Array.isArray(d?.data) && d.data.length) return { items: d.data, source: 'Jikan' };
  } catch (error) { primaryError = error; }
  try {
    const items = await searchAniList(title, 'ANIME', perPage);
    if (items.length) return { items, source: 'AniList' };
  } catch (fallbackError) {
    if (primaryError) console.warn('[anime-search] primary and fallback failed:', primaryError.message, fallbackError.message);
    else console.warn('[anime-search] AniList fallback failed:', fallbackError.message);
  }
  return { items: [], source: null };
}
async function searchMangaWithFallback(title, perPage=5) {
  let primaryError;
  try {
    const d = await json('https://api.jikan.moe/v4/manga?q=' + enc(title) + '&limit=' + Math.min(perPage, 10));
    if (Array.isArray(d?.data) && d.data.length) return { items: d.data, source: 'Jikan' };
  } catch (error) { primaryError = error; }
  try {
    const items = await searchAniList(title, 'MANGA', perPage);
    if (items.length) return { items, source: 'AniList' };
  } catch (fallbackError) {
    if (primaryError) console.warn('[manga-search] primary and fallback failed:', primaryError.message, fallbackError.message);
    else console.warn('[manga-search] AniList fallback failed:', fallbackError.message);
  }
  return { items: [], source: null };
}
function assertSafeMediaUrl(value) {
  let u;
  try { u = new URL(String(value || '')); } catch { throw new Error('Invalid media URL'); }
  if (u.protocol !== 'https:') throw new Error('Media URLs must use HTTPS');
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host) || host === '::1' || host.startsWith('[')) {
    throw new Error('Private or local media hosts are not allowed');
  }
  return u.toString();
}
function validateRedirect(options) {
  const protocol = options.protocol || 'https:';
  const host = options.hostname || options.host || '';
  const port = options.port ? `:${options.port}` : '';
  const target = `${protocol}//${host}${port}${options.path || '/'}`;
  assertSafeMediaUrl(target);
}
async function sendImageUrl(sock,jid,url,caption,msg) {
  url = assertSafeMediaUrl(url);
  const r=await api.get(url,{responseType:'arraybuffer',timeout:30000,maxContentLength:15*1024*1024,maxBodyLength:15*1024*1024,maxRedirects:3,beforeRedirect:validateRedirect});
  const ct=String(r.headers['content-type']||'image/jpeg').split(';')[0];
  if (!ct.startsWith('image/')) throw new Error('Provider did not return an image');
  const buffer = Buffer.from(r.data);
  await sock.sendMessage(jid,{image:buffer,mimetype:ct,caption:caption||''},{quoted:msg});
}
map('anime', async ({sock,jid,msg,arg})=>{
  if(!arg) return send(sock,jid,'Usage: /anime <anime name>',msg);
  const result=await searchAnimeWithFallback(arg,1); const a=result.items[0];
  if(!a) return send(sock,jid,'🌸 Yuki could not find that anime right now. Please try another title in a moment.',msg);
  const cap=`🎬 *${a.title}*\nType: ${a.type||'Unknown'} | Score: ${a.score||'N/A'}\nEpisodes: ${a.episodes||'Unknown'}\nStatus: ${a.status||'Unknown'}\nAired: ${a.aired?.string||a.year||'Unknown'}\nSource: ${result.source}\n\n${String(a.synopsis||'No synopsis').slice(0,2200)}\n\n${a.url||''}`;
  if(a.images?.jpg?.large_image_url) { try { await sendImageUrl(sock,jid,a.images.jpg.large_image_url,cap,msg); return; } catch(e) { console.warn('[anime] cover image unavailable:',e.message); } }
  await send(sock,jid,cap,msg);
});
map('manga', async ({sock,jid,msg,arg})=>{
  if(!arg) return send(sock,jid,'Usage: /manga <title>',msg);
  const result=await searchMangaWithFallback(arg,1); const a=result.items[0];
  if(!a) return send(sock,jid,'🌸 Yuki could not find that manga right now. Please try another title in a moment.',msg);
  await send(sock,jid,`📚 *${a.title}*\nScore: ${a.score||'N/A'}\nChapters: ${a.chapters||'Unknown'}\nVolumes: ${a.volumes||'Unknown'}\nStatus: ${a.status||'Unknown'}\nSource: ${result.source}\n\n${String(a.synopsis||'').slice(0,1800)}\n\n${a.url||''}`,msg);
});
map('animequote', async ({sock,jid,msg})=>{
  const d=await json('https://yurippe.vercel.app/api/quotes?random=1'); const q=Array.isArray(d)?d[0]:d;
  await send(sock,jid,`❝ ${q.quote||q.text||'No quote available'} ❞\n— ${q.character||'Unknown'} (${q.show||q.anime||'Anime'})`,msg);
});
map('animenews', async ({sock,jid,msg,arg})=>{
  const d=await json('https://api.jikan.moe/v4/anime?q='+enc(arg||'')+'&order_by=popularity&limit=5');
  await send(sock,jid,(d.data||[]).map(a=>`• ${a.title}\n${a.url}`).join('\n\n')||'No results.',msg);
});
map('character|animechar', async ({sock,jid,msg,arg})=>{
  if(!arg) return send(sock,jid,'Usage: /character <name>',msg);
  const c=(await json('https://api.jikan.moe/v4/characters?q='+enc(arg)+'&limit=1')).data?.[0];
  if(!c) return send(sock,jid,'No character found.',msg);
  const cap=`🌸 *${c.name}*\n${(c.nicknames||[]).join(', ')}\n\n${String(c.about||'').slice(0,1800)}`;
  if(c.images?.jpg?.image_url) await sendImageUrl(sock,jid,c.images.jpg.image_url,cap,msg); else await send(sock,jid,cap,msg);
});
map('animesearch|animeinfo', async ({sock,jid,msg,arg})=>{
  if(!arg) return send(sock,jid,'Usage: /animesearch <title>',msg);
  const result=await searchAnimeWithFallback(arg,5);
  await send(sock,jid,(result.items||[]).map(a=>`🎬 *${a.title}* (${a.year||'—'})\nScore: ${a.score||'N/A'} | ${a.episodes||'?'} eps\n${a.url||''}`).join('\n\n')||'🌸 Yuki could not find results right now. Please try again shortly.',msg);
});
map('animewatch|watching', async ({sock,jid,msg,arg})=>{
  if(!arg) return send(sock,jid,'Usage: /animewatch <anime title>',msg);
  const a=(await json('https://api.jikan.moe/v4/anime?q='+enc(arg)+'&limit=1')).data?.[0];
  if(!a) return send(sock,jid,'No result found.',msg);
  await send(sock,jid,`▶️ *${a.title}*\nWatch/search legally: ${a.url}\nAvailability depends on your region and streaming services.`,msg);
});
map('season|animeseason', async ({sock,jid,msg,arg})=>{
  const now=new Date(), y=Number(arg?.match(/\b20\d{2}\b/)?.[0]||now.getFullYear());
  const m=now.getMonth(), season= m<3?'winter':m<6?'spring':m<9?'summer':'fall';
  const d=await json(`https://api.jikan.moe/v4/seasons/${y}/${season}?limit=10`);
  await send(sock,jid,`🌸 Anime season (${y} ${season})\n`+(d.data||[]).map(a=>`• ${a.title} — ${a.score||'N/A'}\n${a.url}`).join('\n'),msg);
});
map('animerec|recommend', async ({sock,jid,msg,arg})=>{
  if(arg) {
    const a=(await json('https://api.jikan.moe/v4/anime?q='+enc(arg)+'&limit=1')).data?.[0];
    if(a) { const d=await json(`https://api.jikan.moe/v4/anime/${a.mal_id}/recommendations`); return send(sock,jid,(d.data||[]).slice(0,8).map(x=>`• ${x.entry?.title}\n${x.entry?.url}`).join('\n')||'No recommendations.',msg); }
  }
  const d=await json('https://api.jikan.moe/v4/recommendations/anime'); await send(sock,jid,(d.data||[]).slice(0,8).map(x=>`• ${x.entry?.[0]?.title||x.entry?.title}`).join('\n')||'No recommendations.',msg);
});
map('airing|nextep', async ({sock,jid,msg})=>{
  const d=await json('https://api.jikan.moe/v4/top/anime?filter=airing&limit=5');
  await send(sock,jid,'📡 Currently airing anime\n'+(d.data||[]).map(a=>`• ${a.title} — ${a.score||'N/A'}\n${a.url}`).join('\n'),msg);
});
// Fun/interaction commands intentionally removed from this bot build.

map('antiword', async ({sock,jid,msg,arg,command})=>{
  if(!groupJid(jid)) return send(sock,jid,'This command only works in groups.',msg);
  if(!await isAdmin(sock,jid,senderJid(msg)) && !FEATURES.isOwner(senderJid(msg))) return send(sock,jid,'Only group admins or the bot owner can change protection settings.',msg);
  const s=setting(jid); const value=String(arg||'').toLowerCase();
  if(!['on','off'].includes(value)) return send(sock,jid,`Usage: /${command} on/off`,msg);
  if(command==='antiword' && value==='on' && configuredBlockedWords().length===0) {
    return send(sock,jid,'⚠️ Antiword was not enabled: configure ANTIWORD_LIST in the hosting environment first (comma-separated terms).',msg);
  }
  s[command]=value==='on'; saveSetting(jid,s);
  await send(sock,jid,`🛡️ ${command} ${s[command]?'enabled':'disabled'}.`,msg);
});
async function handleCommand({sock,msg,text,chatId}) {
  const match=String(text||'').trim().match(/^\/(\S+)(?:\s+([\s\S]*))?$/);
  if(!match) return false;
  const command=match[1].toLowerCase(), fn=aliases.get(command);
  if(!fn) return false;
  try { await fn({sock,msg,jid:chatId,arg:(match[2]||'').trim(),command}); }
  catch(e) { console.error('[ported Kord command]',command,e?.response?.status||'',e.message); await send(sock,chatId,`⚠️ /${command} failed. The provider or media request was unavailable; please try again later.`,msg).catch(()=>{}); }
  return true;
}
async function moderateMessage({sock,msg,chatId,text}) {
  if(!groupJid(chatId)) return;
  const s=setting(chatId); const sender=senderJid(msg);
  if(!sender || msg?.key?.fromMe === true || identityMatches(sender, sock?.user?.id) || identityMatches(sender, sock?.user?.lid) || await isAdmin(sock,chatId,sender) || FEATURES.isOwner(sender)) return;
  if(s.antiword) {
    if(containsBlockedWord(text)) {
      if(await botAdmin(sock,chatId)) await sock.sendMessage(chatId,{delete:{remoteJid:chatId,fromMe:false,id:msg.key.id,participant:sender}}).catch(()=>{});
      return;
    }
  }
}
module.exports = { handleCommand, moderateMessage, commandNames:()=>Array.from(aliases.keys()) };

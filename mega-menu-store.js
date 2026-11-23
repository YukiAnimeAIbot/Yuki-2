'use strict';
// Mega-backed menu media. Metadata is mirrored to Supabase and cached locally.
const path = require('path');
const SUPABASE = require('./supabase');
const DATA_DIR = process.env.YUKI_DATA_DIR && !process.env.YUKI_DATA_DIR.startsWith('/var/data')
  ? process.env.YUKI_DATA_DIR : path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'menu-media.json');
const MAX_BYTES = 50 * 1024 * 1024;
let storagePromise = null;
function readState() { return typeof SUPABASE.readCachedState === 'function' ? SUPABASE.readCachedState(STATE_FILE, null) : null; }
function writeState(state) {
  const save = typeof SUPABASE.writeCachedState === 'function' ? SUPABASE.writeCachedState(STATE_FILE, state) : SUPABASE.saveState(STATE_FILE, state);
  return Promise.resolve(save).catch(e => { console.error('[menu-media] Supabase metadata save failed:', e.message); throw e; });
}
async function getStorage() {
  if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) throw new Error('Set MEGA_EMAIL and MEGA_PASSWORD in the hosting environment.');
  if (!storagePromise) storagePromise = (async () => {
    const { Storage } = require('megajs');
    const storage = new Storage({ email: process.env.MEGA_EMAIL, password: process.env.MEGA_PASSWORD });
    await storage.ready;
    return storage;
  })().catch(e => { storagePromise = null; throw e; });
  return storagePromise;
}
function extFor(mime, fileName, type) {
  const fromName = path.extname(fileName || '').replace(/[^.a-z0-9]/gi, '').slice(0, 10);
  if (fromName) return fromName;
  const known = { image: 'jpg', video: 'mp4', audio: 'mp3', sticker: 'webp', document: 'bin' };
  const subtype = String(mime || '').split('/')[1]?.split(';')[0];
  return '.' + ((subtype && /^[a-z0-9.+-]+$/i.test(subtype)) ? subtype : (known[type] || 'bin'));
}
async function save(buffer, meta) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_BYTES) throw new Error('Menu media must be between 1 byte and 50 MB.');
  const storage = await getStorage();
  const name = `yuki-menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extFor(meta.mimetype, meta.fileName, meta.type)}`;
  const uploaded = await storage.root.upload({ name }, buffer).complete;
  const state = { provider: 'mega', name, type: meta.type, mimetype: meta.mimetype || 'application/octet-stream', fileName: meta.fileName || name, ptt: !!meta.ptt, gifPlayback: !!meta.gifPlayback, size: buffer.length, updatedAt: new Date().toISOString() };
  // A new menu media reference replaces the active reference; old Mega files are left untouched for safety.
  await writeState(state);
  return state;
}
async function load() {
  const state = readState();
  if (!state || state.provider !== 'mega' || !state.name) return null;
  const storage = await getStorage();
  await storage.ready;
  const file = (storage.root.children || []).find(item => item.name === state.name);
  if (!file) throw new Error(`Menu media ${state.name} was not found in the configured Mega account.`);
  const buffer = await file.downloadBuffer();
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Mega returned an empty menu media file.');
  return { state, buffer };
}
module.exports = { MAX_BYTES, save, load, readState };

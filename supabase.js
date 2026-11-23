'use strict';

// Minimal Supabase bridge retained for bot runtime state and bot bans only.
const path = require('path');
const config = require('./config');
const writeQueues = new Map();
const stateCache = new Map();
const REQUIRED_TABLES = ['bot_state', 'bot_bans', 'group_settings', 'yuki_memories'];
let client = null;
let initTried = false;

function getClient() {
  if (initTried) return client;
  initTried = true;
  const url = process.env.SUPABASE_URL || config.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (e) { console.log('⚠️ Supabase disabled:', e.message); }
  return client;
}
function isEnabled() { return !!getClient(); }
function isConfigured() {
  return !!(process.env.SUPABASE_URL || config.SUPABASE_URL) &&
    !!(process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_SERVICE_ROLE_KEY);
}
function stateKeyForFile(file) { return 'file:' + path.basename(file).replace(/\.json$/i, ''); }
async function saveState(file, value) {
  const key = stateKeyForFile(file);
  const previous = writeQueues.get(key) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const db = getClient();
    if (!db) throw new Error('Supabase is unavailable; persistent changes are blocked.');
    if (key === 'file:groups') {
      const groupIds = new Set([...Object.keys(value?.settings || {}), ...Object.keys(value?.allowedGroups || {})].filter(jid => String(jid).endsWith('@g.us')));
      const rows = [...groupIds].map(group_jid => ({ group_jid, settings: value?.settings?.[group_jid] || {}, authorization: value?.allowedGroups?.[group_jid] || null, updated_at: new Date().toISOString() }));
      // groups.json is a complete snapshot. Reconcile rows so a group removed
      // from both settings and authorization cannot reappear after a restart.
      // Writes for this state key are serialized by writeQueues above.
      const { data: existing, error: listError } = await db.from('group_settings').select('group_jid');
      if (listError) throw new Error(`Supabase group settings list failed: ${listError.message}`);
      const wanted = new Set(rows.map(row => String(row.group_jid)));
      const stale = (existing || []).map(row => String(row.group_jid)).filter(id => !wanted.has(id));
      if (stale.length) {
        const { error } = await db.from('group_settings').delete().in('group_jid', stale);
        if (error) throw new Error(`Supabase stale group settings delete failed: ${error.message}`);
      }
      if (rows.length) {
        const { error } = await db.from('group_settings').upsert(rows, { onConflict: 'group_jid' });
        if (error) throw new Error(`Supabase group settings save failed: ${error.message}`);
      }
    } else {
      const { error } = await db.from('bot_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
    }
    stateCache.set(key, value);
  });
  writeQueues.set(key, task);
  try { await task; } catch (e) { console.error('❌ Supabase persistent state save failed:', e.message); throw e; }
  finally { if (writeQueues.get(key) === task) writeQueues.delete(key); }
}
async function loadState(file) {
  const key = stateKeyForFile(file);
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; persistent state cannot be loaded.');
  if (key === 'file:groups') {
    const { data, error } = await db.from('group_settings').select('group_jid,settings,authorization');
    if (error) throw new Error(`Supabase group settings load failed: ${error.message}`);
    const out = { settings: {}, allowedGroups: {} };
    for (const row of data || []) { if (row.settings) out.settings[String(row.group_jid)] = row.settings; if (row.authorization) out.allowedGroups[String(row.group_jid)] = row.authorization; }
    stateCache.set(key, out); return out;
  }
  const { data, error } = await db.from('bot_state').select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(`Supabase state load failed: ${error.message}`);
  if (data && Object.prototype.hasOwnProperty.call(data, 'value')) { stateCache.set(key, data.value); return data.value; }
  stateCache.delete(key); return null;
}
function readCachedState(file, fallback = null) {
  const key = stateKeyForFile(file);
  if (!stateCache.has(key)) return fallback;
  const value = stateCache.get(key);
  return value && typeof value === 'object' ? structuredClone(value) : value;
}
function writeCachedState(file, value) { return saveState(file, value); }

async function hydrateJsonFiles(files) {
  const db = getClient();
  if (!db) throw new Error('Supabase is required to restore permanent bot state.');
  for (const file of files) {
    const key = stateKeyForFile(file);
    if (key === 'file:groups') {
      await loadState(file);
      continue;
    }
    const { data, error } = await db.from('bot_state').select('value').eq('key', key).maybeSingle();
    if (error) throw new Error(`Supabase state load failed for ${key}: ${error.message}`);
    stateCache.set(key, data && Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : null);
  }
}

async function loadBotBans() {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; bot bans cannot be loaded.');
  const { data, error } = await db.from('bot_bans').select('jid,reason,banned_by,created_at,updated_at');
  if (error) throw new Error(`Supabase bot bans load failed: ${error.message}`);
  const out = {};
  for (const row of data || []) out[String(row.jid)] = { reason: row.reason, by: row.banned_by, at: row.created_at };
  return out;
}
async function saveBotBans(value) {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; bot ban changes are blocked.');
  const rows = Object.entries(value || {}).map(([jid, ban]) => ({
    jid, reason: String(ban?.reason || 'No reason provided'),
    banned_by: ban?.by || ban?.banned_by || null,
    created_at: ban?.at ? new Date(ban.at).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const { data: existing, error: listError } = await db.from('bot_bans').select('jid');
  if (listError) throw new Error(`Supabase bot bans list failed: ${listError.message}`);
  const wanted = new Set(rows.map(r => String(r.jid)));
  const stale = (existing || []).map(r => String(r.jid)).filter(j => !wanted.has(j));
  if (stale.length) { const { error } = await db.from('bot_bans').delete().in('jid', stale); if (error) throw new Error(error.message); }
  if (rows.length) { const { error } = await db.from('bot_bans').upsert(rows, { onConflict: 'jid' }); if (error) throw new Error(error.message); }
}
async function deleteState(file) {
  const db = getClient(); if (!db) throw new Error('Supabase is not configured');
  const key = stateKeyForFile(file);
  const { error } = await db.from('bot_state').delete().eq('key', key);
  if (error) throw new Error(`Supabase state delete failed: ${error.message}`);
  stateCache.delete(key);
}

async function getYukiMemory(scope, scopeId) {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; memories cannot be loaded.');
  const { data, error } = await db.from('yuki_memories').select('scope,scope_id,memory,updated_at').eq('scope', scope).eq('scope_id', String(scopeId)).maybeSingle();
  if (error) throw new Error(`Yuki memory load failed: ${error.message}`);
  return data || null;
}
async function saveYukiMemory(scope, scopeId, memory, ownerJid = null) {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; memory changes are blocked.');
  if (!['user','group'].includes(scope) || !String(scopeId || '').trim()) throw new Error('Invalid memory scope.');
  const row = { scope, scope_id: String(scopeId), memory: memory && typeof memory === 'object' ? memory : {}, updated_by: ownerJid || null, updated_at: new Date().toISOString() };
  const { data, error } = await db.from('yuki_memories').upsert(row, { onConflict: 'scope,scope_id' }).select('scope,scope_id,memory,updated_at').single();
  if (error) throw new Error(`Yuki memory save failed: ${error.message}`);
  return data;
}
async function listYukiMemories() {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; memories cannot be listed.');
  const { data, error } = await db.from('yuki_memories').select('scope,scope_id,memory,updated_at').order('updated_at', { ascending: false }).limit(500);
  if (error) throw new Error(`Yuki memory list failed: ${error.message}`);
  return data || [];
}


async function listLegacyUserProfiles() {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; legacy memories cannot be listed.');
  const { data, error } = await db.from('bot_state').select('key,value,updated_at').like('key', 'file:user_%').order('updated_at', { ascending: false }).limit(500);
  if (error) throw new Error(`Legacy profile memory list failed: ${error.message}`);
  return (data || []).map(row => ({ scope: 'user (legacy)', scope_id: String(row.key || '').replace(/^file:/, ''), memory: row.value || {}, updated_at: row.updated_at }));
}

async function clearLegacyUserProfiles() {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; legacy memory deletion is blocked.');
  const { error } = await db.from('bot_state').delete().like('key', 'file:user_%');
  if (error) throw new Error(`Legacy profile memory clear failed: ${error.message}`);
  for (const key of [...stateCache.keys()]) if (key.startsWith('file:user_')) stateCache.delete(key);
}

async function clearYukiMemory(scope, scopeId) {
  const db = getClient(); if (!db) throw new Error('Supabase is unavailable; memory deletion is blocked.');
  let query = db.from('yuki_memories').delete();
  if (scope) query = query.eq('scope', scope);
  if (scopeId) query = query.eq('scope_id', String(scopeId));
  const { error, count } = await query;
  if (error) throw new Error(`Yuki memory clear failed: ${error.message}`);
  return count ?? null;
}

async function healthCheck() {
  const db = getClient(); if (!db) throw new Error('Supabase is not configured');
  // Auth snapshots are encrypted by supabase-auth-state.js; reject weak/missing keys at boot.
  require('./auth-crypto').getKey();
  const checks = await Promise.all([
    db.from('bot_state').select('key').limit(1),
    db.from('bot_bans').select('jid').limit(1),
    db.from('group_settings').select('group_jid').limit(1),
    db.from('yuki_memories').select('scope').limit(1),
  ]);
  const failed = checks.find(x => x?.error);
  if (failed?.error) throw new Error(`Supabase schema health check failed: ${failed.error.message}`);
  return true;
}
module.exports = { getClient, isEnabled, isConfigured, healthCheck, saveState, loadState, readCachedState, writeCachedState, deleteState, hydrateJsonFiles, loadBotBans, saveBotBans, stateKeyForFile, getYukiMemory, saveYukiMemory, listYukiMemories, clearYukiMemory, clearLegacyUserProfiles, listLegacyUserProfiles };

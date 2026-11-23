'use strict';

// Baileys auth state backed directly by Supabase. No credentials or Signal keys
// are written to the deployment filesystem. Keep the service-role key server-side.
const AUTH_CRYPTO = require('./auth-crypto');
const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const SUPABASE = require('./supabase');

const serialize = value => JSON.stringify(value, BufferJSON.replacer);
const deserialize = value => JSON.parse(value, BufferJSON.reviver);
const safe = value => String(value || 'default').replace(/[^a-z0-9_-]/gi, '_').slice(0, 100) || 'default';

const encryptJson = AUTH_CRYPTO.encryptJson;
const decryptJson = AUTH_CRYPTO.decryptJson;

async function useSupabaseAuthState(sessionId) {
  const db = SUPABASE.getClient();
  if (!db || !SUPABASE.isConfigured()) throw new Error('Supabase is required for WhatsApp session persistence.');
  // Fail before reading or creating any session if the encryption key is missing or malformed.
  AUTH_CRYPTO.getKey();
  const id = safe(sessionId);
  const credsKey = `wa-auth:${id}:creds`;
  const keysKey = `wa-auth:${id}:keys`;
  const load = async key => {
    const { data, error } = await db.from('bot_state').select('value').eq('key', key).maybeSingle();
    if (error) throw new Error(`Supabase auth read failed: ${error.message}`);
    return data?.value ?? null;
  };
  const save = async (key, value) => {
    const { error } = await db.from('bot_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(`Supabase auth write failed: ${error.message}`);
  };
  const readAuthJson = async (key, record) => {
    if (!record?.json) return null;
    const decoded = decryptJson(record.json);
    if (decoded.legacy) {
      // Migrate old plaintext snapshots in place, without discarding linked sessions.
      await save(key, { json: encryptJson(decoded.json) });
    }
    return decoded.json;
  };
  const credsRaw = await load(credsKey);
  const keysRaw = await load(keysKey);
  const credsJson = await readAuthJson(credsKey, credsRaw);
  const keysJson = await readAuthJson(keysKey, keysRaw);
  let creds = credsJson ? deserialize(credsJson) : initAuthCreds();
  let keyData = keysJson ? deserialize(keysJson) : {};
  let keyWrite = Promise.resolve();
  const keys = {
    async get(type, ids) {
      const out = {};
      for (const keyId of ids) {
        const value = keyData?.[type]?.[keyId];
        if (value !== undefined && value !== null) out[keyId] = value;
      }
      return out;
    },
    async set(data) {
      keyWrite = keyWrite.catch(() => {}).then(async () => {
        const next = deserialize(serialize(keyData));
        for (const [type, entries] of Object.entries(data || {})) {
          next[type] ||= {};
          for (const [keyId, value] of Object.entries(entries || {})) {
            if (value === null || value === undefined) delete next[type][keyId];
            else next[type][keyId] = value;
          }
          if (!Object.keys(next[type]).length) delete next[type];
        }
        await save(keysKey, { json: encryptJson(serialize(next)) });
        keyData = next;
      });
      return keyWrite;
    },
  };
  return {
    state: { creds, keys },
    async saveCreds() { await save(credsKey, { json: encryptJson(serialize(creds)) }); },
  };
}

async function isRegistered(sessionId) {
  const db = SUPABASE.getClient();
  if (!db || !SUPABASE.isConfigured()) throw new Error('Supabase is required to check WhatsApp session status.');
  AUTH_CRYPTO.getKey();
  const id = safe(sessionId);
  const key = `wa-auth:${id}:creds`;
  const { data, error } = await db.from('bot_state').select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(`Supabase auth status read failed: ${error.message}`);
  if (!data?.value?.json) return false;
  const decoded = decryptJson(data.value.json);
  if (decoded.legacy) {
    const { error: writeError } = await db.from('bot_state').upsert({ key, value: { json: encryptJson(decoded.json) }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (writeError) throw new Error(`Legacy WhatsApp auth migration failed: ${writeError.message}`);
  }
  try { return !!deserialize(decoded.json)?.registered; } catch { return false; }
}
async function listSessions() {
  const db = SUPABASE.getClient();
  if (!db || !SUPABASE.isConfigured()) throw new Error('Supabase is required to list WhatsApp sessions.');
  const { data, error } = await db.from('bot_state').select('key').like('key', 'wa-auth:%:creds');
  if (error) throw new Error(`Supabase session list failed: ${error.message}`);
  return (data || []).map(row => String(row.key).slice('wa-auth:'.length, -':creds'.length)).filter(Boolean);
}
async function deleteSession(sessionId) {
  const db = SUPABASE.getClient();
  if (!db || !SUPABASE.isConfigured()) throw new Error('Supabase is required to delete WhatsApp session data.');
  const id = safe(sessionId);
  const keys = [`wa-auth:${id}:creds`, `wa-auth:${id}:keys`];
  const { error } = await db.from('bot_state').delete().in('key', keys);
  if (error) throw new Error(`Supabase auth delete failed: ${error.message}`);
}
module.exports = { useSupabaseAuthState, deleteSession, isRegistered, listSessions };

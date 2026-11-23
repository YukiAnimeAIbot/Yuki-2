'use strict';

const crypto = require('crypto');

function getKey(raw = process.env.AUTH_SNAPSHOT_ENCRYPTION_KEY) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('AUTH_SNAPSHOT_ENCRYPTION_KEY is required. Set a persistent 32-byte key (64 hex characters or base64 encoding of 32 bytes).');
  let key;
  if (/^[a-f0-9]{64}$/i.test(value)) key = Buffer.from(value, 'hex');
  else {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('AUTH_SNAPSHOT_ENCRYPTION_KEY must be 64 hex characters or canonical base64 for exactly 32 bytes.');
    key = Buffer.from(value, 'base64');
  }
  if (key.length !== 32) throw new Error('AUTH_SNAPSHOT_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

function encryptJson(json, rawKey) {
  if (typeof json !== 'string') throw new TypeError('Auth payload must be a serialized string.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(rawKey), iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptJson(stored, rawKey) {
  if (typeof stored !== 'string') throw new Error('Stored WhatsApp auth payload is invalid.');
  if (!stored.startsWith('enc:v1:')) return { json: stored, legacy: true };
  const parts = stored.split(':');
  if (parts.length !== 5 || parts[1] !== 'v1') throw new Error('Stored WhatsApp auth payload has an invalid encrypted envelope.');
  try {
    const [, , ivText, tagText, bodyText] = parts;
    const iv = Buffer.from(ivText, 'base64');
    const tag = Buffer.from(tagText, 'base64');
    const body = Buffer.from(bodyText, 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid AES-GCM IV or authentication tag length.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(rawKey), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
    return { json, legacy: false };
  } catch (error) {
    throw new Error(`WhatsApp auth decryption failed. Confirm AUTH_SNAPSHOT_ENCRYPTION_KEY is unchanged. ${error.message}`);
  }
}

module.exports = { getKey, encryptJson, decryptJson };

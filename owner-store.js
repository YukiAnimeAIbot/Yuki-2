'use strict';
// Single-owner authorization. No runtime owner additions or database owner list.
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function normalizeJid(jid) { return String(jid || '').replace(/:\d+/, ''); }
function configuredOwner() { return digits(process.env.OWNER_NUMBER || ''); }
function get() { const number = configuredOwner(); return { numbers: number ? [number] : [], lids: [], added: [] }; }
function isOwner(jid) { const owner = configuredOwner(); return !!owner && digits(normalizeJid(jid)) === owner; }
async function hydrate() { return get(); }
module.exports = { get, isOwner, hydrate, normalizeJid, digits };

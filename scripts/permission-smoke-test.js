'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-yuki-smoke-'));
process.env.YUKI_DATA_DIR = testDataDir;
process.env.OWNER_NUMBER = '2348012345678';
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@whiskeysockets/baileys') return { downloadContentFromMessage: async () => ({}) };
  if (request === './supabase') return { saveState: async () => {}, loadState: async () => null, loadBotBans: async () => null, saveBotBans: async () => {}, hydrateJsonFiles: async () => {} };
  if (request === 'axios') return { create: () => ({ get: async () => ({ data: {} }), post: async () => ({ data: {} }) }) };
  return originalLoad.apply(this, arguments);
};
const FEATURES = require('../features');
const PORTED = require('../ported-kord');
const sent = [];
let joined = false;
let leftGroup = '';
let groupSettingChanged = false;
const groupId = '120363012345678901@g.us';
const owner = '2348012345678@s.whatsapp.net';
const admin = '2348099999999@s.whatsapp.net';
const member = '2348077777777@s.whatsapp.net';
const bot = '2348000000000@s.whatsapp.net';
const sock = {
  user: { id: bot },
  sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return { key: { id: 'mock-message' } }; },
  groupAcceptInvite: async code => { assert.strictEqual(code, 'ABC123'); joined = true; return groupId; },
  groupFetchAllParticipating: async () => joined && leftGroup !== groupId ? { [groupId]: { subject: 'Smoke Test Group' } } : {},
  groupLeave: async jid => { leftGroup = jid; },
  groupMetadata: async () => ({ participants: [{ id: admin, admin: 'admin' }, { id: bot, admin: 'admin' }, { id: member, admin: null }] }),
  groupSettingUpdate: async () => { groupSettingChanged = true; },
};
function invoke(text, chatId, senderJid, inGroup = chatId.endsWith('@g.us'), msg = {}) {
  return FEATURES.handleFeatureCommand({ sock, msg: { key: { remoteJid: chatId }, ...msg }, text, chatId, inGroup, senderJid });
}
(async () => {
  assert.strictEqual(FEATURES.getPrefix(), '/', 'only / is the command prefix');
  for (const retired of ['/afk checking','/test','/bots','/admins','/active','/inactive','/addowner 2348011111111','/delowner 2348011111111','/setwelcomeimage','/setgoodbyeimage','/antigcstatus','/msgs on','/autodl on','/yta https://youtu.be/abc','/ytv https://youtu.be/abc','/sticker','/photo','/take']) {
    assert.strictEqual(await invoke(retired, groupId, owner), false, `${retired} must not be routed`);
  }
  for (const retired of ['sticker','s','photo','toimg','take','steal','yta','ytv','tt','twitter','fb','insta','mediafire','apk','apksearch','subtitle','subtitlesearch','pindl','gdrive','autodl','antigcstatus','msgs','animegif','animatedgif']) {
    assert(!PORTED.commandNames().includes(retired), `${retired} must not be registered in media router`);
  }
  // WhatsApp admins can warn/clear warnings for regular members, but cannot
  // moderate peer admins. Owner can moderate group admins, but never self.
  const mentionMember = { message: { extendedTextMessage: { contextInfo: { mentionedJid: [member] } } } };
  const mentionAdmin = { message: { extendedTextMessage: { contextInfo: { mentionedJid: [admin] } } } };
  sent.length = 0;
  assert.strictEqual(await invoke('/warn', groupId, admin, true, mentionMember), true);
  assert(sent.at(-1).payload.text.includes('warning 1/3'), 'group admin must be able to warn a regular member');
  sent.length = 0;
  assert.strictEqual(await invoke('/clearwarn', groupId, admin, true, mentionMember), true);
  assert(sent.at(-1).payload.text.includes('Warnings cleared'), 'group admin must be able to clear a regular member warning');
  sent.length = 0;
  assert.strictEqual(await invoke('/warn', groupId, admin, true, mentionAdmin), true);
  assert(sent.at(-1).payload.text.includes('peer admins'), 'group admin must not warn another group admin');
  sent.length = 0;
  assert.strictEqual(await invoke('/warn', groupId, owner, true, mentionAdmin), true);
  assert(sent.at(-1).payload.text.includes('warning 1/3'), 'Owner must be able to warn a group admin');
  sent.length = 0;
  assert.strictEqual(await invoke('/warn', groupId, owner, true, { message: { extendedTextMessage: { contextInfo: { mentionedJid: [owner] } } } }), true);
  assert(sent.at(-1).payload.text.includes('cannot warn yourself'), 'Owner must not warn self');

  sent.length = 0;
  assert.strictEqual(await invoke('/join', owner, member, false), true);
  assert(sent.at(-1).payload.text.includes("You don't have permission"), 'non-owner join denied');
  sent.length = 0;
  assert.strictEqual(await invoke('/join https://chat.whatsapp.com/ABC123', owner, owner, false), true);
  assert(joined, 'Owner join must work');
  sent.length = 0;
  await FEATURES.onGroupParticipantsUpdate({ sock, update: { id: groupId, action: 'add', participants: [bot], author: member } });
  assert.strictEqual(leftGroup, '', 'adding the bot to a group must never trigger automatic leave');
  sent.length = 0;
  assert.strictEqual(await invoke('/close', groupId, member), true);
  assert(sent.at(-1).payload.text.includes("You don't have permission"));
  assert.strictEqual(groupSettingChanged, false);
  sent.length = 0;
  assert.strictEqual(await invoke('/close', groupId, admin), true);
  assert.strictEqual(groupSettingChanged, true);
  sent.length = 0;
  assert.strictEqual(await invoke(`/leave ${groupId}`, owner, owner, false), true);
  assert.strictEqual(leftGroup, groupId, 'only explicit Owner /leave calls groupLeave');
  console.log('Smoke tests passed: removed commands unrouted, media command router pruned, Owner-only join/leave, no automatic group leaving, and group-admin authorization.');
})().catch(error => { console.error('Permission smoke tests failed:', error); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; fs.rmSync(testDataDir, { recursive: true, force: true }); });

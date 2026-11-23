'use strict';
const assert = require('assert');
const ACCESS = require('../permissions/access-control');
const RUNTIME = require('../core/command-runtime');
const VISION = require('../ai/groq-vision');
const METRICS = require('../ai/metrics');
const RESPONSES = require('../responses/response-engine');

async function main() {
  assert.strictEqual(ACCESS.isOwnerIdentity('2348012345678:4@s.whatsapp.net', '2348012345678'), true);
  assert.strictEqual(ACCESS.isOwnerIdentity('2348099999999@s.whatsapp.net', '2348012345678'), false);
  assert.strictEqual(ACCESS.isOwnerIdentity('2348012345678@s.whatsapp.net', ''), false);
  assert.strictEqual(ACCESS.hasRole({ ok: false, admins: new Set(['123@s.whatsapp.net']) }, '123@s.whatsapp.net'), false);
  assert.strictEqual(ACCESS.hasRole({ ok: true, admins: new Set(['123@s.whatsapp.net']) }, '123@s.whatsapp.net'), true);

  const success = await RUNTIME.runCommand('ping', async () => 'pong');
  assert.strictEqual(success.ok, true);
  const failure = await RUNTIME.runCommand('broken', async () => { throw new Error('expected test failure'); }, { logger: { error() {} } });
  assert.strictEqual(failure.ok, false);
  assert.strictEqual(failure.command, 'broken');
  assert(!RUNTIME.userFacingFailure(failure).includes('expected test failure'));

  async function* fakeStream() { yield Buffer.from([1, 2, 3, 4]); }
  const dataUrl = await VISION.downloadStickerDataUrl({ fileLength: 4 }, async () => fakeStream(), 10);
  assert.strictEqual(dataUrl, 'data:image/webp;base64,AQIDBA==');
  await assert.rejects(() => VISION.downloadStickerDataUrl({ fileLength: 11 }, async () => fakeStream(), 10), /too large/);
  const content = VISION.makeVisionContent('React to this sticker', dataUrl);
  assert.strictEqual(content[0].type, 'text');
  assert.strictEqual(content[1].type, 'image_url');
  assert.strictEqual(content[1].image_url.url, dataUrl);

  const before = METRICS.snapshot();
  METRICS.record({ ok: true, latencyMs: 12, vision: true });
  const after = METRICS.snapshot();
  assert.strictEqual(after.requests, before.requests + 1);
  assert.strictEqual(after.visionRequests, before.visionRequests + 1);
  assert(RESPONSES.commandSuccess('Ready', ['Connected']).includes('Connected'));
  assert(RESPONSES.commandFailure('Search').includes('could not be completed'));
  console.log('Yuki v6 module tests passed: Owner normalization, fail-closed role checks, command isolation, Groq vision payload, sticker size guard, AI metrics and response layouts.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

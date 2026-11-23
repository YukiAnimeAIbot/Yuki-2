'use strict';

const MAX_DEFAULT_BYTES = 8 * 1024 * 1024;

async function downloadStickerDataUrl(message, downloadContentFromMessage, maxBytes = MAX_DEFAULT_BYTES) {
  if (!message || typeof downloadContentFromMessage !== 'function') return null;
  const declared = Number(message.fileLength || 0);
  if (declared > maxBytes) throw new Error('Quoted sticker is too large for visual analysis.');
  const stream = await downloadContentFromMessage(message, 'sticker');
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('Quoted sticker exceeds the visual-analysis size limit.');
    chunks.push(Buffer.from(chunk));
  }
  if (!total) return null;
  return `data:image/webp;base64,${Buffer.concat(chunks).toString('base64')}`;
}

function makeVisionContent(text, imageDataUrl) {
  return [
    { type: 'text', text: String(text || 'Please interpret this sticker in the context of our conversation. Describe its visible expression or meaning without guessing who created it.') },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ];
}

module.exports = { downloadStickerDataUrl, makeVisionContent, MAX_DEFAULT_BYTES };

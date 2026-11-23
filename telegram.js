/**
 * Telegram bridge for 𝒀𝒖𝒌𝒊 AI.
 * /pair <number>   — generate a WhatsApp 8-char pair code
 * /unpair          — wipe your linked WhatsApp session
 * /status, /ai, /help
 */

const config = require('./config');

function isAdmin(ctx) {
  if (!config.TELEGRAM_ADMIN_IDS.length) return false;
  return config.TELEGRAM_ADMIN_IDS.includes(String(ctx.from.id));
}
function canPair(ctx) {
  // Pairing is private: only explicitly configured Telegram administrators may link a session.
  return isAdmin(ctx);
}
function sessionIdFor(tgUserId) { return 'tg_' + tgUserId; }

function startTelegram({ connectWhatsApp, askAI, getStatus, unpairSession, isSessionRegistered }) {
  const token = config.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.log('⚠️  Telegram disabled — set TELEGRAM_BOT_TOKEN in config.js or env.');
    return;
  }

  let Telegraf;
  try { ({ Telegraf } = require('telegraf')); }
  catch (e) {
    console.log('❌ telegraf not installed. Run: npm install telegraf');
    return;
  }

  const bot = new Telegraf(token);

  const help = `🤖 *𝒀𝑼𝑲𝑰 AI — Telegram Bridge*

*/pair* \`<number>\` — Get a WhatsApp pair code
  Example: \`/pair 2348012345678\`
  ⚠️ International format only — *digits only, no + and no leading 0*
  (Nigeria: 234…, UK: 447…, US: 1…)

*/unpair* — Unlink your WhatsApp and reset
*/status* — Bot status
*/ai* \`<prompt>\` — Chat with the AI
*/help* — Show this menu

*How to link your WhatsApp:*
1. Send \`/pair <your-number>\`
2. Copy the 8-character code I send back
3. On your phone: WhatsApp → Settings → Linked Devices
4. Tap *Link a device* → *Link with phone number instead*
5. Enter the code (within 60 seconds)
6. Done! Use \`/menu\` on WhatsApp to start.`;

  bot.start((ctx) => ctx.replyWithMarkdown(help));
  bot.help((ctx)  => ctx.replyWithMarkdown(help));

  bot.command('pair', async (ctx) => {
    if (ctx.chat?.type !== 'private') return ctx.reply('🔒 For your safety, WhatsApp pairing is available only in a private chat with Yuki.');
    if (!canPair(ctx)) return ctx.reply('⛔ Private pairing is restricted to the configured Owner/Telegram administrators.');

    const parts = ctx.message.text.trim().split(/\s+/);
    const raw = parts[1];
    if (!raw) {
      return ctx.replyWithMarkdown(
        'Usage: `/pair <number>`\nExample: `/pair 2348012345678`\n' +
        '⚠️ International format — digits only, no `+`, no leading `0`.'
      );
    }
    const number = raw.replace(/\D/g, '');
    if (number.length < 8 || number.length > 15) {
      return ctx.reply('❌ Invalid number length. Use full international format (digits only).');
    }
    if (number.startsWith('0')) {
      return ctx.reply('❌ Remove the leading 0 — use full country code.\nExample: 2348012345678 (not 08012345678).');
    }

    const sessionId = sessionIdFor(ctx.from.id);

    // Already linked? Tell them instead of issuing a stale code.
    if (isSessionRegistered && await isSessionRegistered(sessionId)) {
      return ctx.replyWithMarkdown(
        '✅ This Telegram account already has a linked WhatsApp.\n' +
        'Send /unpair first if you want to re-link a different number.'
      );
    }

    await ctx.replyWithMarkdown(`⏳ Requesting pair code for *+${number}*...\nThis takes a few seconds.`);

    try {
      await connectWhatsApp({
        sessionId,
        phoneNumber: number,
        onPairingCode: async (formatted) => {
          await ctx.replyWithMarkdown(
            `✅ *Your WhatsApp Pair Code:*\n\n` +
            `\`\`\`\n${formatted}\n\`\`\`\n` +
            `On your phone:\n` +
            `1. Open *WhatsApp* → *Settings* → *Linked Devices*\n` +
            `2. Tap *Link a device*\n` +
            `3. Tap *Link with phone number instead*\n` +
            `4. Enter the code above (no dashes needed)\n\n` +
            `⚠️ The code expires in ~60 seconds. If it expires, send /unpair then /pair again.`
          );
        },
        onOpen: async () => {
          try {
            await ctx.replyWithMarkdown(
              `🎉 *WhatsApp linked successfully!*\n\nGo to WhatsApp and send \`/menu\` to begin.\nUse \`/yuki on\` to start chatting with the AI.`
            );
          } catch (e) {}
        },
        onError: async (err) => {
          await ctx.reply(`❌ Failed to get pair code: ${err.message}\n\nTry /unpair then /pair again.`);
        },
        onClose: (reason) => {
          if (reason === 'logged_out') {
            ctx.reply('🔒 Session logged out. Run /pair again to re-link.').catch(() => {});
          }
        },
      });
    } catch (e) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  bot.command('unpair', async (ctx) => {
    if (ctx.chat?.type !== 'private') return ctx.reply('🔒 Unpairing is available only in a private chat with Yuki.');
    if (!isAdmin(ctx)) return ctx.reply('⛔ This Telegram bot is restricted to configured admins.');
    const sessionId = sessionIdFor(ctx.from.id);
    try {
      if (unpairSession) await unpairSession(sessionId);
      await ctx.reply('🧹 Your WhatsApp session has been wiped. Send /pair <number> to link again.');
    } catch (e) {
      await ctx.reply('❌ Unpair error: ' + e.message);
    }
  });

  bot.command('status', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const s = getStatus();
    ctx.replyWithMarkdown(
      `*𝒀𝒖𝒌𝒊 AI Status*\n\n` +
      `Uptime: ${s.uptime}\n` +
      `Linked WhatsApps: ${s.linkedSessions}\n` +
      `Active AI chats: ${s.activeChats}`
    );
  });

  bot.command('ai', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const prompt = ctx.message.text.replace(/^\/ai(@\w+)?\s*/, '');
    if (!prompt) return ctx.reply('Usage: /ai hello');
    await ctx.reply('🤔 Thinking...');
    const result = await askAI(prompt, `tg_${ctx.from.id}`, `tg_${ctx.from.id}`);
    ctx.reply(result.text);
  });

  bot.catch((err) => console.log('Telegram error:', err.message));

  bot.launch().then(() => console.log('✅ Telegram bridge active'));

  process.once('SIGINT',  () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = { startTelegram };

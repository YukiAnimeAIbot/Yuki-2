'use strict';

/**
 * Yuki Yoshikawa — central configuration.
 * Secrets belong in environment variables. No API secret is stored here.
 */
module.exports = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_IDS: (process.env.TELEGRAM_ADMIN_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean),

  // Single authoritative Owner; configure OWNER_NUMBER in hosting environment.
  OWNER_NUMBER: process.env.OWNER_NUMBER || '',
  OWNER_DISPLAY_NAME: process.env.OWNER_DISPLAY_NAME || 'Owner',

  PORT: process.env.PORT || 3000,


  SUPPORT_YOUTUBE: process.env.SUPPORT_YOUTUBE || '',
  SUPPORT_WHATSAPP: process.env.SUPPORT_WHATSAPP || '',
  SUPPORT_TIKTOK: process.env.SUPPORT_TIKTOK || '',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // This release uses Supabase for durable state and WhatsApp auth; it is mandatory.
  SUPABASE_REQUIRED: true,

  SESSIONS_DIR: process.env.SESSIONS_DIR || './sessions',
  YUKI_DATA_DIR: process.env.YUKI_DATA_DIR || './data',
  YUKI_MEMORY_DIR: process.env.YUKI_MEMORY_DIR || './memory',

  STICKERS_DIR: process.env.STICKERS_DIR || './stickers',
  // Yuki sticker policy is permanently ALWAYS. This is not configurable.
  // Exactly one existing sticker is sent after every successful Yuki AI response.
  // Commands do not automatically receive stickers.
  YUKI_STICKER_MODE: 'always',
  STICKER_CHANCE: 1,
  STICKER_COOLDOWN_MS: 0,

  // Render overrides these directly. Keep the list comma-separated so one
  // provider/model can fail without taking Yuki's AI completely offline.
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_API_KEYS: process.env.GROQ_API_KEYS || '',
  GROQ_URLS: process.env.GROQ_URLS || '',
  GROQ_MODELS: process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b',
  GROQ_MODEL: process.env.GROQ_MODEL || '',
  GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b',
  GROQ_REQUEST_TIMEOUT_MS: Math.max(8000, parseInt(process.env.GROQ_REQUEST_TIMEOUT_MS || '25000', 10)),
  GROQ_MAX_IMAGE_BYTES: Math.max(262144, parseInt(process.env.GROQ_MAX_IMAGE_BYTES || String(8 * 1024 * 1024), 10)),
  GROQ_URL: process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions',
  // Protection / pacing. These apply per process/session and are intentionally configurable via Render env vars.
  COMMAND_COOLDOWN_MS: Math.max(0, parseInt(process.env.COMMAND_COOLDOWN_MS ?? '3000', 10)),
  GROUP_RESPONSE_LIMIT_PER_MINUTE: Math.max(1, parseInt(process.env.GROUP_RESPONSE_LIMIT_PER_MINUTE ?? '20', 10)),
  GROUP_SPAM_COMMAND_THRESHOLD: Math.max(2, parseInt(process.env.GROUP_SPAM_COMMAND_THRESHOLD ?? '12', 10)),
  GROUP_SPAM_WINDOW_MS: Math.max(1000, parseInt(process.env.GROUP_SPAM_WINDOW_MS ?? '15000', 10)),
  GROUP_SPAM_MUTE_MS: Math.max(1000, parseInt(process.env.GROUP_SPAM_MUTE_MS ?? '30000', 10)),
  AI_REPLY_DELAY_MIN_MS: Math.max(0, parseInt(process.env.AI_REPLY_DELAY_MIN_MS ?? '0', 10)),
  AI_REPLY_DELAY_MAX_MS: Math.max(0, parseInt(process.env.AI_REPLY_DELAY_MAX_MS ?? '0', 10)),
};

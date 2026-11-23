'use strict';

/**
 * Safe, intentionally disabled audio-provider adapter.
 *
 * The previous implementation was heavily obfuscated and contacted external
 * endpoints that could not be independently audited. Do not restore it or
 * silently route media requests through unknown services. The /play command
 * remains registered, but audio delivery fails closed until a documented,
 * trusted provider is integrated and reviewed.
 */
async function get_ytmp3() {
  const error = new Error('Audio playback is temporarily unavailable because the previous third-party provider was removed during the security repair.');
  error.code = 'AUDIO_PROVIDER_NOT_CONFIGURED';
  throw error;
}

module.exports = { get_ytmp3 };

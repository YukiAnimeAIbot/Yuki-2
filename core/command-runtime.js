'use strict';

function errorSummary(error) {
  const message = String(error?.message || error || 'Unknown command failure');
  return message.replace(/[\r\n\t]+/g, ' ').slice(0, 240);
}

async function runCommand(name, handler, options = {}) {
  const label = String(name || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 48) || 'unknown';
  const startedAt = Date.now();
  try {
    const value = await handler();
    return { ok: true, value, durationMs: Date.now() - startedAt, command: label };
  } catch (error) {
    const summary = errorSummary(error);
    (options.logger || console).error(`[command:${label}] failed: ${summary}`);
    return { ok: false, error, summary, durationMs: Date.now() - startedAt, command: label };
  }
}

function userFacingFailure(result) {
  return `🌸 Yuki couldn't complete that command this time.\nPlease try again shortly.\n\nCommand: ${result?.command || 'unknown'}`;
}

module.exports = { runCommand, errorSummary, userFacingFailure };

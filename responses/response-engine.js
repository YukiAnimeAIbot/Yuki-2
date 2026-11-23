'use strict';
function commandSuccess(title, details = []) {
  const rows = Array.isArray(details) ? details.map(x => `│ ${String(x)}`).join('\n') : String(details || '');
  return `╭━━〔 🌸 𝒀𝑼𝑲𝑰 v6 〕━━╮\n│ ✨ ${String(title || 'Completed')}\n${rows ? rows + '\n' : ''}╰━━━━━━━━━━━━━━━━━━╯`;
}
function commandFailure(name) {
  return `╭━━〔 🫧 𝒀𝑼𝑲𝑰 v6 〕━━╮\n│ ⚠️ ${String(name || 'Command')} could not be completed.\n│ Please check the command and try again.\n╰━━━━━━━━━━━━━━━━━━╯`;
}
module.exports = { commandSuccess, commandFailure };

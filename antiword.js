'use strict';

function configuredBlockedWords(value = process.env.ANTIWORD_LIST || '') {
  return Array.from(new Set(String(value).split(',')
    .map(x => x.trim().toLocaleLowerCase())
    .filter(x => x.length >= 2 && x.length <= 80)));
}

function containsBlockedWord(text, words = configuredBlockedWords()) {
  const normalized = String(text || '').toLocaleLowerCase();
  return words.some(word => {
    const term = String(word || '').trim().toLocaleLowerCase();
    if (!term) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Ordinary words and phrases match whole tokens, not substrings in unrelated words.
    const pattern = /^[\p{L}\p{N}_ ]+$/u.test(term)
      ? `(^|[^\\p{L}\\p{N}_])${escaped.replace(/\s+/g, '\\s+')}($|[^\\p{L}\\p{N}_])`
      : escaped;
    try { return new RegExp(pattern, 'iu').test(normalized); } catch { return false; }
  });
}

module.exports = { configuredBlockedWords, containsBlockedWord };

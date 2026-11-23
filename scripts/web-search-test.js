'use strict';
const assert = require('assert');
const Module = require('module');
const originalLoad = Module._load;
const calls = [];
let postImpl;
let getImpl;
const fakeAxios = {
  post: async (...args) => { calls.push({ method: 'post', args }); return postImpl(...args); },
  get: async (...args) => { calls.push({ method: 'get', args }); return getImpl(...args); }
};
Module._load = function(request, parent, isMain) {
  if (request === 'axios') return fakeAxios;
  return originalLoad.call(this, request, parent, isMain);
};
const { searchWeb } = require('../web-search');

(async () => {
  try {
    process.env.TAVILY_API_KEY = 'test-tavily-key';
    process.env.BRAVE_SEARCH_API_KEY = '';
    calls.length = 0;
    postImpl = async (url, body, config) => ({ data: { results: [{ title: 'Tavily result', url: 'https://example.com/tavily', content: 'A useful result.' }] } });
    let result = await searchWeb('test query');
    assert.strictEqual(result.provider, 'Tavily Search');
    assert.strictEqual(result.results[0].title, 'Tavily result');
    assert.strictEqual(calls[0].method, 'post');
    assert.strictEqual(calls[0].args[2].headers.Authorization, 'Bearer test-tavily-key');

    // A failing Tavily provider must gracefully fall back to DuckDuckGo.
    calls.length = 0;
    postImpl = async () => { throw Object.assign(new Error('unavailable'), { code: 'ECONNRESET' }); };
    getImpl = async () => ({ data: { Heading: 'Fallback', AbstractText: 'Fallback answer', AbstractURL: 'https://example.com/ddg', RelatedTopics: [] } });
    result = await searchWeb('fallback query');
    assert.strictEqual(result.provider, 'DuckDuckGo Instant Answers');
    assert.strictEqual(result.results.length, 1);
    assert.ok(result.fallbackNote.includes('Tavily unavailable'));

    // With no API keys, use DuckDuckGo directly.
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
    calls.length = 0;
    result = await searchWeb('keyless query');
    assert.strictEqual(result.provider, 'DuckDuckGo Instant Answers');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].method, 'get');

    console.log('PASS web-search: Tavily primary, provider-failure fallback, and keyless DuckDuckGo fallback');
  } catch (error) {
    console.error('FAIL web-search:', error);
    process.exitCode = 1;
  } finally {
    Module._load = originalLoad;
  }
})();

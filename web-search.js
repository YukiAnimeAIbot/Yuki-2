'use strict';
const axios = require('axios');

function clean(value, max = 500) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeResults(items, count, descriptionFields = ['content', 'description', 'snippet']) {
  return (Array.isArray(items) ? items : []).slice(0, count).map(item => {
    const description = descriptionFields.map(key => item?.[key]).find(value => typeof value === 'string' && value.trim());
    return {
      title: clean(item?.title, 160),
      url: clean(item?.url, 500),
      description: clean(description, 500)
    };
  }).filter(item => item.title && /^https?:\/\//i.test(item.url));
}

async function searchTavily(query, count, apiKey) {
  const response = await axios.post('https://api.tavily.com/search', {
    query,
    search_depth: 'basic',
    max_results: count,
    include_answer: false,
    include_raw_content: false,
    include_images: false
  }, {
    timeout: 15000,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  return {
    provider: 'Tavily Search',
    results: normalizeResults(response.data?.results, count, ['content', 'snippet', 'raw_content'])
  };
}

async function searchBrave(query, count, apiKey) {
  const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    params: { q: query, count },
    timeout: 12000,
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey }
  });
  return {
    provider: 'Brave Search',
    results: normalizeResults(response.data?.web?.results, count, ['description', 'snippet'])
  };
}

async function searchDuckDuckGo(query, count) {
  const response = await axios.get('https://api.duckduckgo.com/', {
    params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
    timeout: 10000,
    headers: { 'User-Agent': 'Yuki-Yoshikawa-Bot/6.0.1' }
  });
  const data = response.data || {};
  const results = [];
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: clean(data.Heading || query, 160),
      url: clean(data.AbstractURL, 500),
      description: clean(data.AbstractText, 500)
    });
  }
  for (const item of data.RelatedTopics || []) {
    if (item?.FirstURL && item?.Text) {
      results.push({ title: clean(item.Text.split(' - ')[0], 160), url: clean(item.FirstURL, 500), description: clean(item.Text, 500) });
    }
    for (const sub of item?.Topics || []) {
      if (sub?.FirstURL && sub?.Text) {
        results.push({ title: clean(sub.Text.split(' - ')[0], 160), url: clean(sub.FirstURL, 500), description: clean(sub.Text, 500) });
      }
    }
    if (results.length >= count) break;
  }
  return { provider: 'DuckDuckGo Instant Answers', results: results.slice(0, count), limited: true };
}

async function searchWeb(query, limit = 5) {
  const q = clean(query, 180);
  if (!q) throw new Error('Enter a search query.');
  const count = Math.min(8, Math.max(1, Number(limit) || 5));
  const tavilyKey = String(process.env.TAVILY_API_KEY || '').trim();
  const braveKey = String(process.env.BRAVE_SEARCH_API_KEY || '').trim();
  const failures = [];

  // Provider order: Tavily (primary), Brave (optional secondary), DuckDuckGo (keyless fallback).
  if (tavilyKey) {
    try {
      const result = await searchTavily(q, count, tavilyKey);
      if (result.results.length) return result;
      failures.push('Tavily returned no results');
    } catch (error) {
      failures.push(`Tavily unavailable (${error.response?.status || error.code || 'request failed'})`);
    }
  }

  if (braveKey) {
    try {
      const result = await searchBrave(q, count, braveKey);
      if (result.results.length) return result;
      failures.push('Brave returned no results');
    } catch (error) {
      failures.push(`Brave unavailable (${error.response?.status || error.code || 'request failed'})`);
    }
  }

  try {
    const fallback = await searchDuckDuckGo(q, count);
    return { ...fallback, fallbackNote: failures.length ? failures.join('; ') : undefined };
  } catch (error) {
    const reason = error.response?.status || error.code || 'request failed';
    throw new Error(`All available web search providers failed. DuckDuckGo fallback: ${reason}${failures.length ? `. ${failures.join('; ')}` : ''}`);
  }
}

module.exports = { searchWeb };

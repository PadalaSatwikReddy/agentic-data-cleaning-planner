const SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';
const MAX_QUERIES = 8;
const RESULTS_PER_QUERY = 5;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_RUNS_PER_WINDOW = 4;
const recentRuns = new Map();

function makePhraseQuery(passage) {
  const words = String(passage || '').match(/[\p{L}\p{N}]+/gu) || [];
  const phrase = words.slice(0, 16).join(' ');
  if (phrase.length < 40) return '';
  return `"${phrase.replace(/["\\]/g, '')}"`;
}

async function searchWebForPassages(passages, clientId = 'unknown') {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    const error = new Error('Web search is not configured. Add BRAVE_SEARCH_API_KEY to the server environment.');
    error.statusCode = 503;
    throw error;
  }
  const now = Date.now();
  const recent = (recentRuns.get(clientId) || []).filter(time => now - time < RATE_WINDOW_MS);
  if (recent.length >= MAX_RUNS_PER_WINDOW) {
    const error = new Error('Search limit reached. Please wait a minute before trying again.');
    error.statusCode = 429;
    throw error;
  }
  recent.push(now);
  recentRuns.set(clientId, recent);
  if (recentRuns.size > 1000) {
    for (const [key, times] of recentRuns) {
      if (!times.some(time => now - time < RATE_WINDOW_MS)) recentRuns.delete(key);
    }
  }
  if (!Array.isArray(passages) || passages.length === 0) {
    const error = new Error('At least one passage is required.');
    error.statusCode = 400;
    throw error;
  }

  const selected = passages.slice(0, MAX_QUERIES).map(makePhraseQuery).filter(Boolean);
  if (!selected.length) {
    const error = new Error('Passages must contain at least 40 characters of searchable text.');
    error.statusCode = 400;
    throw error;
  }

  const outcomes = await Promise.allSettled(selected.map(async query => {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(RESULTS_PER_QUERY));
    url.searchParams.set('country', 'IN');
    url.searchParams.set('search_lang', 'en');
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      const error = new Error(`Web search provider returned ${response.status}.`);
      error.statusCode = response.status === 429 ? 429 : 502;
      throw error;
    }
    return response.json();
  }));

  const sources = new Map();
  let failedQueries = 0;
  outcomes.forEach(outcome => {
    if (outcome.status !== 'fulfilled') {
      failedQueries++;
      return;
    }
    const results = outcome.value?.web?.results || [];
    results.forEach(result => {
      if (!result?.url || !result?.title) return;
      let sourceUrl;
      try {
        sourceUrl = new URL(result.url);
      } catch (error) {
        return;
      }
      if (!['http:', 'https:'].includes(sourceUrl.protocol)) return;
      const excerpts = [result.description, ...(Array.isArray(result.extra_snippets) ? result.extra_snippets : [])]
        .filter(value => typeof value === 'string' && value.trim());
      if (!excerpts.length) return;
      const normalizedUrl = sourceUrl.href;
      const existing = sources.get(normalizedUrl);
      const text = excerpts.join('\n').slice(0, 5000);
      if (existing) {
        existing.text = `${existing.text}\n${text}`.slice(0, 8000);
      } else {
        sources.set(normalizedUrl, {
          title: String(result.title).slice(0, 300),
          url: normalizedUrl.slice(0, 2000),
          text,
          external: true
        });
      }
    });
  });

  if (failedQueries === outcomes.length) {
    const error = new Error('All web search requests failed. Check the provider key, quota, and network.');
    error.statusCode = outcomes.find(outcome => outcome.status === 'rejected')?.reason?.statusCode || 502;
    throw error;
  }
  return { sources: Array.from(sources.values()), queriesRun: selected.length, failedQueries };
}

module.exports = { searchWebForPassages };

# Yuki v6.0.1 — Web Search Provider Update

- `TAVILY_API_KEY` is now the primary full-web-search provider for `/search`.
- `BRAVE_SEARCH_API_KEY` remains optional as a secondary provider.
- DuckDuckGo Instant Answers remains the keyless fallback.
- If Tavily or Brave returns an error or no usable results, the next configured provider is tried.
- Search-provider outages do not block Yuki startup.
- No new npm dependency is required; the existing `axios` dependency is used.

Add `TAVILY_API_KEY` to the server environment if you have a Tavily key. Keep all API keys private. If you do not have a key, leave it blank; `/search` will use the limited DuckDuckGo fallback.

The test suite includes mocked tests for Tavily priority and fallback behavior; it does not require a live API key or make network requests.

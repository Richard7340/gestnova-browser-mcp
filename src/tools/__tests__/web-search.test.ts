import { describe, it, expect } from 'vitest';
import webSearch from '../web-search.js';

describe('web-search', () => {
  it('returns empty results when API key is not set', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    const result = await webSearch({ query: 'test' });
    expect(result.query).toBe('test');
    expect(result.results).toEqual([]);
    expect(result.error).toContain('BRAVE_SEARCH_API_KEY');
  });

  it('validates input schema', async () => {
    await expect(webSearch({})).rejects.toThrow();
    await expect(webSearch({ query: '' })).rejects.toThrow();
  });
});

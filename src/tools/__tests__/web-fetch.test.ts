import { describe, it, expect } from 'vitest';
import webFetch from '../web-fetch.js';

describe('web-fetch', () => {
  it('validates URL format', async () => {
    await expect(webFetch({ url: 'not-a-url' })).rejects.toThrow();
  });

  it('returns error for non-existent URL', async () => {
    const result = await webFetch({ url: 'https://this-domain-does-not-exist-99999.com' });
    expect(result.error).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import webExtract from '../web-extract.js';

describe('web-extract', () => {
  it('validates input', async () => {
    await expect(webExtract({})).rejects.toThrow();
  });

  it('validates URL format', async () => {
    await expect(webExtract({ url: 'bad', selectors: [] })).rejects.toThrow();
  });
});

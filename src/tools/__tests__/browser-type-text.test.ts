import { describe, it, expect } from 'vitest';
import browserTypeText from '../browser-type-text.js';

describe('browser-type-text', () => {
  it('validates input (requires workspaceId + text)', async () => {
    await expect(browserTypeText({})).rejects.toThrow();
  });

  it('rejects non-string text', async () => {
    await expect(browserTypeText({ workspaceId: 'ws', text: 123 })).rejects.toThrow();
  });
});

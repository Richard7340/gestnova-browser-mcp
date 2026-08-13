import { describe, it, expect } from 'vitest';
import browserClickAt from '../browser-click-at.js';

describe('browser-click-at', () => {
  it('validates input (requires workspaceId + x/y)', async () => {
    await expect(browserClickAt({})).rejects.toThrow();
  });

  it('rejects non-numeric coordinates', async () => {
    await expect(browserClickAt({ workspaceId: 'ws', x: 'a', y: 2 })).rejects.toThrow();
  });
});

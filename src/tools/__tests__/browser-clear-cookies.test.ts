import { describe, it, expect, vi, afterEach } from 'vitest';
import browserClearCookies from '../browser-clear-cookies.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());

describe('browser-clear-cookies', () => {
  it('exige workspaceId', async () => {
    await expect(browserClearCookies({})).rejects.toThrow();
  });
  it('borra y deja constancia de cuántas había', async () => {
    let borradas = false;
    const ctx = {
      cookies: vi.fn(async () => (borradas ? [] : [{ name: 'a' }, { name: 'b' }, { name: 'c' }])),
      clearCookies: vi.fn(async () => { borradas = true; }),
    };
    vi.spyOn(sessionMgr, 'getOrCreate').mockResolvedValue(ctx as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserClearCookies({ workspaceId: 'ws' });
    expect(ctx.clearCookies).toHaveBeenCalled();
    expect(r).toEqual({ cleared: 3, before: 3, after: 0 });
  });
});

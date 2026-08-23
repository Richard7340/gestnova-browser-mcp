import { describe, it, expect, vi, afterEach } from 'vitest';
import browserForward from '../browser-forward.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());

const paginaFalsa = (opts: { avanza?: boolean } = {}) => ({
  goForward: vi.fn(async () => (opts.avanza === false ? null : {})),
  url: () => 'https://ejemplo.com/2',
  title: async () => 'Pagina 2',
  screenshot: async () => Buffer.from('img'),
});

describe('browser-forward', () => {
  it('exige workspaceId', async () => {
    await expect(browserForward({})).rejects.toThrow();
  });

  it('avanza y devuelve dónde ha quedado', async () => {
    const page = paginaFalsa();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserForward({ workspaceId: 'ws' });
    expect(page.goForward).toHaveBeenCalled();
    expect(r.url).toBe('https://ejemplo.com/2');
    expect(r.moved).toBe(true);
  });

  // go-back se traga el fallo con .catch(() => {}) y dice que fue bien aunque
  // no hubiera historial. Aqui no: si no habia adonde avanzar, se dice.
  it('si no hay adónde avanzar lo dice, en vez de fingir que avanzó', async () => {
    const page = paginaFalsa({ avanza: false });
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserForward({ workspaceId: 'ws' });
    expect(r.moved).toBe(false);
    expect(String(r.note)).toMatch(/histor/i);
  });
});

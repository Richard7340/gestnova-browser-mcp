import { describe, it, expect, vi, afterEach } from 'vitest';
import browserWaitFor from '../browser-wait-for.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());

const paginaFalsa = (over: any = {}) => ({
  waitForSelector: vi.fn(async () => ({})),
  waitForLoadState: vi.fn(async () => {}),
  getByText: vi.fn(() => ({ first: () => ({ waitFor: vi.fn(async () => {}) }) })),
  url: () => 'https://ejemplo.com',
  title: async () => 'T',
  screenshot: async () => Buffer.from('img'),
  ...over,
});

describe('browser-wait-for', () => {
  it('exige workspaceId', async () => {
    await expect(browserWaitFor({})).rejects.toThrow();
  });

  it('espera por selector', async () => {
    const page = paginaFalsa();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserWaitFor({ workspaceId: 'ws', selector: '#listo' });
    expect(page.waitForSelector).toHaveBeenCalledWith('#listo', expect.objectContaining({ timeout: 10000 }));
    expect(r.appeared).toBe(true);
  });

  it('sin selector ni texto espera a que la página termine de cargar', async () => {
    const page = paginaFalsa();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserWaitFor({ workspaceId: 'ws' });
    expect(page.waitForLoadState).toHaveBeenCalled();
    expect(r.appeared).toBe(true);
  });

  // Que expire NO es un error del sistema: es informacion util ("no llego a
  // aparecer"). Devolverlo como excepcion haria que la IA lo tratase de fallo.
  it('si expira lo dice sin lanzar', async () => {
    const page = paginaFalsa({ waitForSelector: vi.fn(async () => { throw new Error('Timeout 10000ms exceeded'); }) });
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserWaitFor({ workspaceId: 'ws', selector: '#nunca' });
    expect(r.appeared).toBe(false);
    expect(String(r.note)).toMatch(/timeout/i);
  });

  it('respeta un tiempo de espera propio y lo acota', async () => {
    const page = paginaFalsa();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(page as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    await browserWaitFor({ workspaceId: 'ws', selector: '#x', timeoutMs: 999999 });
    expect(page.waitForSelector).toHaveBeenCalledWith('#x', expect.objectContaining({ timeout: 60000 }));
  });
});

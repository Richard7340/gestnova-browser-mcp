import { describe, it, expect, vi, afterEach } from 'vitest';
import browserSnapshot from '../browser-snapshot.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());

const pagina = (over: any = {}) => ({
  evaluate: vi.fn(async () => ({ buttons: [{ tag: 'button', text: 'Enviar', x: 10, y: 20 }], inputs: [], links: [] })),
  accessibility: { snapshot: vi.fn(async () => ({ role: 'WebArea', name: 'T' })) },
  screenshot: vi.fn(async () => Buffer.from('img')),
  viewportSize: () => ({ width: 1280, height: 720 }),
  url: () => 'https://x.com', title: async () => 'T',
  ...over,
});
const montar = (p: any) => {
  vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(p as any);
  vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
};

describe('browser-snapshot', () => {
  it('exige workspaceId', async () => {
    await expect(browserSnapshot({})).rejects.toThrow();
  });

  it('reúne imagen, árbol y elementos en una sola foto', async () => {
    const p = pagina(); montar(p);
    const r: any = await browserSnapshot({ workspaceId: 'ws' });
    expect(r.screenshot).toBeTruthy();
    expect(r.accessibilityTree).toEqual({ role: 'WebArea', name: 'T' });
    expect(r.buttons[0].text).toBe('Enviar');
    expect(r.viewport).toEqual({ width: 1280, height: 720 });
  });

  it('trae coordenadas para poder pinchar sin selector', async () => {
    const p = pagina(); montar(p);
    const r: any = await browserSnapshot({ workspaceId: 'ws' });
    expect(r.buttons[0]).toMatchObject({ x: 10, y: 20 });
  });

  // El arbol es lo mas caro y lo mas fragil: que falle no debe tirar la foto.
  it('si el árbol de accesibilidad falla, la foto sigue sirviendo', async () => {
    const p = pagina({ accessibility: { snapshot: vi.fn(async () => { throw new Error('detached'); }) } });
    montar(p);
    const r: any = await browserSnapshot({ workspaceId: 'ws' });
    expect(r.accessibilityTree).toBeNull();
    expect(r.screenshot).toBeTruthy();
  });

  it('el texto solo viene si se pide, y recortado', async () => {
    const p = pagina({
      evaluate: vi.fn()
        .mockResolvedValueOnce({ buttons: [], inputs: [], links: [] })
        .mockResolvedValueOnce('x'.repeat(100_000)),
    });
    montar(p);
    const sin: any = await browserSnapshot({ workspaceId: 'ws' });
    expect(sin.text).toBeUndefined();

    const p2 = pagina({
      evaluate: vi.fn()
        .mockResolvedValueOnce({ buttons: [], inputs: [], links: [] })
        .mockResolvedValueOnce('x'.repeat(100_000)),
    });
    montar(p2);
    const con: any = await browserSnapshot({ workspaceId: 'ws', includeText: true });
    expect(con.text.length).toBe(40_000);
  });

  it('pide la página entera cuando se le dice', async () => {
    const p = pagina(); montar(p);
    await browserSnapshot({ workspaceId: 'ws', fullPage: true });
    expect(p.screenshot).toHaveBeenCalledWith(expect.objectContaining({ fullPage: true }));
  });
});

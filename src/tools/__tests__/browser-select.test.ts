import { describe, it, expect, vi, afterEach } from 'vitest';
import browserSelect from '../browser-select.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());
const pagina = (over: any = {}) => ({
  selectOption: vi.fn(async () => ['es']),
  url: () => 'https://x.com', title: async () => 'T',
  screenshot: async () => Buffer.from('i'), ...over,
});

describe('browser-select', () => {
  it('exige workspaceId y selector', async () => {
    await expect(browserSelect({ workspaceId: 'ws' })).rejects.toThrow();
  });
  it('exige saber QUÉ opción elegir', async () => {
    await expect(browserSelect({ workspaceId: 'ws', selector: '#pais' })).rejects.toThrow(/value o label/i);
  });
  it('elige por valor y devuelve lo que quedó seleccionado', async () => {
    const p = pagina();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(p as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserSelect({ workspaceId: 'ws', selector: '#pais', value: 'es' });
    expect(p.selectOption).toHaveBeenCalledWith('#pais', { value: 'es' }, expect.anything());
    expect(r.selected).toEqual(['es']);
    expect(r.ok).toBe(true);
  });
  it('permite elegir por lo que ve la persona', async () => {
    const p = pagina();
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(p as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    await browserSelect({ workspaceId: 'ws', selector: '#pais', label: 'España' });
    expect(p.selectOption).toHaveBeenCalledWith('#pais', { label: 'España' }, expect.anything());
  });
  it('si la opción no existe lo dice en vez de fingir', async () => {
    const p = pagina({ selectOption: vi.fn(async () => { throw new Error('option not found'); }) });
    vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(p as any);
    vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
    const r: any = await browserSelect({ workspaceId: 'ws', selector: '#pais', value: 'zz' });
    expect(r.ok).toBe(false);
    // `error` y no `note`: asi la plataforma lo degrada a fallo en vez de
    // devolver "done" con una seleccion que no ocurrio.
    expect(String(r.error)).toMatch(/not found/i);
  });
});

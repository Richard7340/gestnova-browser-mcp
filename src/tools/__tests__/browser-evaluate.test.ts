import { describe, it, expect, vi, afterEach } from 'vitest';
import browserEvaluate from '../browser-evaluate.js';
import { sessionMgr } from '../_session.js';

afterEach(() => vi.restoreAllMocks());
const pagina = (evaluate: any) => ({ evaluate, url: () => 'https://x.com' });
const montar = (evaluate: any) => {
  vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(pagina(evaluate) as any);
  vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
};

describe('browser-evaluate', () => {
  it('exige workspaceId y script', async () => {
    await expect(browserEvaluate({ workspaceId: 'ws' })).rejects.toThrow();
    await expect(browserEvaluate({ workspaceId: 'ws', script: '' })).rejects.toThrow();
  });

  it('devuelve el resultado serializado', async () => {
    montar(vi.fn(async () => ({ titulo: 'Hola', n: 2 })));
    const r: any = await browserEvaluate({ workspaceId: 'ws', script: 'x' });
    expect(r.ok).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ titulo: 'Hola', n: 2 });
  });

  it('un error del script no tumba la sesión, se devuelve como texto', async () => {
    montar(vi.fn(async () => { throw new Error('x is not defined'); }));
    const r: any = await browserEvaluate({ workspaceId: 'ws', script: 'x' });
    expect(r.ok).toBe(false);
    expect(String(r.note)).toMatch(/not defined/);
  });

  it('un script que no termina se corta por tiempo', async () => {
    montar(vi.fn(() => new Promise(() => {})));
    const r: any = await browserEvaluate({ workspaceId: 'ws', script: 'while(true){}', timeoutMs: 60 });
    expect(r.ok).toBe(false);
    expect(String(r.note)).toMatch(/no termino/i);
  });

  it('recorta un resultado gigante en vez de devolverlo entero', async () => {
    montar(vi.fn(async () => 'x'.repeat(500_000)));
    const r: any = await browserEvaluate({ workspaceId: 'ws', script: 'x' });
    expect(r.result.length).toBe(200_000);
    expect(String(r.note)).toMatch(/recortado/i);
  });

  it('un objeto circular no rompe la respuesta', async () => {
    const circ: any = {}; circ.yo = circ;
    montar(vi.fn(async () => circ));
    const r: any = await browserEvaluate({ workspaceId: 'ws', script: 'x' });
    expect(r.ok).toBe(true);
    expect(typeof r.result).toBe('string');
  });
});

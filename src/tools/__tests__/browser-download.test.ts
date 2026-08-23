import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import browserDownload from '../browser-download.js';
import { sessionMgr } from '../_session.js';

let raiz = '', previo: string | undefined;
beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'vdr-dl-'));
  previo = process.env.VDR_ROOT_PATH;
  process.env.VDR_ROOT_PATH = raiz;
});
afterEach(() => {
  vi.restoreAllMocks();
  if (previo === undefined) delete process.env.VDR_ROOT_PATH; else process.env.VDR_ROOT_PATH = previo;
  rmSync(raiz, { recursive: true, force: true });
});

const paginaCon = (cuerpo: Buffer, ok = true, status = 200) => ({
  request: { get: vi.fn(async () => ({ ok: () => ok, status: () => status, body: async () => cuerpo })) },
  url: () => 'https://x.com',
});
const montar = (p: any) => {
  vi.spyOn(sessionMgr, 'getActivePage').mockResolvedValue(p as any);
  vi.spyOn(sessionMgr, 'touch').mockImplementation(() => {});
};

describe('browser-download', () => {
  it('exige saber QUÉ descargar', async () => {
    montar(paginaCon(Buffer.from('x')));
    await expect(browserDownload({ workspaceId: 'ws' })).rejects.toThrow(/url o selector/i);
  });

  it('guarda en el data room y devuelve la ruta, no el contenido', async () => {
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    montar(paginaCon(pdf));
    const r: any = await browserDownload({ workspaceId: 'acme', url: 'https://x.com/informe.pdf' });
    expect(r.ok).toBe(true);
    expect(r.relPath).toBe('descargas/informe.pdf');
    expect(r.bytes).toBe(5);
    expect(r.screenshot).toBeUndefined();
    expect((r as any).content).toBeUndefined();
    const abs = join(raiz, 'companies', 'acme', 'descargas', 'informe.pdf');
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs).equals(pdf)).toBe(true);
  });

  it('un error del servidor se cuenta, no se guarda un fichero vacío', async () => {
    montar(paginaCon(Buffer.from(''), false, 403));
    const r: any = await browserDownload({ workspaceId: 'acme', url: 'https://x.com/privado.pdf' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('403');
    expect(existsSync(join(raiz, 'companies', 'acme', 'descargas', 'privado.pdf'))).toBe(false);
  });

  it('no deja escribir fuera de la carpeta de la empresa', async () => {
    montar(paginaCon(Buffer.from('x')));
    const r: any = await browserDownload({ workspaceId: 'acme', url: 'https://x.com/a.pdf', saveAs: '../fuera/a.pdf' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/traversal/);
  });

  it('respeta un nombre propio', async () => {
    montar(paginaCon(Buffer.from('x')));
    const r: any = await browserDownload({ workspaceId: 'acme', url: 'https://x.com/a.pdf', saveAs: 'facturas/2026/enero.pdf' });
    expect(r.relPath).toBe('facturas/2026/enero.pdf');
    expect(existsSync(join(raiz, 'companies', 'acme', 'facturas', '2026', 'enero.pdf'))).toBe(true);
  });

  it('limpia nombres raros que vienen de la url', async () => {
    montar(paginaCon(Buffer.from('x')));
    const r: any = await browserDownload({ workspaceId: 'acme', url: 'https://x.com/a%20b;rm.pdf' });
    expect(r.relPath).toMatch(/^descargas\/[\w.\-]+$/);
  });
});

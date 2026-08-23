import { z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, sep, dirname, basename } from 'node:path';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  saveAs: z.string().optional(),
  timeoutMs: z.coerce.number().int().positive().optional(),
});

const TOPE_MS = 120_000;
const TOPE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Descargar un fichero y dejarlo en el data room del espacio.
 *
 * Dos formas: dando una `url` directa, o pinchando un `selector` que dispara
 * la descarga. El fichero NO se devuelve en la respuesta (un PDF de 20 MB en
 * base64 revienta cualquier conversacion): se guarda en `descargas/` del data
 * room y se devuelve la ruta, que es lo que hace falta para trabajar con el.
 *
 * La ruta se valida contra la carpeta de la empresa igual que el resto del
 * data room: un `saveAs` con `..` no puede escribir fuera.
 */
function rutaSegura(workspaceId: string, rel: string): string | null {
  if (!rel || rel.startsWith('/') || rel.split('/').includes('..')) return null;
  const vdrRoot = process.env.VDR_ROOT_PATH ?? '/data/vdr';
  const base = resolve(join(vdrRoot, 'companies', workspaceId));
  const abs = resolve(join(base, rel.replace(/^\/+/, '')));
  return (abs === base || abs.startsWith(base + sep)) ? abs : null;
}

function nombreDesdeUrl(u: string): string {
  try {
    const limpio = basename(new URL(u).pathname) || 'descarga';
    return limpio.replace(/[^\w.\-]/g, '_').slice(0, 120);
  } catch {
    return 'descarga';
  }
}

export default async function browserDownload(args: unknown) {
  const { workspaceId, url, selector, saveAs, timeoutMs } = schema.parse(args);
  if (!url && !selector) throw new Error('Hace falta url o selector para saber que descargar');
  const limite = Math.min(timeoutMs ?? 30_000, TOPE_MS);
  const page = await sessionMgr.getActivePage(workspaceId);

  let bytes: Buffer;
  let nombre: string;

  if (url) {
    // Por la propia pagina: hereda cookies y sesion, asi funciona con ficheros
    // que exigen estar dentro (facturas, informes).
    const resp = await page.request.get(url, { timeout: limite });
    if (!resp.ok()) {
      return { ok: false, error: `La descarga devolvio ${resp.status()}`, url };
    }
    bytes = Buffer.from(await resp.body());
    nombre = saveAs ?? nombreDesdeUrl(url);
  } else {
    const [descarga] = await Promise.all([
      page.waitForEvent('download', { timeout: limite }),
      page.click(selector as string, { timeout: limite }),
    ]);
    const flujo = await descarga.createReadStream();
    const trozos: Buffer[] = [];
    let total = 0;
    for await (const t of flujo as any) {
      total += t.length;
      if (total > TOPE_BYTES) return { ok: false, error: `El fichero pasa de ${TOPE_BYTES} bytes` };
      trozos.push(Buffer.from(t));
    }
    bytes = Buffer.concat(trozos);
    nombre = saveAs ?? descarga.suggestedFilename();
  }

  if (bytes.length > TOPE_BYTES) {
    return { ok: false, error: `El fichero pasa de ${TOPE_BYTES} bytes` };
  }

  const rel = saveAs && saveAs.includes('/') ? saveAs : `descargas/${nombre}`;
  const abs = rutaSegura(workspaceId, rel);
  if (!abs) return { ok: false, error: 'path-traversal-blocked' };

  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  sessionMgr.touch(workspaceId);

  // Se devuelve la RUTA, no el contenido: el fichero ya vive en el data room.
  return { ok: true, relPath: rel, bytes: bytes.length, savedTo: 'vdr' };
}

import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  script: z.string().min(1).max(20_000),
  timeoutMs: z.coerce.number().int().positive().optional(),
});

const TOPE_MS = 15_000;
const TOPE_RESULTADO = 200_000; // caracteres

/**
 * Ejecutar JavaScript en la pagina abierta.
 *
 * Es la tool mas potente de todas: quien la usa puede leer cualquier cosa de
 * los sitios donde el navegador del espacio tenga sesion iniciada. Por eso la
 * plataforma la marca como accion que exige confirmacion, y por eso aqui:
 *
 *  - hay tope de tiempo (un bucle infinito bloquearia el navegador del espacio),
 *  - el resultado se serializa y se recorta (una pagina entera devuelta como
 *    string puede tumbar la respuesta),
 *  - un error del script NO tumba la sesion: se devuelve como texto.
 */
export default async function browserEvaluate(args: unknown) {
  const { workspaceId, script, timeoutMs } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const limite = Math.min(timeoutMs ?? 5_000, TOPE_MS);

  let value: unknown;
  let ok = true;
  let note: string | undefined;

  const reloj = new Promise((_, rechaza) =>
    setTimeout(() => rechaza(new Error(`El script no termino en ${limite} ms`)), limite));

  try {
    value = await Promise.race([page.evaluate(script), reloj]);
  } catch (e: any) {
    ok = false;
    note = e?.message ?? String(e);
  }
  sessionMgr.touch(workspaceId);

  // Serializar aqui y no fiarse de lo que devuelva la pagina: un DOM entero o
  // un objeto circular romperian la respuesta del servidor.
  let serializado: string | undefined;
  if (ok) {
    try {
      serializado = typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      serializado = String(value);
    }
    if (serializado && serializado.length > TOPE_RESULTADO) {
      serializado = serializado.slice(0, TOPE_RESULTADO);
      note = `Resultado recortado a ${TOPE_RESULTADO} caracteres`;
    }
  }

  return { url: page.url(), ok, result: serializado, note };
}

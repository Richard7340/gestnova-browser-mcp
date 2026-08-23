import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  selector: z.string().min(1),
  value: z.string().optional(),
  label: z.string().optional(),
});

/**
 * Elegir una opcion de un desplegable.
 *
 * Se puede pedir por `value` (el valor interno) o por `label` (lo que ve la
 * persona). Devuelve lo que quedo seleccionado de verdad, no solo "hecho": si
 * la opcion no existe, Playwright lanza y lo decimos.
 */
export default async function browserSelect(args: unknown) {
  const { workspaceId, selector, value, label } = schema.parse(args);
  if (value === undefined && label === undefined) {
    throw new Error('Hace falta value o label para saber que opcion elegir');
  }
  const page = await sessionMgr.getActivePage(workspaceId);

  let seleccionadas: string[] = [];
  let note: string | undefined;
  try {
    seleccionadas = await page.selectOption(selector, label !== undefined ? { label } : { value: value as string }, { timeout: 10000 });
  } catch (e: any) {
    note = e?.message ?? String(e);
  }
  sessionMgr.touch(workspaceId);

  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return {
    url: page.url(),
    title: await page.title(),
    selected: seleccionadas,
    ok: seleccionadas.length > 0,
    // `error` (y no `note`) a proposito: la plataforma degrada a fallo lo que
    // trae un error dentro, asi un select que no selecciono nada deja de
    // salir como "done".
    error: seleccionadas.length > 0 ? undefined : (note ?? 'No se selecciono ninguna opcion'),
    screenshot: screenshot.toString('base64'),
  };
}

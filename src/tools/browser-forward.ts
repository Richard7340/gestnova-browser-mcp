import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({ workspaceId: z.string() });

/**
 * Avanzar en el historial: el espejo de browser.go-back, que faltaba.
 *
 * A diferencia de go-back (que hace `.catch(() => {})` y devuelve exito aunque
 * no haya historial), aqui se dice si de verdad se avanzo: Playwright devuelve
 * null cuando no habia adonde ir. Un "hecho" que no hizo nada es peor que un
 * "no pude".
 */
export default async function browserForward(args: unknown) {
  const { workspaceId } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);

  let respuesta: unknown = null;
  let fallo: string | undefined;
  try {
    respuesta = await page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (e: any) {
    fallo = e?.message ?? String(e);
  }
  sessionMgr.touch(workspaceId);

  const moved = respuesta != null;
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return {
    url: page.url(),
    title: await page.title(),
    moved,
    note: moved ? undefined : (fallo ?? 'No habia nada hacia delante en el historial'),
    screenshot: screenshot.toString('base64'),
  };
}

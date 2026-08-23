import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  selector: z.string().optional(),
  text: z.string().optional(),
  timeoutMs: z.coerce.number().int().positive().optional(),
});

const TOPE_MS = 60_000;

/**
 * Esperar a que algo aparezca antes de seguir.
 *
 * Sin esto, el agente encadenaba navigate + click y el click llegaba antes que
 * la pagina. Acepta un selector, un texto visible, o nada (esperar a que la
 * carga termine).
 *
 * Que expire NO se lanza como excepcion: "no llego a aparecer" es informacion
 * util para quien decide el siguiente paso, no un fallo del sistema.
 */
export default async function browserWaitFor(args: unknown) {
  const { workspaceId, selector, text, timeoutMs } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  // Acotado: una espera sin techo bloquea el navegador para todo el espacio.
  const timeout = Math.min(timeoutMs ?? 10_000, TOPE_MS);

  let appeared = true;
  let note: string | undefined;
  try {
    if (selector) {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
    } else if (text) {
      await page.getByText(text).first().waitFor({ timeout, state: 'visible' });
    } else {
      await page.waitForLoadState('networkidle', { timeout });
    }
  } catch (e: any) {
    appeared = false;
    note = e?.message ?? String(e);
  }
  sessionMgr.touch(workspaceId);

  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return {
    url: page.url(),
    title: await page.title(),
    appeared,
    waitedFor: selector ?? text ?? 'carga de la pagina',
    note,
    screenshot: screenshot.toString('base64'),
  };
}

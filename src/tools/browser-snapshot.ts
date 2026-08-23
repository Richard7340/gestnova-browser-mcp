import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  fullPage: z.boolean().optional(),
  includeText: z.boolean().optional(),
});

const TOPE_TEXTO = 40_000;

/**
 * Foto completa del estado de la pagina, en UNA llamada.
 *
 * No se solapa con las que ya habia, las reune: `screenshot` solo da la
 * imagen, `dom` solo el arbol y `extract-visible` solo los elementos. Para
 * decidir el siguiente paso hacen falta las tres, y encadenar tres llamadas
 * sobre una pagina que puede cambiar entre medias da una foto incoherente:
 * aqui todo sale del mismo instante.
 *
 * Pensada para que una IA externa (o el agente del espacio dentro de un
 * workflow) pueda mirar el navegador y decidir sin ir a ciegas.
 */
export default async function browserSnapshot(args: unknown) {
  const { workspaceId, fullPage, includeText } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);

  const elementos = await page.evaluate(() => {
    const r: any = { buttons: [], inputs: [], links: [] };
    document.querySelectorAll('button, a, input, textarea, select').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0) {
        const tag = el.tagName.toLowerCase();
        const item = {
          tag,
          text: (el as HTMLElement).innerText?.trim().slice(0, 100) || (el as HTMLInputElement).placeholder || '',
          id: el.id || undefined,
          name: (el as HTMLInputElement).name || undefined,
          type: (el as HTMLInputElement).type || undefined,
          href: (el as HTMLAnchorElement).href || undefined,
          // Coordenadas para poder pinchar sin selector (browser.click-at).
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
        if (tag === 'button') r.buttons.push(item);
        else if (tag === 'a') r.links.push(item);
        else r.inputs.push(item);
      }
    });
    return r;
  }).catch(() => ({ buttons: [], inputs: [], links: [] }));

  // Mismo arbol que usa browser.dom (ariaSnapshot en modo ai), para que las
  // dos herramientas cuenten lo mismo. Es lo mas caro y lo mas fragil: si
  // falla, la foto sigue valiendo.
  const accessibilityTree = await page.ariaSnapshot({ mode: 'ai' }).catch(() => null);

  let text: string | undefined;
  if (includeText) {
    text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (text && text.length > TOPE_TEXTO) text = text.slice(0, TOPE_TEXTO);
  }

  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: fullPage === true });
  sessionMgr.touch(workspaceId);

  return {
    url: page.url(),
    title: await page.title(),
    viewport: page.viewportSize() ?? undefined,
    ...elementos,
    accessibilityTree,
    text,
    screenshot: screenshot.toString('base64'),
  };
}

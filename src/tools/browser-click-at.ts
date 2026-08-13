import { z } from 'zod';
import { sessionMgr } from './_session.js';

// Takeover por coordenadas: el usuario clica sobre la vista que ve del navegador
// del agente y la coord (en base al viewport FIJO 1280×800) se traduce a un click
// real de Playwright. Necesita viewport fijo en session-manager para ser preciso.
const schema = z.object({
  workspaceId: z.string(),
  x: z.number(),
  y: z.number(),
});

export default async function browserClickAt(args: unknown) {
  const { workspaceId, x, y } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const delay = 80 + Math.random() * 60;

  await page.mouse.click(x, y, { delay });

  // Un click puede navegar: esperamos una estabilización breve como browser-click.
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { currentUrl: page.url(), screenshot: screenshot.toString('base64') };
}

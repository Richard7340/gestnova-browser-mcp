import { z } from 'zod';
import { sessionMgr } from './_session.js';

// Takeover por teclado: escribe `text` en el elemento con foco actual (normalmente
// un input que el usuario acaba de enfocar con browser.click-at). No usa selector:
// el foco lo pone el click previo, igual que un usuario real.
const schema = z.object({
  workspaceId: z.string(),
  text: z.string(),
});

export default async function browserTypeText(args: unknown) {
  const { workspaceId, text } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);

  // Tecleo humano: char a char con delay, como browser-fill.
  for (const char of text) {
    await page.keyboard.type(char, { delay: 70 + Math.random() * 80 });
  }

  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { currentUrl: page.url(), screenshot: screenshot.toString('base64') };
}

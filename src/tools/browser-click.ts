import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  selector: z.string().optional(),
  text: z.string().optional(),
});

export default async function browserClick(args: unknown) {
  const { workspaceId, selector, text } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const delay = 80 + Math.random() * 60;

  if (text) {
    await page.getByText(text, { exact: false }).first().click({ delay });
  } else if (selector) {
    await page.click(selector, { delay });
  } else {
    throw new Error('Either selector or text is required');
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { currentUrl: page.url(), screenshot: screenshot.toString('base64') };
}

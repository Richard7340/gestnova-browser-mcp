import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  selector: z.string(),
  value: z.string(),
});

export default async function browserFill(args: unknown) {
  const { workspaceId, selector, value } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);

  await page.click(selector);
  await page.fill(selector, '');
  for (const char of value) {
    await page.keyboard.type(char, { delay: 70 + Math.random() * 80 });
  }

  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { screenshot: screenshot.toString('base64') };
}

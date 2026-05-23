import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  direction: z.enum(['down', 'up']).default('down'),
  amount: z.number().default(500),
});

export default async function browserScroll(args: unknown) {
  const { workspaceId, direction, amount } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const delta = direction === 'down' ? amount : -amount;
  await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), delta);
  await page.waitForTimeout(500);
  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { screenshot: screenshot.toString('base64') };
}

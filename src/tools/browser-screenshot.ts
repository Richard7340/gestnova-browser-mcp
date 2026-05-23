import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  fullPage: z.boolean().default(false),
});

export default async function browserScreenshot(args: unknown) {
  const { workspaceId, fullPage } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70, fullPage });
  return {
    url: page.url(),
    title: await page.title(),
    screenshot: screenshot.toString('base64'),
  };
}

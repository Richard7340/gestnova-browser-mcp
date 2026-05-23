import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({
  workspaceId: z.string(),
  url: z.string().url(),
});

export default async function browserNavigate(args: unknown) {
  const { workspaceId, url } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return {
    url: page.url(),
    title: await page.title(),
    screenshot: screenshot.toString('base64'),
  };
}

import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({ workspaceId: z.string() });

export default async function browserGoBack(args: unknown) {
  const { workspaceId } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  sessionMgr.touch(workspaceId);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
  return { url: page.url(), title: await page.title(), screenshot: screenshot.toString('base64') };
}

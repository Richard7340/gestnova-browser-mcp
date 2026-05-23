import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({ workspaceId: z.string() });

export default async function browserDom(args: unknown) {
  const { workspaceId } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const snapshot = await page.ariaSnapshot({ mode: 'ai' });
  return { url: page.url(), title: await page.title(), accessibilityTree: snapshot };
}

import { z } from 'zod';
import { sessionMgr } from './_session.js';

const schema = z.object({ workspaceId: z.string() });

export default async function browserExtractVisible(args: unknown) {
  const { workspaceId } = schema.parse(args);
  const page = await sessionMgr.getActivePage(workspaceId);
  const visible = await page.evaluate(() => {
    const result: any = { buttons: [], inputs: [], links: [] };
    document.querySelectorAll('button, a, input, textarea, select').forEach(el => {
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
        };
        if (tag === 'button') result.buttons.push(item);
        else if (tag === 'a') result.links.push(item);
        else result.inputs.push(item);
      }
    });
    return result;
  });
  sessionMgr.touch(workspaceId);
  return { url: page.url(), ...visible };
}

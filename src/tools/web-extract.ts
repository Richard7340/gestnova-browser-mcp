import { z } from 'zod';
import { JSDOM } from 'jsdom';

const inputSchema = z.object({
  url: z.string().url(),
  selectors: z.array(z.object({
    name: z.string(),
    css: z.string(),
    attribute: z.string().optional(),
  })),
});

export default async function webExtract(args: unknown) {
  const { url, selectors } = inputSchema.parse(args);

  let r: Response;
  try {
    r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err: any) {
    return { url, error: `Fetch failed: ${err.message ?? err}` };
  }

  if (!r.ok) {
    return { url, error: `Fetch failed with status ${r.status}` };
  }

  const html = await r.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const results: Record<string, string[]> = {};
  for (const sel of selectors) {
    const elements = document.querySelectorAll(sel.css);
    results[sel.name] = Array.from(elements).map(el => {
      if (sel.attribute) return el.getAttribute(sel.attribute) ?? '';
      return el.textContent?.trim() ?? '';
    }).filter(Boolean);
  }

  return { url, results };
}

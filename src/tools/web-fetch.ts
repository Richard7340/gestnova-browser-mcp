import { z } from 'zod';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const inputSchema = z.object({
  url: z.string().url(),
  format: z.enum(['text', 'markdown', 'html']).default('text'),
});

export default async function webFetch(args: unknown) {
  const { url, format } = inputSchema.parse(args);

  let r: Response;
  try {
    r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
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
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();

  if (!article) {
    return { url, error: 'Could not extract article content from this page' };
  }

  return {
    url,
    title: article.title,
    byline: article.byline,
    siteName: article.siteName,
    excerpt: article.excerpt,
    content: format === 'html' ? article.content : article.textContent,
    length: article.length,
    publishedTime: article.publishedTime,
  };
}

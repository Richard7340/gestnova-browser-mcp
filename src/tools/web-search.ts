import { z } from 'zod';

const inputSchema = z.object({
  query: z.string().min(1).max(500),
  count: z.number().int().min(1).max(20).default(10),
  freshness: z.enum(['all', 'day', 'week', 'month', 'year']).default('all'),
});

export default async function webSearch(args: unknown) {
  const { query, count, freshness } = inputSchema.parse(args);

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return {
      query,
      results: [],
      error: 'BRAVE_SEARCH_API_KEY not configured. Set it in environment.',
    };
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  if (freshness !== 'all') url.searchParams.set('freshness', freshness);

  const r = await fetch(url, {
    headers: {
      'X-Subscription-Token': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!r.ok) {
    return { query, results: [], error: `Brave Search returned ${r.status}` };
  }

  const data = await r.json();
  return {
    query,
    results: (data.web?.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
      siteName: r.profile?.name,
    })),
    totalResults: data.web?.totalResults ?? 0,
  };
}

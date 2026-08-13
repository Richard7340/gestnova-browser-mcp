import Fastify from 'fastify';

const app = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT ?? '8018');

// Health endpoint
app.get('/health', async () => ({
  status: 'ok',
  service: 'gestnova-browser-mcp',
  version: '1.0.0',
  uptime: process.uptime(),
}));

// Tool dispatcher — POST /tools/:toolName
app.post<{ Params: { toolName: string } }>('/tools/:toolName', async (request, reply) => {
  const { toolName } = request.params;
  const args = request.body as Record<string, unknown>;

  try {
    const { default: handler } = await import(`./tools/${toolName.replace(/\./g, '-')}.js`);
    const result = await handler(args);
    return reply.send(result);
  } catch (err: any) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      return reply.status(404).send({ error: `Unknown tool: ${toolName}` });
    }
    request.log.error(err, `Tool ${toolName} failed`);
    return reply.status(500).send({ error: err.message });
  }
});

// List available tools
app.get('/tools', async () => ({
  tools: [
    { name: 'web.search', description: 'Search the web via Brave Search API' },
    { name: 'web.fetch', description: 'Fetch and read a URL with clean content extraction' },
    { name: 'web.extract', description: 'Extract specific data from a URL using CSS selectors' },
    { name: 'browser.navigate', description: 'Navigate to a URL in persistent browser session' },
    { name: 'browser.click', description: 'Click element by CSS selector or text' },
    { name: 'browser.click-at', description: 'Click by viewport coordinates (user takeover)' },
    { name: 'browser.type-text', description: 'Type text into the focused element (user takeover)' },
    { name: 'browser.fill', description: 'Fill input field with human-like typing' },
    { name: 'browser.scroll', description: 'Scroll page up or down' },
    { name: 'browser.screenshot', description: 'Capture current page screenshot' },
    { name: 'browser.dom', description: 'Get accessibility tree of current page' },
    { name: 'browser.extract-visible', description: 'Extract visible interactive elements' },
    { name: 'browser.go-back', description: 'Navigate back in browser history' },
  ],
}));

async function start() {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`gestnova-browser-mcp listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

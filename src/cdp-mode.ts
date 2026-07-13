import { chromium as pwChromium, type Browser, type BrowserContext } from 'playwright';

/** Decide el modo de navegador a partir del entorno. */
export function resolveBrowserMode(env: NodeJS.ProcessEnv | Record<string, string | undefined>): 'cdp' | 'persistent' {
  return env.CDP_URL && env.CDP_URL.length > 0 ? 'cdp' : 'persistent';
}

/** De un Browser (CDP) obtiene el context existente o crea uno. */
export async function acquireCdpContext(browser: Pick<Browser, 'contexts' | 'newContext'>): Promise<BrowserContext> {
  const existing = browser.contexts();
  if (existing.length > 0) return existing[0];
  return browser.newContext();
}

/** Conecta por CDP al Chrome real (playwright base; el stealth no aplica al attach). */
export async function connectCdp(cdpUrl: string): Promise<Browser> {
  return pwChromium.connectOverCDP(cdpUrl);
}

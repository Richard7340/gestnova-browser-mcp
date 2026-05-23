import { chromium as pwChromium, type BrowserContext, type Page } from 'playwright';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// Stealth bootstrap — try playwright-extra + stealth plugin; fall back to
// vanilla Playwright with manual anti-detection args.
// ---------------------------------------------------------------------------
let stealthChromium: typeof pwChromium | null = null;

async function loadStealth(): Promise<typeof pwChromium> {
  if (stealthChromium) return stealthChromium;
  try {
    const { chromium: pxChromium } = await import('playwright-extra');
    const { default: StealthPlugin } = await import('puppeteer-extra-plugin-stealth');
    pxChromium.use(StealthPlugin());
    stealthChromium = pxChromium as unknown as typeof pwChromium;
    return stealthChromium;
  } catch {
    // playwright-extra unavailable — vanilla Playwright + stealth args
    stealthChromium = pwChromium;
    return stealthChromium;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Session {
  context: BrowserContext;
  workspaceId: string;
  profilePath: string;
  createdAt: number;
  lastActivityAt: number;
}

export interface SessionInfo {
  workspaceId: string;
  createdAt: number;
  lastActivityAt: number;
  durationMinutes: number;
  pageCount: number;
}

export interface BrowserSessionManagerOpts {
  maxConcurrent?: number;
  idleTimeoutMs?: number;
  sessionsDir?: string;
}

// ---------------------------------------------------------------------------
// BrowserSessionManager
// ---------------------------------------------------------------------------
export class BrowserSessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();
  private readonly maxConcurrent: number;
  private readonly idleTimeoutMs: number;
  private readonly sessionsDir: string;
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(opts?: BrowserSessionManagerOpts) {
    super();
    this.maxConcurrent = opts?.maxConcurrent ?? parseInt(process.env.MAX_CONCURRENT_SESSIONS ?? '10', 10);
    this.idleTimeoutMs = opts?.idleTimeoutMs ?? parseInt(process.env.SESSION_IDLE_TIMEOUT_MS ?? '300000', 10);
    this.sessionsDir = opts?.sessionsDir ?? process.env.SESSIONS_DIR ?? '/data/sessions';
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Get an existing session's BrowserContext or create a new one. */
  async getOrCreate(workspaceId: string): Promise<BrowserContext> {
    const existing = this.sessions.get(workspaceId);
    if (existing) {
      existing.lastActivityAt = Date.now();
      this.resetIdleTimer(workspaceId);
      return existing.context;
    }

    if (this.sessions.size >= this.maxConcurrent) {
      await this.evictLRU();
    }

    const profilePath = path.join(this.sessionsDir, workspaceId);
    await fs.mkdir(profilePath, { recursive: true });

    const chromium = await loadStealth();

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: true,
      viewport: this.randomViewport(),
      userAgent: this.chromeUserAgent(),
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const session: Session = {
      context,
      workspaceId,
      profilePath,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(workspaceId, session);
    this.resetIdleTimer(workspaceId);
    this.emit('session:created', { workspaceId });

    return context;
  }

  /** Return the first open page or create a new one. */
  async getActivePage(workspaceId: string): Promise<Page> {
    const ctx = await this.getOrCreate(workspaceId);
    const pages = ctx.pages();
    if (pages.length > 0) return pages[0];
    return ctx.newPage();
  }

  /** Refresh activity timestamp (keeps idle timer alive). */
  touch(workspaceId: string): void {
    const session = this.sessions.get(workspaceId);
    if (session) {
      session.lastActivityAt = Date.now();
      this.resetIdleTimer(workspaceId);
    }
  }

  /** Close a single session and clean up its timer. */
  async close(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) return;

    const timer = this.timers.get(workspaceId);
    if (timer) clearTimeout(timer);
    this.timers.delete(workspaceId);

    try {
      await session.context.close();
    } catch {
      // context may already be closed
    }

    const minutes = (Date.now() - session.createdAt) / 60_000;
    this.sessions.delete(workspaceId);
    this.emit('session:closed', {
      workspaceId,
      durationMinutes: Math.round(minutes * 100) / 100,
    });
  }

  /** Close every active session. */
  async closeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    await Promise.all(ids.map(id => this.close(id)));
  }

  /** Return info for a single session, or null if it doesn't exist. */
  getSessionInfo(workspaceId: string): SessionInfo | null {
    const session = this.sessions.get(workspaceId);
    if (!session) return null;
    return {
      workspaceId,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      durationMinutes: Math.round(((Date.now() - session.createdAt) / 60_000) * 100) / 100,
      pageCount: session.context.pages().length,
    };
  }

  /** List info for all active sessions. */
  listSessions(): SessionInfo[] {
    return [...this.sessions.keys()].map(id => this.getSessionInfo(id)!);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private resetIdleTimer(workspaceId: string): void {
    const existing = this.timers.get(workspaceId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      const session = this.sessions.get(workspaceId);
      if (session && Date.now() - session.lastActivityAt >= this.idleTimeoutMs) {
        await this.close(workspaceId);
      }
    }, this.idleTimeoutMs);

    // Allow Node to exit even if timers are pending
    timer.unref();

    this.timers.set(workspaceId, timer);
  }

  private async evictLRU(): Promise<void> {
    let oldest: Session | null = null;
    for (const s of this.sessions.values()) {
      if (!oldest || s.lastActivityAt < oldest.lastActivityAt) oldest = s;
    }
    if (oldest) await this.close(oldest.workspaceId);
  }

  private randomViewport(): { width: number; height: number } {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  private chromeUserAgent(): string {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  }
}

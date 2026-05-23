import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserSessionManager } from '../session-manager.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

describe('BrowserSessionManager', () => {
  let mgr: BrowserSessionManager;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'browser-test-'));
    mgr = new BrowserSessionManager({
      maxConcurrent: 3,
      idleTimeoutMs: 60_000,
      sessionsDir: tmpDir,
    });
  });

  afterEach(async () => {
    await mgr.closeAll();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates a new session for a workspace', async () => {
    const ctx = await mgr.getOrCreate('ws-test-1');
    expect(ctx).toBeDefined();
    expect(mgr.listSessions()).toHaveLength(1);
  }, 30_000);

  it('returns same context on second call', async () => {
    const ctx1 = await mgr.getOrCreate('ws-test-2');
    const ctx2 = await mgr.getOrCreate('ws-test-2');
    expect(ctx1).toBe(ctx2);
    expect(mgr.listSessions()).toHaveLength(1);
  }, 30_000);

  it('closes session and removes from list', async () => {
    await mgr.getOrCreate('ws-test-3');
    expect(mgr.listSessions()).toHaveLength(1);
    await mgr.close('ws-test-3');
    expect(mgr.listSessions()).toHaveLength(0);
  }, 30_000);

  it('evicts LRU when max concurrent reached', async () => {
    await mgr.getOrCreate('ws-a');
    await mgr.getOrCreate('ws-b');
    await mgr.getOrCreate('ws-c');
    expect(mgr.listSessions()).toHaveLength(3);

    // Touch ws-b and ws-c to make ws-a the LRU
    mgr.touch('ws-b');
    mgr.touch('ws-c');

    // Creating 4th should evict ws-a
    await mgr.getOrCreate('ws-d');
    expect(mgr.listSessions()).toHaveLength(3);
    expect(mgr.getSessionInfo('ws-a')).toBeNull();
  }, 60_000);

  it('getActivePage returns a page', async () => {
    const page = await mgr.getActivePage('ws-test-page');
    expect(page).toBeDefined();
    expect(typeof page.goto).toBe('function');
    await mgr.close('ws-test-page');
  }, 30_000);

  it('getSessionInfo returns null for unknown workspace', () => {
    expect(mgr.getSessionInfo('nonexistent')).toBeNull();
  });

  it('touch updates lastActivityAt', async () => {
    await mgr.getOrCreate('ws-touch');
    const info1 = mgr.getSessionInfo('ws-touch')!;
    const t1 = info1.lastActivityAt;

    // Small delay to ensure timestamp changes
    await new Promise(r => setTimeout(r, 10));
    mgr.touch('ws-touch');

    const info2 = mgr.getSessionInfo('ws-touch')!;
    expect(info2.lastActivityAt).toBeGreaterThan(t1);
  }, 30_000);

  it('close on non-existent session is a no-op', async () => {
    await expect(mgr.close('does-not-exist')).resolves.toBeUndefined();
  });

  it('emits session:created and session:closed events', async () => {
    const events: string[] = [];
    mgr.on('session:created', () => events.push('created'));
    mgr.on('session:closed', () => events.push('closed'));

    await mgr.getOrCreate('ws-events');
    await mgr.close('ws-events');

    expect(events).toEqual(['created', 'closed']);
  }, 30_000);
});

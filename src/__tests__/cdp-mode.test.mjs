import assert from 'node:assert';
import test from 'node:test';
import { resolveBrowserMode, acquireCdpContext } from '../../dist/cdp-mode.js';

test('resolveBrowserMode: cdp si CDP_URL está', () => {
  assert.equal(resolveBrowserMode({ CDP_URL: 'http://127.0.0.1:9222' }), 'cdp');
});
test('resolveBrowserMode: persistent si no', () => {
  assert.equal(resolveBrowserMode({}), 'persistent');
  assert.equal(resolveBrowserMode({ CDP_URL: '' }), 'persistent');
});
test('acquireCdpContext: usa el context existente si hay', async () => {
  const ctx = { id: 'existing' };
  const browser = { contexts: () => [ctx], newContext: async () => ({ id: 'new' }) };
  assert.deepEqual(await acquireCdpContext(browser), { id: 'existing' });
});
test('acquireCdpContext: crea uno si no hay', async () => {
  const browser = { contexts: () => [], newContext: async () => ({ id: 'new' }) };
  assert.deepEqual(await acquireCdpContext(browser), { id: 'new' });
});

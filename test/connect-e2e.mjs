// End-to-end test of the connect flow the panel drives:
//
//   paste a URL  ->  RFC 9728 discovery  ->  dynamic client registration
//                ->  PKCE authorization  ->  tokens  ->  a real tool call
//
// Run with `node test/connect-e2e.mjs`. Uses a mock Tripsy (real PKCE and a
// Streamable HTTP MCP endpoint), so no account is needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-tripsy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 46010;
const REDIRECT_PORT = 33421;
const AUTH_FILE = path.join(HERE, 'auth.connect-test.json');

let passed = 0;
const failures = [];
/** Never let a stuck step hang the suite: fail it with a clear message. */
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' 超时（' + ms + 'ms）')), ms);
    }),
  ]);
}
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (e) {
    failures.push({ name, error: e });
    console.log('  \u2717 ' + name + '\n      ' + (e.message || e));
  }
}

const mock = await startMock({ port: PORT, acceptAnyToken: true });
const MCP_URL = mock.origin + '/mcp';

// oauth.mjs resolves its paths from the environment at import time.
process.env.TRIPSY_AUTH_FILE = AUTH_FILE;
process.env.TRIPSY_REDIRECT_PORT = String(REDIRECT_PORT);
fs.rmSync(AUTH_FILE, { force: true });

const { discoverEndpoints } = await import('../lib/tripsy/oauth.mjs');
const api = await import('../lib/tripsy/api.mjs');

console.log('mock Tripsy at ' + mock.origin + '\n');

await check('拒绝不是 URL 的输入', async () => {
  await assert.rejects(() => discoverEndpoints('not a url'), /合法的 URL/);
});

await check('拒绝没有 OAuth 元数据的地址', async () => {
  await assert.rejects(() => discoverEndpoints('https://example.com/nope'), /资源元数据/);
});

await check('从粘贴的 URL 发现授权服务器与端点', async () => {
  const e = await discoverEndpoints(MCP_URL);
  assert.equal(e.resource, MCP_URL);
  assert.equal(e.issuer, mock.origin);
  assert.equal(e.authorization, mock.origin + '/o/authorize/');
  assert.equal(e.token, mock.origin + '/o/token/');
  assert.ok(e.registration, 'registration endpoint should be discovered');
});

await check('粘贴 URL 后完成注册、PKCE 授权并拿到令牌', async () => {
  const endpoints = await discoverEndpoints(MCP_URL);
  const status = await api.startLogin({
    endpoints,
    // Stands in for the browser: follow the authorize redirect back to the
    // loopback listener that login() is waiting on.
    openUrl: async (url) => {
      const res = await fetch(url, { redirect: 'follow' });
      assert.equal(res.status, 200, 'callback listener should answer 200');
    },
  });
  assert.equal(status.loggedIn, true);
  assert.equal(status.resource, MCP_URL);
  assert.equal(mock.state.seen.registerCalls, 1, 'should register exactly one client');
});

await check('连接后能读取真实数据', async () => {
  const trips = await api.listTrips();
  assert.equal(trips.length, 1);
  assert.equal(trips[0].title, '东京周末');

  const detail = await api.tripDetail(trips[0].id);
  assert.equal(detail.trip.title, '东京周末', 'id must be coerced to a string for the tool schema');
  assert.equal(detail.activities.length, 1, 'activities should reach the timeline');
  assert.equal(detail.hostings.length, 1, 'hostings should reach the timeline');
});

await check('工具返回 isError 时抛错，而不是静默显示空数据', async () => {
  // Tripsy declares trip ids as strings; an integer is rejected by validation.
  // Swallowing that would make the panel look empty instead of reporting.
  await assert.rejects(() => api.callTool('tripsy_trips_show', { id: 1257623 }), /want "string"/);
});

await check('authStatus 报告实际连接的地址而不是默认值', async () => {
  const status = api.authStatus();
  assert.equal(status.loggedIn, true);
  assert.equal(status.resource, MCP_URL);
  assert.equal(status.issuer, mock.origin);
});

await check('断开后清空凭据与端点', async () => {
  const after = api.disconnect();
  assert.equal(after.loggedIn, false);
  assert.equal(after.resource, null);
  assert.equal(api.authStatus().loggedIn, false);
});

await check('断开后可以重新连接（重新注册客户端）', async () => {
  const endpoints = await withTimeout(discoverEndpoints(MCP_URL), 15000, 'discovery');
  const status = await withTimeout(
    api.startLogin({
      endpoints,
      openUrl: async (url) => {
        await fetch(url, { redirect: 'follow' });
      },
    }),
    30000,
    'second login',
  );
  assert.equal(status.loggedIn, true);
  assert.equal(mock.state.seen.registerCalls, 2, 'a new issuer registration is expected after disconnect');
  assert.equal((await withTimeout(api.listTrips(), 15000, 'list after reconnect')).length, 1);
});

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
await mock.close();
if (failures.length) {
  for (const f of failures) console.error('\nFAIL: ' + f.name + '\n' + (f.error.stack || f.error));
  process.exit(1);
}
// The login listener and keep-alive sockets can outlive the assertions; exit
// explicitly rather than relying on the event loop draining.
process.exit(0);

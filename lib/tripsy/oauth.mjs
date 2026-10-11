// OAuth 2.1 (PKCE + dynamic client registration) for the Tripsy MCP server.
// Zero dependencies: node:crypto, node:http, fetch.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notLoggedInError } from './errors.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Endpoints default to the real Tripsy service. The overrides exist so the
// whole flow can be exercised offline against test/mock-tripsy.mjs.
export const MCP_URL = process.env.TRIPSY_MCP_URL || 'https://mcp.tripsy.app/';
export const ISSUER = process.env.TRIPSY_ISSUER || 'https://my.tripsy.app';
export const AUTH_ENDPOINT =
  process.env.TRIPSY_AUTH_ENDPOINT || 'https://my.tripsy.app/o/authorize/';
export const TOKEN_ENDPOINT =
  process.env.TRIPSY_TOKEN_ENDPOINT || 'https://my.tripsy.app/o/token/';
export const REGISTER_ENDPOINT =
  process.env.TRIPSY_REGISTER_ENDPOINT || 'https://my.tripsy.app/o/register/';
export const REVOKE_ENDPOINT =
  process.env.TRIPSY_REVOKE_ENDPOINT || 'https://my.tripsy.app/o/revoke_token/';
export const REDIRECT_PORT = Number(process.env.TRIPSY_REDIRECT_PORT || 33418);
export const REDIRECT_URI =
  process.env.TRIPSY_REDIRECT_URI || `http://127.0.0.1:${REDIRECT_PORT}/callback`;
export const DEFAULT_SCOPE = 'read write profile email';
export const AUTH_FILE =
  process.env.TRIPSY_AUTH_FILE || path.join(HERE, '..', 'auth.json');

const log = (...a) => process.stderr.write('[tripsy-oauth] ' + a.join(' ') + '\n');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function createPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function loadAuth() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function saveAuth(data) {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function discover() {
  const res = await fetch(`${ISSUER}/.well-known/oauth-authorization-server`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`discovery failed: HTTP ${res.status}`);
  return res.json();
}

/** Register a public (PKCE) client so we never need a shared secret. */
export async function registerClient({ clientName, scope = DEFAULT_SCOPE } = {}) {
  const res = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: clientName || 'DeepSeek Harness (local)',
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`client registration failed: HTTP ${res.status} ${text}`);
  return JSON.parse(text);
}

export function buildAuthorizationUrl({ clientId, scope = DEFAULT_SCOPE, state, challenge }) {
  const u = new URL(AUTH_ENDPOINT);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', REDIRECT_URI);
  u.searchParams.set('scope', scope);
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

async function postForm(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const detail = json ? JSON.stringify(json) : text.slice(0, 400);
    const err = new Error(`token request failed: HTTP ${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

function toTokenRecord(json, previous = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || previous.refresh_token || null,
    token_type: json.token_type || 'Bearer',
    scope: json.scope || previous.scope || null,
    expires_at: json.expires_in ? now + Number(json.expires_in) : null,
    obtained_at: now,
  };
}

export async function exchangeCode({ clientId, code, verifier }) {
  const json = await postForm(TOKEN_ENDPOINT, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
  });
  return toTokenRecord(json);
}

export async function refreshTokens({ clientId, refreshToken, previous }) {
  const json = await postForm(TOKEN_ENDPOINT, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });
  return toTokenRecord(json, previous);
}

const SKEW_SECONDS = 120;

export function isFresh(tokens) {
  if (!tokens || !tokens.access_token) return false;
  if (!tokens.expires_at) return true;
  return Math.floor(Date.now() / 1000) < tokens.expires_at - SKEW_SECONDS;
}

/**
 * Return a usable access token, refreshing (and persisting) when needed.
 * `auth` is the object loaded from AUTH_FILE; mutated in place and saved.
 */
export async function ensureAccessToken(auth, { force = false } = {}) {
  if (!auth || !auth.client_id) throw notLoggedInError('尚未注册客户端，请先运行 login。');
  if (!force && isFresh(auth.tokens)) return auth.tokens.access_token;
  if (!auth.tokens || !auth.tokens.refresh_token) {
    if (auth.tokens && auth.tokens.access_token) return auth.tokens.access_token;
    throw notLoggedInError('没有可用的刷新令牌，请重新运行 `node src/cli.mjs login`。');
  }
  log('refreshing access token');
  let next;
  try {
    next = await refreshTokens({
      clientId: auth.client_id,
      refreshToken: auth.tokens.refresh_token,
      previous: auth.tokens,
    });
  } catch (e) {
    // A 4xx from the token endpoint means the credential itself was rejected
    // (revoked, expired, or invalidated by a password change). Network and 5xx
    // failures stay ordinary errors so they are still surfaced, not swallowed.
    if (e.status >= 400 && e.status < 500) {
      e.authFailed = true;
    }
    throw e;
  }
  auth.tokens = next;
  auth.updated_at = new Date().toISOString();
  saveAuth(auth);
  return next.access_token;
}

/** Run the browser login flow and store the resulting tokens. */
export async function login({ openUrl, scope = DEFAULT_SCOPE, timeoutMs = 10 * 60 * 1000 } = {}) {
  let auth = loadAuth();
  if (!auth || !auth.client_id) {
    log('no registered client yet; registering one');
    const client = await registerClient({ scope });
    auth = {
      issuer: ISSUER,
      resource: MCP_URL,
      client_id: client.client_id,
      client_name: client.client_name,
      registered_at: new Date().toISOString(),
      tokens: null,
    };
    saveAuth(auth);
  }

  const { verifier, challenge } = createPkce();
  const state = b64url(crypto.randomBytes(16));
  // Persist the PKCE verifier so the same login can also be finished out of
  // band, when the browser cannot reach the loopback listener.
  auth.pending = {
    state,
    verifier,
    redirect_uri: REDIRECT_URI,
    started_at: new Date().toISOString(),
  };
  saveAuth(auth);

  const authUrl = buildAuthorizationUrl({
    clientId: auth.client_id,
    scope,
    state,
    challenge,
  });

  const result = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Every hit is logged: this is how we tell whether the browser ever
      // reached the loopback listener after the user approved the request.
      log('callback request: ' + req.method + ' ' + String(req.url).slice(0, 300));
      const url = new URL(req.url, `http://127.0.0.1:${REDIRECT_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('not found');
        return;
      }
      const err = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const gotState = url.searchParams.get('state');
      const done = (status, message, payload) => {
        res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<!doctype html><meta charset="utf-8"><title>Tripsy MCP</title>` +
            `<body style="font:16px/1.6 system-ui;padding:48px;max-width:640px;margin:auto">` +
            `<h2>${payload.ok ? '✅ 登录成功' : '❌ 登录失败'}</h2><p>${message}</p>` +
            `<p style="color:#888">这个窗口可以关闭了，回到 DeepSeek Harness 继续。</p></body>`,
        );
        cleanup();
        payload.ok ? resolve(payload) : reject(new Error(payload.message));
      };

      if (err) return done(400, `授权被拒绝：${err}`, { ok: false, message: err });
      if (!code) return done(400, '回调里没有授权码。', { ok: false, message: 'missing code' });
      if (gotState !== state) {
        return done(400, '状态校验失败，已中止。', { ok: false, message: 'state mismatch' });
      }
      done(200, 'Tripsy 授权已完成。', { ok: true, code, state });
    });

    const cleanup = () => {
      clearTimeout(timer);
      server.close();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('login timed out after ' + Math.round(timeoutMs / 1000) + 's'));
    }, timeoutMs);

    server.on('error', (e) => {
      cleanup();
      reject(e);
    });
    server.listen(REDIRECT_PORT, '127.0.0.1', async () => {
      process.stdout.write(`AUTH_URL: ${authUrl}\n`);
      process.stdout.write(`LISTENING: http://127.0.0.1:${REDIRECT_PORT}/callback\n`);
      if (openUrl) {
        try {
          await openUrl(authUrl);
        } catch (e) {
          log('could not open browser automatically: ' + e.message);
        }
      }
    });
  });

  const tokens = await exchangeCode({ clientId: auth.client_id, code: result.code, verifier });
  auth.tokens = tokens;
  delete auth.pending;
  auth.updated_at = new Date().toISOString();
  saveAuth(auth);
  return auth;
}

/**
 * Finish a login from the URL the browser ended up on, without needing the
 * loopback listener. Accepts a full URL or a bare authorization code.
 */
export async function completeLoginFromUrl(raw) {
  const auth = loadAuth();
  if (!auth || !auth.client_id) throw new Error('尚未注册客户端，请先运行 login');
  if (!auth.pending?.verifier) {
    throw new Error('没有进行中的登录。请先运行 `login` 生成授权链接。');
  }

  const text = String(raw).trim();
  const url = new URL(
    text.includes('://') ? text : `http://127.0.0.1/callback?code=${encodeURIComponent(text)}`,
  );
  const error = url.searchParams.get('error');
  if (error) {
    throw new Error(
      `Tripsy 拒绝了授权: ${error} ${url.searchParams.get('error_description') || ''}`.trim(),
    );
  }
  const code = url.searchParams.get('code');
  if (!code) {
    throw new Error('这段地址里没有 code 参数。请复制浏览器完整地址栏内容（含 ?code=...）。');
  }
  const state = url.searchParams.get('state');
  if (state && state !== auth.pending.state) {
    throw new Error('state 不匹配：这条链接不是本次登录产生的，请重新运行 login。');
  }

  const tokens = await exchangeCode({
    clientId: auth.client_id,
    code,
    verifier: auth.pending.verifier,
  });
  auth.tokens = tokens;
  delete auth.pending;
  auth.updated_at = new Date().toISOString();
  saveAuth(auth);
  return auth;
}

export async function revoke(auth) {
  const token = auth?.tokens?.refresh_token || auth?.tokens?.access_token;
  if (!token || !auth?.client_id) return false;
  await postForm(REVOKE_ENDPOINT, { token, client_id: auth.client_id }).catch(() => {});
  auth.tokens = null;
  saveAuth(auth);
  return true;
}

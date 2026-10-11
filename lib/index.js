/**
 * dsh-tripsy — host half.
 *
 * Serves the /api/dsh-tripsy route family that the browser half renders:
 * credential health, the trip list, one trip with its sub-resources, and the
 * browser login flow. Everything rides the official plugin seats — no DSH
 * source changes.
 *
 * The Tripsy credential and MCP client are the same code the tripsy-mcp CLI
 * uses (lib/tripsy/*.mjs), so there is one implementation of the OAuth dance
 * and one place where a token is refreshed.
 *
 * Failure policy: route handlers answer with JSON errors, they never throw into
 * the host, and the plugin never reads the token out loud.
 */
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { mountOnce } from './mount-once.mjs';

/** Stable cordis plugin name. */
export const name = 'dsh-tripsy';

/** Services required before the routes can mount. */
export const inject = ['webServer'];

/** Route paths (the client bundle mirrors these literals). */
export const ROUTES = {
  health: '/api/dsh-tripsy/health',
  me: '/api/dsh-tripsy/me',
  trips: '/api/dsh-tripsy/trips',
  trip: '/api/dsh-tripsy/trip',
  login: '/api/dsh-tripsy/login',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function isLoopback(req) {
  const a = req.socket?.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

/** Open a URL in the user's browser. Best effort: the panel also shows it. */
function openInBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

function defaultAuthFile() {
  return path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'tripsy-auth.json');
}

function applyImpl(ctx, config) {
  if (config?.enabled === false) return;

  // oauth.mjs resolves the credential path at import time, so the environment
  // has to be settled before the bridge is pulled in.
  process.env.TRIPSY_AUTH_FILE =
    config?.authFile || process.env.TRIPSY_AUTH_FILE || defaultAuthFile();

  const allowRemote = config?.allowRemote === true;
  let apiPromise = null;
  const getApi = () => (apiPromise ??= import('./tripsy/api.mjs'));

  let pendingLogin = null;

  async function beginLogin() {
    if (pendingLogin) return pendingLogin.info;
    const info = { authUrl: null, done: false, error: null, startedAt: Date.now() };
    const openUrl = async (url) => {
      info.authUrl = url;
      try {
        openInBrowser(url);
      } catch {
        /* the panel shows the link as a fallback */
      }
    };
    const promise = (async () => {
      const api = await getApi();
      await api.startLogin({ openUrl, timeoutMs: 30 * 60 * 1000 });
      info.done = true;
    })()
      .catch((e) => {
        info.error = e?.message || String(e);
      })
      .finally(() => {
        pendingLogin = null;
      });
    pendingLogin = { info, promise };
    // login() binds the loopback listener asynchronously; wait for the URL so
    // the browser half can show it without polling.
    for (let i = 0; i < 50 && !info.authUrl && !info.error; i++) await sleep(100);
    return info;
  }

  const handle = (fn) => async (req, res) => {
    if (!allowRemote && !isLoopback(req)) {
      writeJson(res, 403, { error: 'dsh-tripsy only answers loopback requests' });
      return;
    }
    try {
      await fn(req, res);
    } catch (e) {
      const notLoggedIn = Boolean(e?.notLoggedIn || e?.authFailed || e?.status === 401);
      if (!res.headersSent) {
        writeJson(res, notLoggedIn ? 401 : 500, {
          error: e?.message || String(e),
          notLoggedIn,
        });
      }
    }
  };

  const method = (req, want) => (req.method || 'GET').toUpperCase() === want;

  const routes = [
    {
      kind: 'exact',
      path: ROUTES.health,
      handler: handle(async (req, res) => {
        if (!method(req, 'GET')) return writeJson(res, 405, { error: 'GET only' });
        const api = await getApi();
        let me = null;
        let meError = null;
        if (api.authStatus().loggedIn) {
          try {
            me = await api.getMe();
          } catch (e) {
            meError = e?.message || String(e);
          }
        }
        writeJson(res, 200, { ok: true, auth: api.authStatus(), me, meError });
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.trips,
      handler: handle(async (req, res) => {
        if (!method(req, 'GET')) return writeJson(res, 405, { error: 'GET only' });
        const api = await getApi();
        const url = new URL(req.url ?? '/', 'http://x');
        const deleted = url.searchParams.get('deleted') === '1';
        writeJson(res, 200, { trips: await api.listTrips({ deleted }) });
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.trip,
      handler: handle(async (req, res) => {
        if (!method(req, 'GET')) return writeJson(res, 405, { error: 'GET only' });
        const url = new URL(req.url ?? '/', 'http://x');
        const id = url.searchParams.get('id');
        if (!id) return writeJson(res, 400, { error: 'expected ?id=<trip id>' });
        const api = await getApi();
        writeJson(res, 200, await api.tripDetail(id));
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.login,
      handler: handle(async (req, res) => {
        if (!method(req, 'POST')) return writeJson(res, 405, { error: 'POST only' });
        writeJson(res, 200, await beginLogin());
      }),
    },
  ];

  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, 'dsh-tripsy: routes');
}

/**
 * Single-instance guard: a manual profile-patch row and a marketplace install
 * (which also adds the package to `dsh.profile.bundles`) can coexist, and the
 * second mount must not re-register the same routes.
 */
export const apply = mountOnce('dsh-tripsy', applyImpl);

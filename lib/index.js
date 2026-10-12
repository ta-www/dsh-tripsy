/**
 * dsh-tripsy — host half.
 *
 * Serves the /api/dsh-tripsy route family that the browser half renders:
 * credential health, the trip list, one trip with its sub-resources, and the
 * browser login flow. Everything rides the official plugin seats — no DSH
 * source changes.
 *
 * The Tripsy credential and MCP client live in lib/tripsy/*.mjs, so there is one
 * implementation of the OAuth dance and one place where a token is refreshed.
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
  trips: '/api/dsh-tripsy/trips',
  trip: '/api/dsh-tripsy/trip',
  ics: '/api/dsh-tripsy/ics',
  connect: '/api/dsh-tripsy/connect',
  disconnect: '/api/dsh-tripsy/disconnect',
  login: '/api/dsh-tripsy/login',
};

/**
 * The address Tripsy's own app shows on its "connect to Claude / MCP" screen.
 * Offered as a one-click default so the common case needs no typing, while the
 * flow itself works with any URL the user pastes.
 */
export const DEFAULT_MCP_URL = 'https://mcp.tripsy.app';

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

/** Read a small JSON body, bounded so a stray upload cannot fill memory. */
function readJsonBody(req, limit = 64 * 1024) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        raw = '';
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/** Open a URL in the user's browser. Best effort: the panel also shows it. */
/**
 * The command that hands a URL to the platform's default browser.
 *
 * Windows must NOT go through `cmd /c start`: cmd.exe treats `&` in the query
 * string as a command separator, so the browser only received everything before
 * the first `&` -- which is an authorize request without `client_id`, and the
 * server answered "Missing client_id parameter". Handing the URL straight to
 * url.dll's FileProtocolHandler spawns no shell, so the URL arrives verbatim.
 *
 * Exported (and platform-parameterised) so the suite can assert that no shell
 * is used on any platform.
 */
export function browserCommand(url, platform = process.platform) {
  if (platform === 'win32') {
    return { cmd: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
  }
  if (platform === 'darwin') return { cmd: 'open', args: [url] };
  return { cmd: 'xdg-open', args: [url] };
}

/** Open a URL in the user's browser. Best effort: the panel also shows it. */
function openInBrowser(url) {
  const { cmd, args } = browserCommand(url);
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

  async function beginLogin(endpoints) {
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
      await api.startLogin({ openUrl, timeoutMs: 30 * 60 * 1000, ...(endpoints ? { endpoints } : {}) });
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
        const auth = api.authStatus();
        let account = null;
        let accountError = null;
        if (auth.loggedIn) {
          try {
            const me = await api.getMe();
            // Only what the panel renders. The Tripsy profile carries the
            // account's real name, e-mail and avatar photo; none of it is needed
            // to browse trips, so none of it is handed to the browser.
            account = { currency: me?.default_currency ?? null };
          } catch (e) {
            accountError = e?.message || String(e);
          }
        }
        writeJson(res, 200, { ok: true, auth, account, accountError });
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
        const detail = await api.tripDetail(id);
        // Costs are summarised here rather than in the browser half: it is real
        // arithmetic and belongs next to the data, where it can be tested. The
        // prompt that asks the agent to complete it is built from the same
        // summary, so the figures the agent sees are the ones on screen.
        const { summarizeCosts, costPrompt } = await import('./tripsy/costs.mjs');
        const costs = summarizeCosts(detail);
        writeJson(res, 200, { ...detail, costs: { ...costs, prompt: costPrompt(detail, costs) } });
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.ics,
      handler: handle(async (req, res) => {
        if (!method(req, 'GET')) return writeJson(res, 405, { error: 'GET only' });
        const url = new URL(req.url ?? '/', 'http://x');
        const id = url.searchParams.get('id');
        if (!id) return writeJson(res, 400, { error: 'expected ?id=<trip id>' });
        const api = await getApi();
        const detail = await api.tripDetail(id);
        const { buildIcs, icsFilename } = await import('./tripsy/ics.mjs');
        const calendar = buildIcs(detail);
        const filename = icsFilename(calendar.name);
        const body = Buffer.from(calendar.body, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/calendar; charset=utf-8',
          // Chinese filenames need the RFC 5987 form; the ASCII fallback keeps
          // older clients from writing a mangled name.
          'Content-Disposition': `attachment; filename="tripsy-${id}.ics"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': body.length,
          'Cache-Control': 'no-store',
          'X-Tripsy-Events': String(calendar.events),
          'X-Tripsy-Skipped': String(calendar.skipped),
        });
        res.end(body);
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.connect,
      handler: handle(async (req, res) => {
        if (!method(req, 'POST')) return writeJson(res, 405, { error: 'POST only' });
        const body = await readJsonBody(req);
        const url = typeof body?.url === 'string' ? body.url.trim() : '';
        if (!url) {
          return writeJson(res, 400, { error: '请先粘贴 Tripsy App 里显示的 MCP 地址。' });
        }
        const api = await getApi();
        let endpoints;
        try {
          endpoints = await api.resolveEndpoint(url);
        } catch (e) {
          return writeJson(res, 400, { error: e?.message || String(e) });
        }
        const info = await beginLogin(endpoints);
        writeJson(res, 200, {
          ...info,
          endpoint: {
            resource: endpoints.resource,
            resourceName: endpoints.resourceName,
            issuer: endpoints.issuer,
          },
        });
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.disconnect,
      handler: handle(async (req, res) => {
        if (!method(req, 'POST')) return writeJson(res, 405, { error: 'POST only' });
        const api = await getApi();
        writeJson(res, 200, { ok: true, auth: api.disconnect() });
      }),
    },
    {
      kind: 'exact',
      path: ROUTES.login,
      handler: handle(async (req, res) => {
        if (!method(req, 'POST')) return writeJson(res, 405, { error: 'POST only' });
        // Re-authorising an existing connection: the endpoints are already in
        // the credential file, so nothing needs to be discovered again.
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

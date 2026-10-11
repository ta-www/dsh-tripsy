// Tripsy data access for the plugin, on top of the same OAuth + MCP bridge the
// tripsy-mcp CLI uses. Kept separate from the cordis plugin entry so the route
// handlers stay readable and the bridge code stays untouched.
import { AUTH_FILE, MCP_URL, ensureAccessToken, isFresh, loadAuth, login } from './oauth.mjs';
import { RemoteMCP } from './mcp.mjs';

let client = null;

/** Resolved credential state, safe to hand to the browser half. */
export function authStatus() {
  const auth = loadAuth();
  const t = auth?.tokens;
  const now = Math.floor(Date.now() / 1000);
  return {
    loggedIn: Boolean(t?.access_token),
    fresh: Boolean(t && isFresh(t)),
    scope: t?.scope ?? null,
    expiresInSeconds: t?.expires_at ? t.expires_at - now : null,
    hasRefreshToken: Boolean(t?.refresh_token),
    authFile: AUTH_FILE,
  };
}

/** Connect once, reusing the session; a dead credential resets the cache. */
export async function connect() {
  const auth = loadAuth();
  if (!auth?.client_id || !auth.tokens) {
    const e = new Error('Tripsy 尚未登录。请在面板上点「登录 Tripsy」完成一次浏览器授权。');
    e.notLoggedIn = true;
    throw e;
  }
  await ensureAccessToken(auth);
  if (client) return client;
  const next = new RemoteMCP({ auth, url: auth.resource || MCP_URL, name: 'tripsy' });
  await next.initialize();
  client = next;
  return client;
}

/**
 * Tripsy answers with a JSON document in the text block (and sometimes
 * structuredContent). Normalise both shapes to a plain object.
 *
 * An `isError` result must throw rather than degrade into empty data: the tool
 * schema errors (for example an id sent as an integer instead of a string) are
 * otherwise invisible, and the panel would just look empty.
 */
function unwrap(result) {
  if (!result) return null;
  const text = (result.content || []).find((c) => c?.type === 'text')?.text;
  if (result.isError) {
    throw new Error(typeof text === 'string' && text ? text : 'Tripsy 工具调用失败');
  }
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

/**
 * Tripsy ids come back as JSON numbers but the tool schemas declare them as
 * strings; passing the number through verbatim is rejected by validation.
 */
const asId = (value) => (value === null || value === undefined ? value : String(value));

export async function callTool(name, args) {
  try {
    const remote = await connect();
    return unwrap(await remote.callTool(name, args ?? {}));
  } catch (e) {
    if (e && (e.authFailed || e.notLoggedIn || e.status === 401)) client = null;
    throw e;
  }
}

/** A sub-resource list that may legitimately fail (permissions, empty). */
async function safeTool(name, args) {
  try {
    const data = await callTool(name, args);
    return data?.data?.results ?? data?.results ?? [];
  } catch {
    return null;
  }
}

export async function getMe() {
  const data = await callTool('tripsy_me_show');
  return data?.data ?? data;
}

export async function listTrips({ deleted = false } = {}) {
  const data = await callTool('tripsy_trips_list', deleted ? { deleted: true } : {});
  return data?.data?.results ?? data?.results ?? [];
}

export async function tripDetail(id) {
  const tripId = asId(id);
  const [trip, activities, hostings, transportations, expenses] = await Promise.all([
    callTool('tripsy_trips_show', { id: tripId }),
    safeTool('tripsy_activities_list', { trip_id: tripId }),
    safeTool('tripsy_hostings_list', { trip_id: tripId }),
    safeTool('tripsy_transportations_list', { trip_id: tripId }),
    safeTool('tripsy_expenses_list', { trip_id: tripId }),
  ]);
  return {
    trip: trip?.data ?? trip,
    activities,
    hostings,
    transportations,
    expenses,
  };
}

/** Run the browser login flow; `openUrl` is injected so tests can stub it. */
export async function startLogin({ openUrl, timeoutMs } = {}) {
  const auth = await login({ openUrl, ...(timeoutMs ? { timeoutMs } : {}) });
  client = null;
  return authStatus();
}

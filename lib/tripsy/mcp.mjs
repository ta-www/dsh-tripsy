// Minimal MCP "Streamable HTTP" client for the Tripsy MCP endpoint.
// Implements just what a bridge needs: initialize, tools, resources.
import { MCP_URL, ensureAccessToken } from './oauth.mjs';

const log = (...a) => process.stderr.write('[dsh-tripsy] ' + a.join(' ') + '\n');

export const PROTOCOL_VERSION = '2025-06-18';

/** Parse a text/event-stream body into the JSON-RPC messages it carries. */
export function parseSse(text) {
  const messages = [];
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('');
    if (!data) continue;
    try {
      messages.push(JSON.parse(data));
    } catch {
      /* ignore keep-alive or partial frames */
    }
  }
  return messages;
}

export class TripsyError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'TripsyError';
    this.status = status;
    this.body = body;
  }
}

export class RemoteMCP {
  /**
   * @param {object} options
   * @param {object} [options.auth]     Tripsy-style credential object (optional)
   * @param {string} [options.url]      Streamable HTTP endpoint
   * @param {Function} [options.getToken] async (force) => bearer token. Overrides
   *   `auth` so the same transport can serve any static-token or OAuth server.
   * @param {string} [options.name]     label used in log lines
   */
  constructor({ auth, url = MCP_URL, getToken, name = 'remote' }) {
    this.auth = auth;
    this.url = url;
    this.name = name;
    this.getToken =
      getToken || (async (force = false) => ensureAccessToken(auth, { force }));
    this.sessionId = null;
    this.protocolVersion = PROTOCOL_VERSION;
    this.serverInfo = null;
    this.initialized = false;
    this._nextId = 1;
  }

  async _token(force = false) {
    return this.getToken(force);
  }

  async _post(payload, { token, sessionId }) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    if (this.initialized) headers['MCP-Protocol-Version'] = this.protocolVersion;

    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res;
  }

  /** One JSON-RPC round trip, with a single forced token refresh on 401. */
  async request(method, params, { notification = false } = {}) {
    const id = notification ? undefined : this._nextId++;
    const payload = notification
      ? { jsonrpc: '2.0', method, params: params ?? {} }
      : { jsonrpc: '2.0', id, method, params: params ?? {} };

    let token = await this._token();
    let res = await this._post(payload, { token, sessionId: this.sessionId });

    if (res.status === 401) {
      log('remote returned 401; refreshing token and retrying once');
      token = await this._token(true);
      res = await this._post(payload, { token, sessionId: this.sessionId });
    }

    const newSession = res.headers.get('mcp-session-id');
    if (newSession) this.sessionId = newSession;

    if (notification) {
      if (res.status >= 400) {
        const body = await res.text().catch(() => '');
        log(`notification ${method} -> HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      return { result: null };
    }

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!res.ok) {
      throw new TripsyError(`remote HTTP ${res.status} for ${method}: ${text.slice(0, 300)}`, {
        status: res.status,
        body: text,
      });
    }

    let message = null;
    if (contentType.includes('text/event-stream')) {
      const messages = parseSse(text);
      message = messages.find((m) => m && m.id === id) || messages.find((m) => m && (m.result || m.error)) || null;
    } else if (text.trim()) {
      try {
        message = JSON.parse(text);
      } catch {
        throw new TripsyError(`unparseable response for ${method}: ${text.slice(0, 300)}`);
      }
    }

    if (!message) return { result: null };
    if (message.error) {
      const err = new TripsyError(
        `remote error for ${method}: ${message.error.message || JSON.stringify(message.error)}`,
      );
      err.rpcError = message.error;
      throw err;
    }
    return { result: message.result };
  }

  async initialize() {
    const { result } = await this.request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'dsh-tripsy', version: '1.0.0' },
    });
    if (result) {
      if (result.protocolVersion) this.protocolVersion = result.protocolVersion;
      this.serverInfo = result.serverInfo || null;
      this.capabilities = result.capabilities || {};
      this.instructions = result.instructions || null;
    }
    this.initialized = true;
    await this.request('notifications/initialized', {}, { notification: true });
    return result;
  }

  async listTools() {
    const tools = [];
    let cursor;
    do {
      const params = cursor ? { cursor } : {};
      const { result } = await this.request('tools/list', params);
      if (result?.tools) tools.push(...result.tools);
      cursor = result?.nextCursor;
    } while (cursor);
    return tools;
  }

  async callTool(name, args) {
    const { result } = await this.request('tools/call', { name, arguments: args ?? {} });
    return result;
  }

  async listResources() {
    const { result } = await this.request('resources/list', {});
    return result;
  }

  async readResource(uri) {
    const { result } = await this.request('resources/read', { uri });
    return result;
  }
}

/** Connect, handshake, and hand back a ready client. */
export async function connect(auth, url) {
  const client = new RemoteMCP({ auth, url });
  await client.initialize();
  return client;
}

// A fake Tripsy: OAuth 2.1 authorization server + Streamable HTTP MCP endpoint.
// Used by test/e2e.mjs to exercise the real client code paths offline.
import crypto from 'node:crypto';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const json = (res, status, body, headers = {}) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(text),
    ...headers,
  });
  res.end(text);
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
  });
}

export const TRIPS = [
  {
    id: 'trip-tokyo',
    title: '东京周末',
    destination: '日本 东京',
    start_date: '2026-10-17',
    end_date: '2026-10-19',
  },
];

export function startMock({ host = '127.0.0.1', port = 45999, acceptAnyToken = false } = {}) {
  const state = {
    acceptAnyToken,
    clients: new Map(),
    codes: new Map(),
    access: new Map(), // token -> {expires_at}
    refresh: new Map(),
    trips: structuredClone(TRIPS),
    /** Sub-resource lists, keyed by the tool that returns them. */
    subresources: {
      tripsy_activities_list: [
        {
          id: 11,
          name: '东京塔',
          activity_type: 'general',
          starts_at: '2026-10-17T02:00:00Z',
          timezone: 'Asia/Tokyo',
          address: '东京都港区芝公园 4-2-8',
        },
      ],
      tripsy_hostings_list: [
        {
          id: 12,
          name: 'Park Hotel Tokyo',
          starts_at: '2026-10-17T07:00:00Z',
          timezone: 'Asia/Tokyo',
        },
      ],
      tripsy_transportations_list: [],
      tripsy_expenses_list: [],
    },
    issued: 0,
    // Instrumentation for assertions.
    seen: {
      registerCalls: 0,
      tokenCalls: [],
      mcpMethods: [],
      sessionHeaders: [],
      protocolHeaders: [],
      unauthorizedResponses: 0,
    },
    force401Once: false,
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const path = url.pathname;

    // ---- OAuth authorization server metadata -------------------------------
    if (path === '/.well-known/oauth-authorization-server') {
      return json(res, 200, {
        issuer: `http://${host}:${port}`,
        authorization_endpoint: `http://${host}:${port}/o/authorize/`,
        token_endpoint: `http://${host}:${port}/o/token/`,
        registration_endpoint: `http://${host}:${port}/o/register/`,
        revocation_endpoint: `http://${host}:${port}/o/revoke_token/`,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        scopes_supported: ['read', 'write', 'profile', 'email'],
      });
    }
    if (path === '/.well-known/oauth-protected-resource') {
      return json(res, 200, {
        resource: `http://${host}:${port}/mcp`,
        authorization_servers: [`http://${host}:${port}`],
        scopes_supported: ['read', 'write', 'profile', 'email'],
        bearer_methods_supported: ['header'],
      });
    }

    // ---- Dynamic client registration --------------------------------------
    if (path === '/o/register/' && req.method === 'POST') {
      state.seen.registerCalls++;
      const body = JSON.parse((await readBody(req)) || '{}');
      const clientId = 'client-' + b64url(crypto.randomBytes(12));
      state.clients.set(clientId, { redirect_uris: body.redirect_uris || [] });
      return json(res, 201, {
        client_id: clientId,
        client_name: body.client_name,
        redirect_uris: body.redirect_uris,
        grant_types: body.grant_types,
        response_types: body.response_types,
        token_endpoint_auth_method: 'none',
      });
    }

    // ---- Authorization endpoint: auto-approves (stands in for the user) ----
    if (path === '/o/authorize/') {
      const clientId = url.searchParams.get('client_id');
      const client = state.clients.get(clientId);
      if (!client) return json(res, 400, { error: 'invalid_client' });
      const code = 'code-' + b64url(crypto.randomBytes(8));
      state.codes.set(code, {
        client_id: clientId,
        redirect_uri: url.searchParams.get('redirect_uri'),
        challenge: url.searchParams.get('code_challenge'),
        scope: url.searchParams.get('scope'),
      });
      const target = new URL(url.searchParams.get('redirect_uri'));
      target.searchParams.set('code', code);
      target.searchParams.set('state', url.searchParams.get('state') || '');
      res.writeHead(302, { Location: target.toString() });
      return res.end();
    }

    // ---- Token endpoint ----------------------------------------------------
    if (path === '/o/token/' && req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req));
      const grant = form.get('grant_type');
      state.seen.tokenCalls.push({ grant, at: Date.now() });

      if (grant === 'authorization_code') {
        const entry = state.codes.get(form.get('code'));
        if (!entry) return json(res, 400, { error: 'invalid_grant' });
        // Real PKCE check, so a broken verifier cannot pass silently.
        const expected = b64url(
          crypto.createHash('sha256').update(form.get('code_verifier') || '').digest(),
        );
        if (expected !== entry.challenge) {
          return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE mismatch' });
        }
        state.codes.delete(form.get('code'));
        state.issued++;
        const access = `at-${state.issued}`;
        const refresh = `rt-${state.issued}`;
        // expires_in is deliberately short so the client refreshes before use,
        // exercising the refresh path on the very first MCP call.
        state.access.set(access, { expires_at: Date.now() / 1000 + 60 });
        state.refresh.set(refresh, { client_id: form.get('client_id') });
        return json(res, 200, {
          access_token: access,
          refresh_token: refresh,
          token_type: 'Bearer',
          scope: entry.scope,
          expires_in: 60,
        });
      }

      if (grant === 'refresh_token') {
        const record = state.refresh.get(form.get('refresh_token'));
        if (!record) return json(res, 400, { error: 'invalid_grant' });
        state.issued++;
        const access = `at-${state.issued}`;
        state.access.set(access, { expires_at: Date.now() / 1000 + 3600 });
        return json(res, 200, {
          access_token: access,
          token_type: 'Bearer',
          scope: 'read write profile email',
          expires_in: 3600,
        });
      }

      return json(res, 400, { error: 'unsupported_grant_type' });
    }

    if (path === '/o/revoke_token/' && req.method === 'POST') {
      return json(res, 200, {});
    }

    // ---- MCP endpoint (Streamable HTTP) ------------------------------------
    if (path === '/mcp') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      const record = token ? state.access.get(token) : null;
      const known =
        record && record.expires_at > Date.now() / 1000;
      const valid = Boolean(token) && (known || state.acceptAnyToken);

      if (!valid || state.force401Once) {
        if (state.force401Once) state.force401Once = false;
        state.seen.unauthorizedResponses++;
        res.writeHead(401, {
          'Content-Type': 'text/plain',
          'WWW-Authenticate': `Bearer resource_metadata="http://${host}:${port}/.well-known/oauth-protected-resource"`,
        });
        return res.end('no bearer token');
      }

      const payload = JSON.parse((await readBody(req)) || '{}');
      const { id, method, params } = payload;
      state.seen.mcpMethods.push(method);
      if (method !== 'initialize') {
        state.seen.sessionHeaders.push(req.headers['mcp-session-id'] || null);
        state.seen.protocolHeaders.push(req.headers['mcp-protocol-version'] || null);
      }

      if (method === 'notifications/initialized') {
        res.writeHead(202);
        return res.end();
      }

      // Simulate a server that requires the session header after initialize.
      if (method !== 'initialize' && req.headers['mcp-session-id'] !== 'sess-mock') {
        return json(res, 400, { error: 'missing or invalid Mcp-Session-Id' });
      }

      const ok = (result) => ({ jsonrpc: '2.0', id, result });
      let message;

      if (method === 'initialize') {
        res.setHeader('mcp-session-id', 'sess-mock');
        message = ok({
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'mock-tripsy', version: '1.0.0' },
          instructions: 'MOCK: 这是本地假 Tripsy，仅用于测试。',
        });
        return json(res, 200, message);
      }

      if (method === 'tools/list') {
        message = ok({
          tools: [
            { name: 'tripsy_trips_list', description: '列出全部行程' },
            { name: 'tripsy_trips_show', description: '按 ID 读取一条行程' },
            { name: 'tripsy_trips_create', description: '新建行程' },
            { name: 'tripsy_trips_delete', description: '删除行程' },
            { name: 'tripsy_trips_update', description: '修改行程' },
            { name: 'tripsy_activities_list', description: '行程下的活动' },
            { name: 'tripsy_hostings_list', description: '行程下的住宿' },
            { name: 'tripsy_transportations_list', description: '行程下的交通' },
            { name: 'tripsy_expenses_list', description: '行程下的费用' },
            { name: 'tripsy_me_show', description: '账号资料' },
          ].map((t) => ({
            ...t,
            inputSchema: { type: 'object', properties: {}, additionalProperties: true },
          })),
        });
        // Answer tools/list as SSE so the client's event-stream parsing is tested.
        const text = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-store',
        });
        return res.end(text);
      }

      if (method === 'tools/call') {
        const name = params?.name;
        const args = params?.arguments || {};
        // The real service answers with a JSON document in a text block, so the
        // mock does too: that exercises the client's normalisation path.
        const payload = (body) => ok({ content: [{ type: 'text', text: JSON.stringify(body) }] });
        const list = (rows) => payload({ data: { count: rows.length, results: rows }, status_code: 200 });

        if (name === 'tripsy_trips_list') {
          message = list(state.trips);
        } else if (name === 'tripsy_trips_show') {
          // Tripsy declares `id` as a string and rejects an integer with a
          // validation error; reproducing that here keeps the client's id
          // coercion covered.
          if (typeof args.id !== 'string') {
            message = ok({
              content: [
                {
                  type: 'text',
                  text: `validating "arguments": validating /properties/id: type: ${args.id} has type "integer", want "string"`,
                },
              ],
              isError: true,
            });
          } else {
            const trip = state.trips.find((t) => String(t.id) === args.id);
            message = trip
              ? payload({ data: trip, status_code: 200 })
              : payload({ detail: 'No Trip matches the given query.', status_code: 404 });
          }
        } else if (name === 'tripsy_trips_create') {
          const trip = { id: 'trip-' + (state.trips.length + 1), ...args };
          state.trips.push(trip);
          message = payload({ data: trip, status_code: 201 });
        } else if (name === 'tripsy_trips_delete') {
          const before = state.trips.length;
          state.trips = state.trips.filter((t) => String(t.id) !== String(args.id));
          message = payload({
            data: null,
            status_code: before === state.trips.length ? 404 : 204,
          });
        } else if (
          name === 'tripsy_activities_list' ||
          name === 'tripsy_hostings_list' ||
          name === 'tripsy_transportations_list' ||
          name === 'tripsy_expenses_list'
        ) {
          message = list(state.subresources[name] || []);
        } else if (name === 'tripsy_me_show') {
          message = payload({ data: { default_currency: 'CNY' }, status_code: 200 });
        } else {
          return json(res, 200, {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `unknown tool: ${name}` },
          });
        }
        return json(res, 200, message);
      }

      if (method === 'resources/list') {
        return json(res, 200, ok({ resources: [] }));
      }

      return json(res, 200, {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `method not found: ${method}` },
      });
    }

    json(res, 404, { error: 'not_found', path });
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({
        server,
        state,
        host,
        port,
        origin: `http://${host}:${port}`,
        close: () =>
          new Promise((r) => {
            // Keep-alive sockets would otherwise hold close() open forever and
            // hang the test process.
            server.closeAllConnections?.();
            server.close(r);
          }),
      });
    });
  });
}

// Note: pathToFileURL, not string concatenation — on Windows import.meta.url
// is file:///F:/... and a hand-built file://F:/... never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mock = await startMock({
    port: Number(process.argv[2] || 45999),
    acceptAnyToken: process.env.MOCK_ACCEPT_ANY_TOKEN === '1',
  });
  console.log(`mock Tripsy listening on ${mock.origin}`);
}

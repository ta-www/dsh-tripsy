# dsh-tripsy

Browse your **[Tripsy](https://tripsy.app)** trips inside a DeepSeek Harness panel: itinerary, activities, lodging, transport and expenses — with the times converted into each item's own timezone.

[中文说明](README.zh-CN.md) | English

---

## What it does

A sidebar entry and a center-column page. Pick a trip on the left, read its day-by-day detail on the right.

**It is read-only on purpose.** Trips, activities and bookings are created by *asking the agent* — the same Tripsy account is already exposed to the model through the Tripsy MCP tools, so "add a restaurant in Manhattan on the 5th" works from the chat, with the agent confirming what it is about to change. A panel that can silently delete a booking is not worth the convenience.

```
┌ Tripsy ─────────────────────────────────┐
│ New York City · 2026-10-11 → 10-17      │
├──────────────┬──────────────────────────┤
│ New York City│  [cover]                 │
│              │  New York City           │
│              │  活动 27                 │
│              │  Oct 12, 09:00  The Met  │
│              │  Oct 12, 13:00  Katz's   │
│              │  住宿 1 · 交通 7 · 费用 0 │
└──────────────┴──────────────────────────┘
```

## Install

```sh
dsh plugin --profile web add github:ta-www/dsh-tripsy
```

Refresh the page. **Tripsy** appears in the sidebar. The first time, click **登录 Tripsy / Sign in** — the browser opens once for the OAuth handshake, and the token then refreshes itself indefinitely.

## How it works

The host half registers a small route family and reuses the same OAuth + MCP code as the [tripsy-mcp](https://github.com/ta-www/tripsy-mcp) CLI, so there is exactly one implementation of the OAuth dance and one place a token is refreshed.

| | |
|---|---|
| `lib/index.js` | host half: `/api/dsh-tripsy/{health,trips,trip,login}` |
| `lib/client.js` | browser half: the sidebar row and the panel page |
| `lib/tripsy/*.mjs` | OAuth 2.1 (PKCE + dynamic client registration), Streamable HTTP MCP client |
| `cordis.patch.yml` | inserts the plugin row |

Credential at rest: `$DSH_HOME/tripsy-auth.json` (override with the `authFile` config). It is never sent to the browser — the panel only ever sees the data, never the token.

Requests are refused unless they come from loopback. Set `allowRemote: true` in the plugin config if you deliberately serve the UI over a LAN address.

## Configuration

```yaml
- id: ui-tripsy
  name: dsh-tripsy
  config:
    authFile: 'C:\Users\you\.dsh\tripsy-auth.json'   # where the token lives
    allowRemote: false                               # keep loopback-only
    enabled: true
```

## Notes

- Needs an active Tripsy account. Document attachments require Tripsy Pro; everything else works on a free account.
- Times are stored as UTC by Tripsy and rendered in each item's IANA timezone, which is what the upstream API expects clients to do.
- Unofficial community plugin, not affiliated with Tripsy.

## License

[MIT](LICENSE)

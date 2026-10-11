# dsh-tripsy

Browse your **[Tripsy](https://tripsy.app)** trips inside a DeepSeek Harness panel: itinerary, activities, lodging, transport and expenses — with the times converted into each item's own timezone.

[中文说明](README.zh-CN.md) | English

---

## What it does

A sidebar entry and a center-column page with two tabs.

**行程浏览 / Browse** — pick a trip on the left. The right side shows a cover hero with the trip name, countdown, duration and date range; a day-grouped timeline with an icon per stop; and a cost card totalling each category from the items' own prices. Every time is rendered in its own IANA timezone.

**AI 管理 / Manage** — describe the change you want in plain language. The tab composes a precise instruction for the selected trip (id, dates and timezone included) and hands it to the DSH composer, so the agent does the work with the Tripsy MCP tools and you see every step. The panel itself never writes to your account: creating and editing stay in the conversation, where the agent confirms what it is about to change.

**Your account details never reach the browser.** `/api/dsh-tripsy/health` returns only the auth summary and the account currency — not the name, e-mail or avatar the Tripsy profile carries.

```
┌ Tripsy ─────────────────────────────────┐
│ 行程浏览 │ AI 管理                       │
├──────────────┬──────────────────────────┤
│ New York City│  ╔══════════════════════╗ │
│ 2026-10-11   │  ║  cover  +  NYC       ║ │
│              │  ╚══════════════════════╝ │
│              │  ＋   ✈️   🛏️   💳        │
│              │  10月11日 星期日          │
│              │  ● ✈️ LAX → JFK   05:57  │
│              │  │ 🚗 驾车到酒店   15:00  │
│              │  ● 🏨 Aman        16:00  │
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

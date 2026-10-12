# dsh-tripsy

Browse your **[Tripsy](https://tripsy.app)** trips inside a DeepSeek Harness panel: itinerary, activities, lodging, transport and expenses — with the times converted into each item's own timezone.

[中文说明](README.zh-CN.md) | English

---

## What it does

A sidebar entry and a center-column page.

**＋ New trip** sits at the top of the trip list. Describe what you want in plain language — where, how long, who with, what you like — and the panel composes a detailed instruction that the agent turns into a real itinerary: the trip itself first, then activities, lodging and transport filled in day by day.

**Pick a trip** and it opens with two modules inside it:

- **行程浏览 / Browse** — a cover hero with the trip name, countdown, duration and date range; a day-grouped timeline with an icon per stop; and a cost card totalling each category from the items' own prices. Every time is rendered in its own IANA timezone.
- **AI 管理 / Manage** — describe the change you want, then press one button. The panel composes a precise instruction for that trip (id, dates and timezone included) and **sends it straight to the conversation**, so the agent starts working immediately and you watch every step. There is no prompt text to read and nothing to paste. If no conversation is open yet, the panel says so up front and the button falls back to copying the instruction.

**Your account details never reach the browser.** `/api/dsh-tripsy/health` returns only the auth summary and the account currency — not the name, e-mail or avatar the Tripsy profile carries.

```
┌ Tripsy ─────────────────────────────────┐
│ ┌ ＋ 新建行程 ─────────────────────────┐ │
│ │ 用一句话让 AI 生成行程                │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────┬───────────────────┐ │
│ │ New York City    │ 行程浏览 │ AI 管理 │ │
│ │ 10-11 → 10-17    ├───────────────────┤ │
│ │ 东京周末         │  ╔═════════════╗  │ │
│ │                  │  ║    封面     ║  │ │
│ │                  │  ╚═════════════╝  │ │
│ │                  │  10月11日 星期日   │ │
│ │                  │  ● ✈️ LAX → JFK   │ │
│ │                  │  │ 🚗 驾车到酒店  │ │
│ │                  │  ● 🏨 Aman        │ │
│ └──────────────────┴───────────────────┘ │
└─────────────────────────────────────────┘
```

## Install

```sh
dsh plugin --profile web add github:ta-www/dsh-tripsy
```

Refresh the page. **Tripsy** appears in the sidebar. The first time, click **登录 Tripsy / Sign in** — the browser opens once for the OAuth handshake, and the token then refreshes itself indefinitely.

## Trip costs, completed by the agent

Tripsy's own expense reporting needs a paid plan, so the panel works from the prices already attached to activities, lodgings and transports. The **费用概览** card in each trip sums what has a price, and **AI 计算费用** hands the agent an instruction that completes it.

The split is deliberate. Summing prices is arithmetic, so it happens on the host, exactly, once, and is tested. Estimating what has *no* price is judgement, so it goes to the agent — with the real numbers attached, and told to adopt them rather than re-estimate, to say when it is unsure instead of inventing precision, and never to assume an exchange rate. Multi-currency sums are reported per currency and never silently added together.

The card is always rendered. Keying it on a non-empty price list hid it on exactly the trips that need it most — a real imported trip has 16 items and no prices at all.

The instruction asks the agent to research each unpriced item on named platforms (大众点评 / 美团 / 抖音团购 / 小红书 domestically; Google Maps, Tripadvisor, Yelp or official pages elsewhere; 12306, 航旅纵横 or airline sites for transport), to state the source and when it was checked, and to say "couldn't find it" with a range rather than invent a precise number with a fake citation. It reports a table first and writes the prices back only once that table is confirmed, so the card then shows real totals.

The prompt also states that nothing else about the trip may be added or deleted: filling in prices is the only permitted write.

## Export to your calendar (.ics)

Each trip has **导出到日历 / Export to calendar** next to its name, and a **教程 / Guide** button that opens the import steps right there — the two halves of "get this onto my phone" are useless apart.

`GET /api/dsh-tripsy/ics?id=<tripId>` returns a `text/calendar` file:

- the trip itself as one all-day event, with the end date written exclusively (+1 day) so the last day is not lost
- every activity, lodging and transport as its own event, with `LOCATION`, `GEO`, confirmation codes, prices and notes
- items without a start time are skipped, and the count is reported in `X-Tripsy-Skipped`

**Times are absolute UTC instants, not TZID-anchored wall times.** Anchoring to a named zone is only correct when the file also carries a `VTIMEZONE` with that zone's real transitions; hand-writing those gets DST wrong and shifts events by an hour. UTC cannot be misread by any calendar and keeps flight durations truthful. The local wall time is written into each description instead, so the itinerary still reads the way the booking does.

On iPhone: save the `.ics`, then hand it to a Shortcut (the community *ICS To Calendar* one, or three actions of your own: receive Files → Choose from Calendar → Add New Event) or just tap the file and let iOS ask which calendar to use.

## How it works

The host half registers a small route family and carries its own OAuth 2.1 + MCP client in `lib/tripsy/`, so installing the plugin needs no separate service and there is exactly one implementation of the OAuth dance and one place a token is refreshed.

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

# dsh-tripsy

在 **DeepSeek Harness** 里直接浏览你的 **[Tripsy](https://tripsy.app)** 行程：日程、活动、住宿、交通、费用——并且**按各条目自己的时区**显示时间。

中文 | [English](README.md)

---

## 它做什么

侧栏多一行，中栏多一页，页内分两个页签。

**行程浏览** —— 左边选行程。右边是封面头图 + 行程名 + 倒计时 + 天数 + 日期区间；下面是**按天分组的行程轴**，每一项带自己的图标；再下面是**费用概览卡片**，按类别从各条目自己的价格汇总并给出总计。所有时间都按该条目自己的 IANA 时区渲染。

**AI 管理** —— 用大白话描述你想改什么。该页会为选中的行程拼出一条精确指令（含 id、日期、时区），**放进 DSH 的对话输入框**，由 agent 用 Tripsy MCP 工具去执行，每一步你都看得见。**面板自己从不写你的账号**：新建与修改留在对话里，由 agent 先复述将要改动的内容。

**账号信息不会下发到浏览器。** `/api/dsh-tripsy/health` 只返回授权摘要与账户货币，**不包含** Tripsy 资料里的姓名、邮箱和头像。

```
┌ Tripsy ─────────────────────────────────┐
│ 行程浏览 │ AI 管理                      │
├──────────────┬──────────────────────────┤
│ New York City│  ╔══════════════════════╗ │
│ 2026-10-11   │  ║  封面  +  NYC        ║ │
│              │  ╚══════════════════════╝ │
│              │  ＋   ✈️   🛏️   💳        │
│              │  10月11日 星期日          │
│              │  ● ✈️ LAX → JFK   05:57  │
│              │  │ 🚗 驾车到酒店   15:00  │
│              │  ● 🏨 Aman        16:00  │
└──────────────┴──────────────────────────┘
```

## 安装

```sh
dsh plugin --profile web add github:ta-www/dsh-tripsy
```

刷新页面，侧栏就会出现 **Tripsy**。第一次点「登录 Tripsy」，浏览器打开一次完成 OAuth 授权；之后令牌自动续期，不用再管。

## 实现方式

宿主半注册一族小路由，并**复用 [tripsy-mcp](https://github.com/ta-www/tripsy-mcp) CLI 里同一份 OAuth + MCP 代码**，因此 OAuth 只有一份实现、令牌只有一处刷新。

| 文件 | 作用 |
|---|---|
| `lib/index.js` | 宿主半：`/api/dsh-tripsy/{health,trips,trip,login}` |
| `lib/client.js` | 浏览器半：侧栏行与面板页 |
| `lib/tripsy/*.mjs` | OAuth 2.1（PKCE + 动态客户端注册）、Streamable HTTP MCP 客户端 |
| `cordis.patch.yml` | 插入插件行 |

凭据落盘在 `$DSH_HOME/tripsy-auth.json`（可用 `authFile` 配置项覆盖）。**令牌永远不会发到浏览器**——面板只能看到数据，看不到令牌。

请求默认只接受本机回环来源。如果你确实要通过局域网地址访问 UI，把插件配置里的 `allowRemote` 设为 `true`。

## 配置

```yaml
- id: ui-tripsy
  name: dsh-tripsy
  config:
    authFile: 'C:\Users\you\.dsh\tripsy-auth.json'   # 令牌存放位置
    allowRemote: false                               # 保持仅本机可访问
    enabled: true
```

## 说明

- 需要有效的 Tripsy 账号。文档附件类功能需要 Tripsy Pro，其余免费账号即可。
- Tripsy 以 UTC 存储时间，本插件按各条目自己的 IANA 时区渲染——这正是上游 API 要求客户端做的事。
- 非官方社区插件，与 Tripsy 无隶属关系。

## 许可证

[MIT](LICENSE)

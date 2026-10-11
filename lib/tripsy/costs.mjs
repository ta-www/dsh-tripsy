// Trip cost summary, and the prompt that asks the agent to complete it.
//
// Tripsy's own expense reporting needs a paid plan, so the panel works from the
// prices already attached to activities, lodgings and transports.
//
// The split matters: summing what has a price is arithmetic and is done here,
// exactly, once. Estimating what has no price is judgement and is handed to the
// agent. The prompt carries the real numbers so the agent completes them rather
// than inventing a budget from scratch, and it is told not to fake precision or
// exchange rates.

const CATEGORIES = [
  { key: 'lodging', label: '住宿' },
  { key: 'transport', label: '交通' },
  { key: 'food', label: '餐饮' },
  { key: 'tickets', label: '门票与景点' },
  { key: 'shopping', label: '购物' },
  { key: 'other', label: '其他' },
];

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

/** Activity types that are really meals. */
const FOOD_TYPES = new Set(['restaurant', 'cafe', 'bar', 'bakery', 'brewery', 'nightlife', 'foodMarket']);
/** Activity types that are ticketed or guided visits. */
const TICKET_TYPES = new Set([
  'museum',
  'tour',
  'theater',
  'concert',
  'event',
  'amusementPark',
  'aquarium',
  'nationalPark',
  'park',
  'stadium',
  'zoo',
  'movieTheater',
]);
const SHOPPING_TYPES = new Set(['shopping']);

/** Which bucket an activity belongs to. */
export function categoryOf(activityType) {
  const t = String(activityType || '');
  if (FOOD_TYPES.has(t)) return 'food';
  if (TICKET_TYPES.has(t)) return 'tickets';
  if (SHOPPING_TYPES.has(t)) return 'shopping';
  return 'other';
}

const toPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** Inclusive day count, so 10-16 -> 10-18 is three days. */
export function tripDays(trip) {
  const s = trip?.starts_at;
  const e = trip?.ends_at;
  const d = s && e ? (new Date(e) - new Date(s)) / 86400e3 : NaN;
  if (Number.isFinite(d) && d >= 0) return Math.round(d) + 1;
  const n = Number(trip?.number_of_days);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Everyone the trip is shared with, which is who the cost splits across. */
export function tripPeople(trip) {
  const guests = Array.isArray(trip?.guests) ? trip.guests : [];
  const joined = guests.filter((g) => g && g.joined !== false).length || guests.length || 1;
  return Math.max(1, joined);
}

function activityName(a) {
  return a?.name || a?.title || '未命名活动';
}

function transportName(t) {
  const from = t?.departure_description || '';
  const to = t?.arrival_description || '';
  if (from || to) return `${from || '?'} → ${to || '?'}`;
  return t?.name || '交通';
}

/**
 * Sum every price the trip actually carries.
 *
 * @returns {{
 *   rows: Array<{key:string,label:string,known:number,count:number,missingCount:number}>,
 *   knownTotal: number,
 *   byCurrency: Record<string, number>,
 *   missing: Array<{kind:string,name:string,when:string,category:string,currency:string|null}>,
 *   priced: Array<{kind:string,name:string,price:number,currency:string|null,category:string}>,
 *   itemCount: number, pricedCount: number, missingCount: number,
 *   currencies: string[], mixedCurrency: boolean
 * }}
 */
export function summarizeCosts(detail) {
  const trip = detail?.trip || {};
  const rows = new Map(CATEGORIES.map((c) => [c.key, { ...c, known: 0, count: 0, missingCount: 0 }]));
  const byCurrency = {};
  const missing = [];
  const priced = [];

  const add = ({ kind, id, name, price, currency, category, when, location }) => {
    const row = rows.get(category);
    const amount = toPrice(price);
    const cur = currency || trip.currency || null;
    if (amount === null) {
      row.missingCount++;
      missing.push({ kind, id, name, when: when || '', category, currency: cur, location: location || '' });
      return;
    }
    row.known = round2(row.known + amount);
    row.count++;
    if (cur) byCurrency[cur] = round2((byCurrency[cur] || 0) + amount);
    priced.push({ kind, id, name, price: amount, currency: cur, category, when: when || '' });
  };

  for (const a of detail?.activities || []) {
    add({
      kind: 'activity',
      id: a.id,
      name: activityName(a),
      price: a.price,
      currency: a.currency,
      category: categoryOf(a.activity_type),
      when: a.starts_at,
      location: a.address || '',
    });
  }
  for (const hst of detail?.hostings || []) {
    add({
      kind: 'hosting',
      id: hst.id,
      name: hst.name || '住宿',
      price: hst.price,
      currency: hst.currency,
      category: 'lodging',
      when: hst.starts_at,
      location: hst.address || '',
    });
  }
  for (const t of detail?.transportations || []) {
    add({
      kind: 'transport',
      id: t.id,
      name: transportName(t),
      price: t.price,
      currency: t.currency,
      category: 'transport',
      when: t.departure_at,
      location: t.departure_address || '',
    });
  }
  for (const e of detail?.expenses || []) {
    add({
      kind: 'expense',
      id: e.id,
      name: e.title || e.name || '费用',
      price: e.price,
      currency: e.currency,
      category: 'other',
      when: e.date ? String(e.date) : '',
      location: '',
    });
  }

  const currencies = Object.keys(byCurrency).sort();
  const knownTotal = round2(Object.values(byCurrency).reduce((a, b) => a + b, 0));
  const itemCount = priced.length + missing.length;
  const days = tripDays(trip);
  const people = tripPeople(trip);
  // Per-day and per-person only mean something with one currency; mixing CNY and
  // USD and dividing would produce a number that looks precise and is not.
  const single = currencies.length === 1;

  return {
    rows: CATEGORIES.map((c) => rows.get(c.key)).filter((r) => r.count || r.missingCount),
    knownTotal,
    byCurrency,
    missing,
    priced,
    itemCount,
    pricedCount: priced.length,
    missingCount: missing.length,
    currencies,
    // A single total across currencies would be a lie without a rate, so the
    // caller is expected to render per-currency when this is true.
    mixedCurrency: currencies.length > 1,
    currency: single ? currencies[0] : null,
    days,
    people,
    perDay: single && days ? round2(knownTotal / days) : null,
    perPerson: single && people > 1 ? round2(knownTotal / people) : null,
  };
}

const money = (n, cur) => `${round2(n)}${cur ? ' ' + cur : ''}`;
const day = (iso) => (iso ? String(iso).slice(0, 10) : '日期未定');

/**
 * The instruction handed to the agent.
 * @param {object} detail - trip detail as returned by `tripDetail`.
 * @param {object} [summary] - reuse an existing `summarizeCosts` result.
 */
export function costPrompt(detail, summary = summarizeCosts(detail)) {
  const trip = detail?.trip || {};
  const name = trip.name || '这个行程';
  const lines = [];

  lines.push(`请帮我估算「${name}」这趟行程的费用。`);
  const when = [trip.starts_at, trip.ends_at].filter(Boolean).join(' → ');
  lines.push(
    `行程 id ${trip.id ?? '(未知)'}${when ? '，日期 ' + when : ''}${trip.timezone ? '，时区 ' + trip.timezone : ''}。`,
  );
  lines.push('');

  if (summary.pricedCount) {
    lines.push(`【已知价格】以下 ${summary.pricedCount} 条是行程里真实存在的价格，请直接采用，不要重新估算：`);
    for (const p of summary.priced) {
      const label = CATEGORY_BY_KEY.get(p.category)?.label || p.category;
      lines.push(`- [${label}] ${p.name}｜${money(p.price, p.currency)}｜${day(p.when)}`);
    }
    lines.push('');
  }

  if (summary.missingCount) {
    lines.push(`【缺少价格】以下 ${summary.missingCount} 条没有填价格，需要你来估：`);
    for (const m of summary.missing) {
      const label = CATEGORY_BY_KEY.get(m.category)?.label || m.category;
      lines.push(
        `- [${label}] ${m.name}｜${day(m.when)}${m.location ? '｜' + m.location : ''}${
          m.currency ? '｜货币 ' + m.currency : ''
        }`,
      );
    }
    lines.push('');
  }

  if (!summary.itemCount) {
    lines.push('（这个行程目前还没有任何活动、住宿或交通条目。）');
    lines.push('');
  }

  lines.push('请做两件事：先把价格查出来，确认后写回行程。');
  lines.push('');
  lines.push('【第一步：调研价格】');
  lines.push(
    '对上面每一个【缺少价格】的条目去查真实价格，不要凭印象给数字。国内优先用大众点评 / 美团 / 抖音团购 / 小红书上该店或该景点的人均；国外用 Google Maps、Tripadvisor、Yelp 或官网票价：',
  );
  lines.push('- 餐厅、酒吧、小吃：查该店人均消费。');
  lines.push('- 景点、展览、演出：查官方门票价，注明是否含讲解或套票。');
  lines.push(
    '- 交通：查真实班次与票价。国内火车用 12306 的车次与票价，航班用航司官网 / 航旅纵横；国外用对应铁路或航司官网。',
  );
  lines.push('- 住宿：查同酒店同房型房价；无法确认就按同城同档次均价估。');
  lines.push(
    '- 如果大众点评 / 美团 / 12306 直接抓不到（这些站点反爬严格，抓不到很正常），改从携程 / Trip.com、航班铁路查询站、官方页面等渠道查，并注明实际来源是哪个。',
  );
  lines.push('');
  lines.push('每条都要给出：来源（平台名 + 查到的时间）、金额与币种。');
  lines.push(
    '查不到就明说「查不到」，并给一个区间和判断依据。不要为了填满表格而编造精确数字——宁可写「约 40-60 CNY（估）」，也不要写假的平台出处。',
  );
  lines.push('');
  lines.push('【第二步：写回行程】');
  lines.push(
    '先把调研结果用表格汇报给我（条目 / 价格 / 币种 / 来源 / 置信度），**等我确认后再写入**。确认后，用 tripsy_activities_update、tripsy_hostings_update、tripsy_transportations_update 逐条写入 price 与 currency，并把来源和「估算」字样写进 notes。',
  );
  lines.push('');
  lines.push('【最后给我一份汇总】');
  lines.push('1. 按类别列出：住宿 / 交通 / 餐饮 / 门票与景点 / 购物 / 其他。');
  lines.push(
    '2. 给出总计，并区分「已确认」与「估算」各是多少。',
  );
  if (summary.days) lines.push(`3. 按 ${summary.days} 天给出日均花费。`);
  if (summary.people > 1) lines.push(`4. 这个行程有 ${summary.people} 位同行者，给出人均花费。`);
  lines.push(
    '5. 多种货币时分币种列出；需要换算就写出汇率与来源，不要凭空假设汇率。',
  );
  lines.push('6. 列出你认为最不确定的 3 项，以及需要我补什么信息。');
  lines.push('');
  lines.push('');
  // A note rather than a prohibition: this flow is explicitly allowed to write
  // prices back, but only after the table has been confirmed.
  lines.push('除了第二步里写入价格，不要改动或删除行程里的任何条目。');

  return lines.join('\n');
}

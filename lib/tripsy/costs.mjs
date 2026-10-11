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

  lines.push('请按这个要求输出：');
  lines.push('1. 按类别汇总已知金额，类别用：住宿 / 交通 / 餐饮 / 门票与景点 / 购物 / 其他。');
  lines.push(
    '2. 逐条给【缺少价格】的条目估一个数值，并写明依据（城市物价水平、类型、档次）。信息不足就直说不确定，不要编造精确数字。',
  );
  lines.push('3. 给出总计：已知小计 + 估算小计 = 预计总额。');
  lines.push(
    '4. 如果涉及多种货币，**分币种列出**；确实需要换算时，明确写出你使用的汇率和来源。不要凭空假设汇率。',
  );
  lines.push('5. 按天给出大致花费分布，并指出花费最高的 2-3 天。');
  lines.push('6. 最后列出你认为最不确定的 3 项，以及我补哪些信息能让你算得更准。');
  lines.push('');
  lines.push('不要用工具去修改我的行程，这次只要一份估算结果。');

  return lines.join('\n');
}

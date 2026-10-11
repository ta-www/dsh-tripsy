// Cost summarising is arithmetic plus judgement about missing data; only the
// arithmetic is code, so only the arithmetic is asserted here -- together with
// the prompt's promises (real numbers carried through, no invented rates).
//
//   node test/costs.mjs
import assert from 'node:assert/strict';
import { categoryOf, costPrompt, summarizeCosts } from '../lib/tripsy/costs.mjs';

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (e) {
    failures.push({ name, error: e });
    console.log('  \u2717 ' + name + '\n      ' + (e.message || e));
  }
}

const DETAIL = {
  trip: { id: 7, name: '西安三日', starts_at: '2026-10-16', ends_at: '2026-10-18', timezone: 'Asia/Shanghai' },
  activities: [
    { id: 1, name: '肉夹馍', activity_type: 'restaurant', price: 40, currency: 'CNY', starts_at: '2026-10-16T04:00:00Z' },
    { id: 2, name: '兵马俑', activity_type: 'museum', price: 120, currency: 'CNY', starts_at: '2026-10-17T01:00:00Z' },
    { id: 3, name: '城墙', activity_type: 'park', starts_at: '2026-10-16T06:00:00Z' },
    { id: 4, name: '买手信', activity_type: 'shopping', price: 0, currency: 'CNY' },
    { id: 5, name: '夜游', activity_type: 'nightlife', price: 88, currency: 'CNY' },
  ],
  hostings: [{ id: 6, name: '青旅', price: 300, currency: 'CNY', starts_at: '2026-10-16T07:00:00Z' }],
  transportations: [
    {
      id: 8,
      transportation_type: 'train',
      departure_description: '郑州东',
      arrival_description: '西安北',
      price: 240,
      currency: 'CNY',
      departure_at: '2026-10-16T00:00:00Z',
    },
  ],
  expenses: [{ id: 9, title: '打车', price: 30, currency: 'CNY', date: '2026-10-16' }],
};

const S = summarizeCosts(DETAIL);

check('把活动类型映射到费用类别', () => {
  assert.equal(categoryOf('restaurant'), 'food');
  assert.equal(categoryOf('cafe'), 'food');
  assert.equal(categoryOf('museum'), 'tickets');
  assert.equal(categoryOf('shopping'), 'shopping');
  assert.equal(categoryOf('transit'), 'other');
  assert.equal(categoryOf(undefined), 'other');
});

check('按类别精确求和，不重不漏', () => {
  const byKey = Object.fromEntries(S.rows.map((r) => [r.key, r.known]));
  assert.equal(byKey.food, 128, '40 + 88');
  assert.equal(byKey.tickets, 120);
  assert.equal(byKey.lodging, 300);
  assert.equal(byKey.transport, 240);
  assert.equal(byKey.other, 30, 'expense rows land in other');
  assert.equal(S.knownTotal, 818);
  assert.deepEqual(S.byCurrency, { CNY: 818 });
  assert.equal(S.mixedCurrency, false);
});

check('价格为 0、缺失或非法都算「没有价格」', () => {
  // 0 is not a price the user typed; it means "unknown" in Tripsy's model.
  const missingNames = S.missing.map((m) => m.name);
  assert.ok(missingNames.includes('城墙'), 'no price at all');
  assert.ok(missingNames.includes('买手信'), 'explicit 0');
  assert.equal(S.missingCount, 2);
  // 5 activities + 1 lodging + 1 transport + 1 expense = 8, of which 2 unpriced.
  assert.equal(S.pricedCount, 6);
  assert.equal(S.itemCount, 8);
});

check('没有价格的条目不会进入任何金额', () => {
  const all = S.priced.reduce((n, p) => n + p.price, 0);
  assert.equal(Math.round(all * 100) / 100, S.knownTotal);
});

check('多币种分开累计，不会被合成一个假总额', () => {
  const mixed = summarizeCosts({
    trip: { id: 1, name: 'x' },
    activities: [
      { id: 1, name: 'a', activity_type: 'restaurant', price: 100, currency: 'CNY' },
      { id: 2, name: 'b', activity_type: 'restaurant', price: 30, currency: 'USD' },
    ],
  });
  assert.deepEqual(mixed.byCurrency, { CNY: 100, USD: 30 });
  assert.equal(mixed.mixedCurrency, true);
  assert.deepEqual(mixed.currencies, ['CNY', 'USD']);
});

check('交通用起讫点命名，便于 AI 判断', () => {
  assert.ok(S.priced.some((p) => p.name === '郑州东 → 西安北'));
});

check('提示词带上真实价格，并要求直接采用', () => {
  const prompt = costPrompt(DETAIL, S);
  assert.ok(prompt.includes('西安三日'));
  assert.ok(prompt.includes('住宿'), 'category labels present');
  assert.ok(prompt.includes('青旅'));
  assert.ok(prompt.includes('300 CNY'), 'the real number is carried through');
  assert.ok(prompt.includes('不要重新估算'));
  assert.ok(prompt.includes('已知价格'));
});

check('提示词列出缺价格的条目并点名估算依据', () => {
  const prompt = costPrompt(DETAIL, S);
  assert.ok(prompt.includes('缺少价格'));
  assert.ok(prompt.includes('城墙'));
  assert.ok(prompt.includes('依据'));
  assert.ok(prompt.includes('编造精确数字'));
});

check('提示词禁止凭空假设汇率', () => {
  const prompt = costPrompt(DETAIL, S);
  assert.ok(prompt.includes('分币种列出'));
  assert.ok(prompt.includes('汇率'));
  assert.ok(prompt.includes('不要凭空假设汇率'));
});

check('写入价格必须等确认，且不得改动其它条目', () => {
  const prompt = costPrompt(DETAIL, S);
  assert.ok(prompt.includes('等我确认后再写入'));
  assert.ok(prompt.includes('不要改动或删除'));
  assert.ok(prompt.includes('12306'), 'domestic rail is named as a source');
  assert.ok(prompt.includes('大众点评'), 'domestic dining is named as a source');
});

check('给出日均与人均；多币种时不给，避免假精确', () => {
  // 10-16 -> 10-18 inclusive is three days.
  assert.equal(S.days, 3);
  assert.equal(S.people, 1);
  assert.equal(S.perDay, Math.round((818 / 3) * 100) / 100);
  assert.equal(S.perPerson, null, 'a single traveller needs no per-person line');

  const two = summarizeCosts({
    trip: {
      id: 9,
      name: 'x',
      starts_at: '2026-10-16',
      ends_at: '2026-10-17',
      guests: [
        { id: 1, joined: true },
        { id: 2, joined: true },
      ],
    },
    activities: [{ id: 1, name: 'a', activity_type: 'restaurant', price: 200, currency: 'CNY' }],
  });
  assert.equal(two.days, 2);
  assert.equal(two.people, 2);
  assert.equal(two.perDay, 100);
  assert.equal(two.perPerson, 100);

  const mixed = summarizeCosts({
    trip: { id: 10, name: 'y', starts_at: '2026-10-16', ends_at: '2026-10-17' },
    activities: [
      { id: 1, name: 'a', activity_type: 'restaurant', price: 100, currency: 'CNY' },
      { id: 2, name: 'b', activity_type: 'restaurant', price: 30, currency: 'USD' },
    ],
  });
  assert.equal(mixed.perDay, null, 'mixed currencies must not yield a per-day figure');
  assert.equal(mixed.currency, null);
});

check('空行程也能生成一份可用的提示词', () => {
  const empty = summarizeCosts({ trip: { id: 2, name: '空行程' } });
  assert.equal(empty.itemCount, 0);
  assert.equal(empty.knownTotal, 0);
  const prompt = costPrompt({ trip: { id: 2, name: '空行程' } }, empty);
  assert.ok(prompt.includes('空行程'));
  assert.ok(prompt.includes('还没有任何活动'));
  assert.ok(!prompt.includes('undefined'));
});

check('缺少字段不会抛出，也不会写出 undefined', () => {
  const weird = summarizeCosts({ trip: {}, activities: [{ id: 1 }] });
  assert.equal(weird.missingCount, 1);
  assert.ok(costPrompt({ trip: {} }, weird).includes('未命名活动'));
  assert.ok(!costPrompt({ trip: {} }, weird).includes('undefined'));
});

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  for (const f of failures) console.error('\nFAIL: ' + f.name + '\n' + (f.error.stack || f.error));
  process.exit(1);
}
process.exit(0);

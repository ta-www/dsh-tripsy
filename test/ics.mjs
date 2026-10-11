// ICS generation is exactly the kind of code that looks right and imports
// wrong, so the format rules are asserted rather than eyeballed.
//
//   node test/ics.mjs
import assert from 'node:assert/strict';
import { buildIcs, icsEscape, icsFilename, icsFold, utcStamp } from '../lib/tripsy/ics.mjs';

let passed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (e) {
    failures.push({ name, error: e });
    console.log('  \u2717 ' + name + '\n      ' + (e.message || e));
  }
}

const DETAIL = {
  trip: {
    id: 1257623,
    name: 'New York City, 纽约; 周末',
    starts_at: '2026-10-11',
    ends_at: '2026-10-17',
    timezone: 'America/New_York',
    has_dates: true,
    description: '第一行\n第二行，带逗号和分号；还有很长的说明'.padEnd(200, '填'),
  },
  activities: [
    {
      id: 11,
      name: 'The Met, 大都会博物馆',
      activity_type: 'museum',
      starts_at: '2026-10-12T13:00:00Z',
      timezone: 'America/New_York',
      address: '1000 5th Ave, New York, NY',
      latitude: 40.7794,
      longitude: -73.9632,
      provider_reservation_code: 'ABC;123',
      price: 30,
      currency: 'USD',
    },
    {
      id: 12,
      name: '没有时间的条目',
      activity_type: 'note',
    },
  ],
  hostings: [
    {
      id: 21,
      name: 'Aman New York',
      starts_at: '2026-10-11T20:00:00Z',
      ends_at: '2026-10-17T15:00:00Z',
      timezone: 'America/New_York',
    },
  ],
  transportations: [
    {
      id: 31,
      transportation_type: 'airplane',
      departure_description: 'LAX',
      arrival_description: 'JFK',
      departure_at: '2026-10-11T12:57:00Z',
      arrival_at: '2026-10-11T18:16:00Z',
      departure_timezone: 'America/Los_Angeles',
      arrival_timezone: 'America/New_York',
      transport_number: 'DL934',
    },
  ],
};

const CAL = buildIcs(DETAIL, { now: new Date('2026-10-11T07:00:00Z') });
const LINES = CAL.body.split('\r\n');

await check('是一个完整的 VCALENDAR，且全部以 CRLF 结束', async () => {
  assert.equal(LINES[0], 'BEGIN:VCALENDAR');
  assert.ok(CAL.body.endsWith('\r\n'), 'body must end with CRLF');
  const withoutCr = CAL.body.replace(/\r\n/g, '');
  assert.ok(!/\n/.test(withoutCr), 'no bare LF may remain');
  assert.ok(CAL.body.includes('BEGIN:VTIMEZONE') === false, 'no VTIMEZONE is emitted (UTC only)');
  assert.equal(LINES.filter((l) => l === 'BEGIN:VEVENT').length, LINES.filter((l) => l === 'END:VEVENT').length);
});

await check('每个日历必须有 VERSION / PRODID / DTSTAMP', async () => {
  assert.ok(CAL.body.includes('VERSION:2.0'));
  assert.ok(CAL.body.includes('PRODID:'));
  assert.ok(CAL.body.includes('DTSTAMP:20261011T070000Z'));
  assert.ok(!CAL.body.includes('DTSTAMP:undefined'));
});

await check('没有一折行超过 75 字节，且中文没有被切碎', async () => {
  for (const line of LINES) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, 'line too long: ' + JSON.stringify(line.slice(0, 40)));
  }
  // Continuation lines start with a single space, and unfolding must yield the
  // original text -- a split inside a UTF-8 sequence would show as U+FFFD.
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(!unfolded.includes('\uFFFD'), 'unfolding must not produce replacement characters');
  assert.ok(unfolded.includes('博物馆'), 'a multi-byte name must survive folding');
});

await check('TEXT 值里的逗号、分号、换行与反斜杠都被转义', async () => {
  assert.equal(icsEscape('a,b;c\nd\\e'), 'a\\,b\\;c\\nd\\\\e');
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('SUMMARY:The Met\\, 大都会博物馆'));
  assert.ok(unfolded.includes('确认号 ABC\\;123'));
  // Only ASCII delimiters are escaped; full-width ，and ； are ordinary text and
  // must survive untouched, or the description would gain stray backslashes.
  assert.ok(unfolded.includes('第一行\\n第二行，带逗号和分号；还有'));
});

await check('行程本身是一条全天事件，且结束日是排他的', async () => {
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('DTSTART;VALUE=DATE:20261011'));
  // 10-17 inclusive must be written as 20261018, or the trip loses its last day.
  assert.ok(unfolded.includes('DTEND;VALUE=DATE:20261018'));
  assert.ok(unfolded.includes('UID:tripsy-trip-1257623@dsh-tripsy'));
});

await check('定时事件写成 UTC 绝对时刻', async () => {
  assert.ok(CAL.body.includes('DTSTART:20261012T130000Z'));
  assert.ok(CAL.body.includes('DTSTART:20261011T125700Z'));
  assert.ok(CAL.body.includes('DTEND:20261011T181600Z'), 'transport end uses arrival_at');
});

await check('没有结束时间的事件默认给一小时，不会变成零长度', async () => {
  const start = CAL.body.includes('DTSTART:20261012T130000Z');
  const end = CAL.body.includes('DTEND:20261012T140000Z');
  assert.ok(start && end, 'activity without ends_at should run 13:00-14:00Z');
});

await check('描述里带上当地时间，方便对照预订信息', async () => {
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('当地时间 2026-10-12 09:00'), 'America/New_York 13:00Z is 09:00 local');
});

await check('地点与经纬度写进事件', async () => {
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('LOCATION:1000 5th Ave\\, New York\\, NY'));
  assert.ok(unfolded.includes('GEO:40.7794;-73.9632'));
});

await check('没有开始时间的条目被跳过并计数', async () => {
  assert.equal(CAL.skipped, 1, 'the note without a start must be skipped');
  assert.equal(CAL.events, 4, 'trip + activity + hosting + transport');
  const unfolded = CAL.body.replace(/\r\n /g, '');
  assert.ok(!unfolded.includes('没有时间的条目'));
});

await check('没有日期的行程不会写出全天事件', async () => {
  const undated = buildIcs({ trip: { id: 1, name: 'Undated', has_dates: false }, activities: [] });
  assert.ok(!undated.body.includes('VALUE=DATE'));
  assert.equal(undated.events, 0);
});

await check('文件名去掉路径与非法字符', async () => {
  assert.equal(icsFilename('New York City, 纽约; 周末'), 'New York City, 纽约; 周末.ics');
  assert.equal(icsFilename(''), 'tripsy.ics');
  // Path separators and the characters Windows refuses must never survive.
  const cleaned = icsFilename('a/b\\c:d*e?f"g<h>i|j');
  for (const ch of ['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
    assert.ok(!cleaned.includes(ch), ch + ' must be stripped');
  }
  assert.equal(icsFilename('x'.repeat(200)).length, 64);
});

await check('utcStamp 对非法输入返回 null', async () => {
  assert.equal(utcStamp('nope'), null);
  assert.equal(utcStamp(''), null);
  assert.equal(utcStamp('2026-10-12T13:00:00.000Z'), '20261012T130000Z');
});

await check('折叠函数在字节边界工作', async () => {
  assert.equal(icsFold('short'), 'short');
  const long = 'DESCRIPTION:' + '你'.repeat(60);
  const folded = icsFold(long);
  for (const line of folded.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  }
  assert.equal(folded.replace(/\r\n /g, ''), long);
});

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  for (const f of failures) console.error('\nFAIL: ' + f.name + '\n' + (f.error.stack || f.error));
  process.exit(1);
}
process.exit(0);

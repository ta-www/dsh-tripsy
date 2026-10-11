// Trip -> iCalendar (RFC 5545).
//
// Times are written as absolute UTC instants rather than TZID-anchored wall
// times. Anchoring to a named zone is only correct when the file also carries a
// VTIMEZONE with that zone's real transitions; hand-writing those gets DST wrong
// and shifts events by an hour. UTC cannot be misread by any client, and flight
// durations stay truthful. The local wall time is spelled out in each event's
// description so the itinerary still reads the way the booking does.

/** Escape the characters RFC 5545 reserves in TEXT values. */
export function icsEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold one content line to 75 octets, continuing with a leading space.
 * Folding counts bytes, not characters, and must not split a UTF-8 sequence --
 * a city name like 東京都 or 大阪 is three bytes per glyph.
 */
export function icsFold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((start === 0 ? '' : ' ') + bytes.subarray(start, end).toString('utf8'));
    start = end;
    limit = 74; // the continuation's leading space costs one octet
  }
  return out.join('\r\n');
}

/** `2026-10-12T13:00:00.000Z` -> `20261012T130000Z` */
export function utcStamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** `2026-10-12` -> `20261012` */
function dateStamp(value) {
  const s = String(value ?? '').slice(0, 10).replace(/-/g, '');
  return /^\d{8}$/.test(s) ? s : null;
}

function addDay(value) {
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Wall-clock time in the item's own zone, for the description line. */
export function localLabel(iso, tz) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz || undefined,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return '';
  }
}

const uid = (suffix, id) => `tripsy-${suffix}-${id}@dsh-tripsy`;

const TIMED_KINDS = ['activity', 'hosting', 'transport'];

/** Collect the plain-data description lines an event should carry. */
function describe({ localLine, parts }) {
  const lines = [];
  if (localLine) lines.push(localLine);
  for (const p of parts) if (p) lines.push(p);
  return lines.join('\n');
}

/**
 * Build a calendar for one trip.
 * @param {object} detail - `{ trip, activities, hostings, transportations }`.
 * @param {object} [options]
 * @param {string} [options.prodid] - calendar product id.
 * @param {Date}   [options.now] - stamped into DTSTAMP (injectable for tests).
 * @returns {{ name: string, body: string, events: number, skipped: number }}
 */
export function buildIcs(detail, { prodid = '-//dsh-tripsy//Tripsy itinerary//ZH', now = new Date() } = {}) {
  const trip = detail?.trip || {};
  const tripTz = trip.timezone || '';
  const stamp = utcStamp(now.toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodid}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(trip.name || 'Tripsy')}`,
  ];

  let events = 0;
  let skipped = 0;

  const pushEvent = (rows) => {
    lines.push('BEGIN:VEVENT');
    for (const row of rows) if (row) lines.push(row);
    lines.push('END:VEVENT');
    events++;
  };

  // The trip itself: an all-day span so it shows as one block in the calendar.
  if (trip.has_dates !== false) {
    const start = dateStamp(trip.starts_at);
    const endExclusive = dateStamp(addDay(trip.ends_at)) || dateStamp(addDay(trip.starts_at));
    if (start) {
      pushEvent([
        `UID:${uid('trip', trip.id ?? 'unknown')}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        endExclusive ? `DTEND;VALUE=DATE:${endExclusive}` : null,
        `SUMMARY:${icsEscape(trip.name || 'Tripsy 行程')}`,
        `DESCRIPTION:${icsEscape(
          describe({
            localLine: '',
            parts: [
              trip.description || '',
              tripTz ? `时区：${tripTz}` : '',
              '由 dsh-tripsy 导出',
            ],
          }),
        )}`,
      ]);
    }
  }

  const addTimed = ({ suffix, id, summary, start, end, tz, location, geo, notes }) => {
    const dtStart = utcStamp(start);
    if (!dtStart) {
      skipped++;
      return;
    }
    const dtEnd = utcStamp(end) || null;
    const local = localLabel(start, tz);
    const localEnd = end ? localLabel(end, tz) : '';
    pushEvent([
      `UID:${uid(suffix, id)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      // No end means a point in time; give it an hour so it is visible.
      `DTEND:${dtEnd || utcStamp(new Date(new Date(start).getTime() + 3600e3).toISOString())}`,
      `SUMMARY:${icsEscape(summary)}`,
      location ? `LOCATION:${icsEscape(location)}` : null,
      geo ? `GEO:${geo}` : null,
      `DESCRIPTION:${icsEscape(
        describe({
          localLine:
            local && (localEnd && localEnd !== local ? `当地时间 ${local} → ${localEnd}` : `当地时间 ${local}`) +
              (tz ? `（${tz}）` : ''),
          parts: [notes, '由 dsh-tripsy 导出'],
        }),
      )}`,
    ]);
  };

  for (const a of detail?.activities || []) {
    addTimed({
      suffix: 'activity',
      id: a.id,
      summary: a.name || '活动',
      start: a.starts_at || a.ends_at,
      end: a.ends_at,
      tz: a.timezone || tripTz,
      location: a.address,
      geo: Number.isFinite(a.latitude) && Number.isFinite(a.longitude) ? `${a.latitude};${a.longitude}` : null,
      notes: [
        a.activity_type ? `类型：${a.activity_type}` : '',
        a.provider_reservation_code ? `确认号 ${a.provider_reservation_code}` : '',
        a.price ? `价格 ${a.price} ${a.currency || ''}`.trim() : '',
        a.website || '',
        a.notes || a.description || '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  for (const hst of detail?.hostings || []) {
    addTimed({
      suffix: 'hosting',
      id: hst.id,
      summary: `住宿：${hst.name || '未命名'}`,
      start: hst.starts_at,
      end: hst.ends_at,
      tz: hst.timezone || tripTz,
      location: hst.address,
      geo: Number.isFinite(hst.latitude) && Number.isFinite(hst.longitude) ? `${hst.latitude};${hst.longitude}` : null,
      notes: [
        hst.provider_reservation_code ? `确认号 ${hst.provider_reservation_code}` : '',
        hst.room_number ? `房间 ${hst.room_number}` : '',
        hst.price ? `价格 ${hst.price} ${hst.currency || ''}`.trim() : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  for (const t of detail?.transportations || []) {
    const from = t.departure_description || t.name || '出发';
    const to = t.arrival_description || '到达';
    addTimed({
      suffix: 'transport',
      id: t.id,
      summary: `${from} → ${to}`,
      start: t.departure_at,
      end: t.arrival_at,
      tz: t.departure_timezone || tripTz,
      location: [t.departure_address, t.departure_description].filter(Boolean).join(' ') || null,
      geo:
        Number.isFinite(t.departure_latitude) && Number.isFinite(t.departure_longitude)
          ? `${t.departure_latitude};${t.departure_longitude}`
          : null,
      notes: [
        t.transportation_type ? `方式：${t.transportation_type}` : '',
        t.company || '',
        t.transport_number ? `班次 ${t.transport_number}` : '',
        t.provider_reservation_code ? `确认号 ${t.provider_reservation_code}` : '',
        t.price ? `价格 ${t.price} ${t.currency || ''}`.trim() : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  lines.push('END:VCALENDAR');

  return {
    name: trip.name || 'Tripsy 行程',
    body: lines.map(icsFold).join('\r\n') + '\r\n',
    events,
    skipped,
  };
}

/** A filename that survives Content-Disposition on every browser. */
export function icsFilename(name) {
  const safe = String(name || 'tripsy')
    .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
    .trim()
    .slice(0, 60) || 'tripsy';
  return `${safe}.ics`;
}

export { TIMED_KINDS };

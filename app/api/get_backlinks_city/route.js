// GET /api/get_backlinks_city — every state with its cities, as JSON:
//
//   { success, count, states: [{ state, city_count, cities: [...] }] }
//
// Read from the site's own `states` / `cities` tables (the lists managed in
// the admin under States & Cities); a state or city switched off there is
// left out. Names are stored in capitals and shown in Title Case.

import { query } from '@/lib/db';

// Read at request time, so a failed read is never frozen into the build; the
// CDN keeps each answer for an hour (Cache-Control below).
export const dynamic = 'force-dynamic';

const titleCase = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .replace(/(^|[\s(/&-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());

const HEADERS = {
  // Other sites may read the list, so it is open to any origin.
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET() {
  const rows = await query(
    `SELECT s.\`state_name\` AS \`state\`, c.\`city_name\` AS \`city\`
       FROM \`states\` s
       LEFT JOIN \`cities\` c ON c.\`state_id\` = s.\`state_id\` AND c.\`status\` = 1
      WHERE s.\`status\` = 1
      ORDER BY s.\`state_name\`, c.\`city_name\``,
  );
  if (rows === null) {
    return Response.json(
      { success: false, count: 0, states: [], message: 'The city list is unavailable right now.' },
      { status: 503, headers: { ...HEADERS, 'Cache-Control': 'no-store' } },
    );
  }

  const byState = new Map();
  for (const r of rows) {
    const state = titleCase(r.state);
    if (!state) continue;
    if (!byState.has(state)) byState.set(state, new Set());
    if (r.city) byState.get(state).add(titleCase(r.city));
  }

  const states = [...byState.entries()].map(([state, cities]) => {
    const list = [...cities].sort((a, b) => a.localeCompare(b, 'en'));
    return { state, city_count: list.length, cities: list };
  });

  return Response.json({ success: true, count: states.length, states }, { headers: HEADERS });
}

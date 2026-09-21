// States and cities — the PHP site's own `states` (36) and `cities` (616)
// tables, which fill the state / city dropdowns of the enquiry and service
// forms. Edited here in place, so both sites keep reading the same lists.
//
// `cities.state_name` repeats the state's name next to its id (the forms look
// cities up by that name), so renaming a state renames it on its cities too.
// Latitude / longitude have no column in the PHP table; they live beside it
// in `df_city_geo`, created on first use.

import { query, queryOne, mutate } from '@/lib/db';

const GEO = 'df_city_geo';
const store = globalThis;
const clean = (v, max = 250) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function ensureGeo() {
  if (store.__dfCityGeo) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${GEO}\` (
        \`city_id\` INT NOT NULL PRIMARY KEY,
        \`lat\` DECIMAL(10,7) NULL,
        \`lng\` DECIMAL(10,7) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfCityGeo = true;
    return true;
  } catch (err) {
    console.error('[geo] table unavailable:', err.code || err.message);
    return false;
  }
}

/** A coordinate, or null when blank; an error message when out of range. */
function coord(value, max) {
  const s = String(value ?? '').trim();
  if (!s) return { value: null };
  const n = Number(s);
  if (!Number.isFinite(n) || Math.abs(n) > max) return { error: true };
  return { value: Math.round(n * 1e7) / 1e7 };
}

/* ------------------------------------------------------------------ states */

export async function listStates() {
  const rows = await query(
    `SELECT s.\`state_id\`, s.\`state_name\`, s.\`status\`,
            COUNT(c.\`city_id\`) AS \`cities\`, SUM(c.\`status\` = 1) AS \`active_cities\`
       FROM \`states\` s LEFT JOIN \`cities\` c ON c.\`state_id\` = s.\`state_id\`
      GROUP BY s.\`state_id\`, s.\`state_name\`, s.\`status\`
      ORDER BY s.\`state_name\``,
  );
  return (rows || []).map((r) => ({
    id: r.state_id, name: r.state_name, active: Number(r.status) === 1, cities: num(r.cities), activeCities: num(r.active_cities),
  }));
}

export async function saveState({ id, name, active = true }) {
  const title = clean(name).toUpperCase();
  if (!title) return { error: 'Enter the state name.' };
  const clash = await queryOne('SELECT `state_id` FROM `states` WHERE UPPER(`state_name`) = ? AND `state_id` <> ? LIMIT 1', [title, Number(id) || 0]);
  if (clash) return { error: `${title} is already in the list.` };

  if (id) {
    const before = await queryOne('SELECT `state_name` FROM `states` WHERE `state_id` = ? LIMIT 1', [id]);
    if (!before) return { error: 'That state no longer exists.' };
    await mutate('UPDATE `states` SET `state_name` = ?, `status` = ? WHERE `state_id` = ?', [title, active ? 1 : 0, id]);
    // The forms find a state's cities by its name, so the name moves with it.
    if (before.state_name !== title) {
      await mutate('UPDATE `cities` SET `state_name` = ? WHERE `state_id` = ?', [title, id]);
    }
    return { ok: true, id: Number(id) };
  }
  const result = await mutate('INSERT INTO `states` (`state_name`, `status`) VALUES (?, ?)', [title, active ? 1 : 0]);
  return { ok: true, id: result.insertId };
}

export async function deleteState(id) {
  const row = await queryOne('SELECT COUNT(*) AS `n` FROM `cities` WHERE `state_id` = ?', [id]);
  if (num(row?.n)) return { error: `It still has ${num(row.n)} cities — delete or move them first.` };
  await mutate('DELETE FROM `states` WHERE `state_id` = ?', [id]);
  return { ok: true };
}

/* ------------------------------------------------------------------ cities */

export async function listCities() {
  const geoReady = await ensureGeo();
  const rows = await query(
    `SELECT c.\`city_id\`, c.\`city_name\`, c.\`state_id\`, c.\`state_name\`, c.\`status\`
            ${geoReady ? ', g.`lat`, g.`lng`' : ''}
       FROM \`cities\` c
       ${geoReady ? `LEFT JOIN \`${GEO}\` g ON g.\`city_id\` = c.\`city_id\`` : ''}
      ORDER BY c.\`city_id\` DESC`,
  );
  return (rows || []).map((r) => ({
    id: r.city_id,
    name: r.city_name,
    stateId: r.state_id,
    state: r.state_name,
    active: Number(r.status) === 1,
    lat: r.lat === null || r.lat === undefined ? '' : String(Number(r.lat)),
    lng: r.lng === null || r.lng === undefined ? '' : String(Number(r.lng)),
  }));
}

export async function saveCity({
  id, name, stateId, active = true, lat, lng,
}) {
  const title = clean(name).toUpperCase();
  if (!title) return { error: 'Enter the city name.' };
  const state = await queryOne('SELECT `state_id`, `state_name` FROM `states` WHERE `state_id` = ? LIMIT 1', [Number(stateId) || 0]);
  if (!state) return { error: 'Choose the state.' };
  const la = coord(lat, 90);
  const lo = coord(lng, 180);
  if (la.error) return { error: 'Latitude must be a number between -90 and 90.' };
  if (lo.error) return { error: 'Longitude must be a number between -180 and 180.' };

  const clash = await queryOne(
    'SELECT `city_id` FROM `cities` WHERE `state_id` = ? AND UPPER(`city_name`) = ? AND `city_id` <> ? LIMIT 1',
    [state.state_id, title, Number(id) || 0],
  );
  if (clash) return { error: `${title} is already listed in ${state.state_name}.` };

  let cityId = Number(id) || 0;
  if (cityId) {
    const exists = await queryOne('SELECT `city_id` FROM `cities` WHERE `city_id` = ? LIMIT 1', [cityId]);
    if (!exists) return { error: 'That city no longer exists.' };
    await mutate(
      'UPDATE `cities` SET `city_name` = ?, `state_id` = ?, `state_name` = ?, `status` = ? WHERE `city_id` = ?',
      [title, state.state_id, state.state_name, active ? 1 : 0, cityId],
    );
  } else {
    const result = await mutate(
      'INSERT INTO `cities` (`state_id`, `state_name`, `city_name`, `status`) VALUES (?, ?, ?, ?)',
      [state.state_id, state.state_name, title, active ? 1 : 0],
    );
    cityId = result.insertId;
  }

  if (await ensureGeo()) {
    if (la.value === null && lo.value === null) {
      await mutate(`DELETE FROM \`${GEO}\` WHERE \`city_id\` = ?`, [cityId]);
    } else {
      await mutate(
        `INSERT INTO \`${GEO}\` (\`city_id\`, \`lat\`, \`lng\`) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE \`lat\` = VALUES(\`lat\`), \`lng\` = VALUES(\`lng\`)`,
        [cityId, la.value, lo.value],
      );
    }
  }
  return { ok: true, id: cityId };
}

export async function setCityActive(id, active) {
  await mutate('UPDATE `cities` SET `status` = ? WHERE `city_id` = ?', [active ? 1 : 0, id]);
  return { ok: true };
}

export async function deleteCity(id) {
  await mutate('DELETE FROM `cities` WHERE `city_id` = ?', [id]);
  if (await ensureGeo()) await mutate(`DELETE FROM \`${GEO}\` WHERE \`city_id\` = ?`, [id]);
  return { ok: true };
}

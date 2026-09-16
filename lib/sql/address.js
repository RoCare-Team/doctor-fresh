// Reading the addresses stored on orders and profiles.
//
// They arrive in two shapes — PHP orders use firstname / address1 / zip, orders
// placed here use name / house_no / c_pincode — and their street lines often
// repeat the city, state and pin code that are also stored separately. Both
// the shop and the admin read them through here, so an address looks the same
// wherever it is shown.

// Cities people write under both names; an address typed as "… Gurugram"
// under a city stored as "Gurgaon" is still the same line twice.
const CITY_ALIASES = [
  ['gurgaon', 'gurugram'], ['bangalore', 'bengaluru'], ['bombay', 'mumbai'],
  ['madras', 'chennai'], ['calcutta', 'kolkata'], ['allahabad', 'prayagraj'],
  ['pondicherry', 'puducherry'], ['baroda', 'vadodara'], ['mysore', 'mysuru'],
  ['cochin', 'kochi'], ['trivandrum', 'thiruvananthapuram'], ['poona', 'pune'],
  ['banaras', 'varanasi'], ['simla', 'shimla'], ['orissa', 'odisha'],
];

function withAliases(parts) {
  const out = [...parts];
  for (const part of parts) {
    const key = String(part || '').trim().toLowerCase();
    const pair = CITY_ALIASES.find((names) => names.includes(key));
    if (pair) out.push(...pair.filter((n) => n !== key));
  }
  return out;
}

/**
 * Takes the city, state and pin code off the end of a street line, one piece
 * at a time, so the address reads once. Only the end is trimmed: a road
 * genuinely named after its city keeps that name in the middle of the line.
 */
export function trimTail(value, list, keepIfEmpty = false) {
  const original = String(value || '').trim();
  let text = original;
  // Longest first, or the state "Delhi" would bite the end off the city
  // "New Delhi" and leave "Kalkaji, New" behind.
  const parts = withAliases(list)
    .filter(Boolean)
    .sort((a, b) => String(b).length - String(a).length);

  for (let pass = 0; pass < parts.length; pass += 1) {
    const before = text;
    for (const part of parts) {
      if (!part) continue;
      const escaped = String(part).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // the piece, with whatever comma / dash / "-" led into it
      text = text.replace(new RegExp(`[\\s,\\u2013\\u2014-]*${escaped}\\s*$`, 'i'), '').trim();
    }
    if (text === before) break;
  }

  // A house line that was nothing but the city is left as it was — better a
  // repeat than an address with no street at all. A second line that says only
  // "India" simply goes.
  const trimmed = text.replace(/[\s,–—-]+$/, '');
  return trimmed || (keepIfEmpty ? original : '');
}

export const tenDigits = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
};

/** One stored address, in the single shape the app works with. */
export function readAddress(raw) {
  const a = raw || {};
  const city = a.city || '';
  const state = a.state || '';
  const pincode = String(a.c_pincode || a.zip || '').replace(/\D/g, '').slice(0, 6);
  const tail = [pincode, state, city, 'India'];

  return {
    name: a.name || [a.firstname, a.lastname].filter(Boolean).join(' '),
    mobile: tenDigits(a.mobile || a.phone),
    email: a.email || '',
    house_no: trimTail(a.house_no || a.address1 || '', tail, true),
    area: trimTail(a.area || a.address2 || '', tail),
    near_by: a.near_by || '',
    city,
    state,
    c_pincode: pincode,
    address_type: a.address_type || '',
    message: a.message || '',
  };
}

/** The address as one line, for a table cell or a WhatsApp message. */
export function addressLine(a) {
  return [a.house_no, a.area, a.near_by && `near ${a.near_by}`, a.city, a.state, a.c_pincode]
    .filter(Boolean).join(', ');
}

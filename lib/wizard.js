// The "Submit your Request" wizard.
//
// This form does NOT write to the Doctor Fresh database. The current site runs
// it against waterpurifierservicecenter.in — every dropdown and the lead itself
// go there — so the same endpoints are used here rather than inventing a second
// place for these enquiries to land.
//
// The calls are made from the server so the browser never talks to that host
// directly, the answers can be cached, and a failure there can be turned into a
// message instead of a silent dead end.

const BASE = process.env.WIZARD_API_BASE || 'https://www.waterpurifierservicecenter.in';
const APP = `${BASE}/wizard/app`;

const TIMEOUT_MS = 12_000;
const CACHE_MS = 60 * 60 * 1000; // lead types and states barely change

const cache = new Map();

async function getJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);

  // The endpoints prefix their JSON with blank lines, so the body is parsed
  // rather than relying on the content type.
  const text = await res.text();
  return JSON.parse(text.trim());
}

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    // Better a stale list than an empty dropdown.
    if (hit) return hit.value;
    throw err;
  }
}

/** The categories the wizard offers — Water Purifier, Air Conditioner, and so on. */
export function getLeadTypes() {
  return cached('leadTypes', async () => {
    const data = await getJson(`${APP}/getLeadType.php`);
    return (data.AvailableCategory || []).map((c) => ({
      id: String(c.type_id),
      name: String(c.type),
    }));
  });
}

export function getStates() {
  return cached('states', async () => {
    const data = await getJson(`${APP}/getState.php`);
    return (data.AvailableState || []).map((s) => String(s.state)).filter(Boolean);
  });
}

/** Cities in one state. Keyed by state name, which is what the endpoint wants. */
export function getCities(state) {
  const name = String(state || '').trim();
  if (!name) return Promise.resolve([]);

  return cached(`cities:${name.toLowerCase()}`, async () => {
    const data = await getJson(`${APP}/getCity.php?state=${encodeURIComponent(name)}`);
    return (data.AvailableCities || []).map((c) => ({
      id: String(c.city_id),
      name: String(c.city_name),
    }));
  });
}

/**
 * Sends the enquiry, with exactly the query the current site sends.
 *
 * `check=nootp` is the path the live form takes for a new purchase — the lead
 * is created straight away rather than after an OTP.
 */
export async function submitLead(fields) {
  const query = new URLSearchParams({
    name: fields.name,
    mobile: fields.mobile,
    email: fields.email || '',
    pincode: fields.pincode || '',
    house_no: fields.houseNo || '',
    area: fields.area || '',
    near_by: fields.nearBy || '',
    lead_type: fields.leadType || '',
    state: fields.state || '',
    city: fields.city || '',
    complain_type: fields.complainType,
    sev_type_val: fields.serviceType || '',
    new_type_val: fields.purchaseType || '',
    new_purchase_type: fields.domesticOrCommercial || '',
    site_url: process.env.SITE_URL || 'https://www.doctorfresh.in/',
    check: 'nootp',
  });

  const data = await getJson(`${APP}/AddLead_new.php?${query}`);
  if (data && data.error) throw new Error(String(data.msg || 'The request was rejected.'));
  return data;
}

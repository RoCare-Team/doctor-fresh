// The RO Care service-booking backend.
//
// The service catalogue, coverage and bookings live on
// waterpurifierservicecenter.in — the same system the current
// /water-purifier-service page books through, and the same host the OTP
// service runs on. Nothing here is duplicated locally: prices, descriptions
// and time slots are read from it live.
//
//   getLeadType.php                              appliance categories
//   getAllServices.php?lead_type_category=1      services + prices
//   getBrand.php?lead_type_category=1            brands
//   getState.php · getCity.php?state=            coverage
//   getTimeSlots.php                             visit slots
//   AddLead_new.php?…                            the booking
//
// Every endpoint answers HTTP 200 whatever happens and puts the verdict in
// `error`, so the body is what is trusted.

const BASE = process.env.SERVICE_WIZARD_URL || 'https://waterpurifierservicecenter.in/wizard/app';

/** Water Purifier. The other appliance categories are not sold on this site. */
export const WATER_PURIFIER = process.env.SERVICE_LEAD_TYPE || '1';

/**
 * The wizard's own vocabulary, taken from the live form's radio values.
 * These go to AddLead_new unchanged, so the lead lands in the same bucket the
 * current site would put it in.
 */
export const SERVICE_GROUPS = [
  { id: '2', label: 'Repair / Service', match: /repair|service/i },
  { id: '1', label: 'Installation / Uninstallation', match: /installation/i },
  { id: '3', label: 'AMC Plans', match: /amc/i },
];

export const COMPLAIN_SERVICE = '2'; // 1 would be "New Purchase"
export const PREMISES = [
  { id: '1', label: 'Home' },
  { id: '2', label: 'Commercial' },
];

const TTL_MS = 10 * 60 * 1000;
const globalForWizard = globalThis;
globalForWizard.__dfWizard ??= new Map();
const cache = globalForWizard.__dfWizard;

async function call(path, { cacheKey } = {}) {
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  }

  let data;
  try {
    const response = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(20_000) });
    data = JSON.parse(await response.text());
  } catch (err) {
    console.error(`[wizard] ${path} failed:`, err.message);
    return null;
  }

  if (data?.error) return null;
  if (cacheKey) cache.set(cacheKey, { at: Date.now(), value: data });
  return data;
}

const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Bullet points, as the descriptions are stored as an unclosed `<ul><li>`. */
function bullets(html) {
  return String(html || '')
    .split(/<li>/i)
    .slice(1)
    .map((part) => strip(part))
    .filter(Boolean);
}

/** The bookable services, with prices, for water purifiers. */
export async function getServices() {
  const data = await call(`getAllServices.php?lead_type_category=${encodeURIComponent(WATER_PURIFIER)}`, {
    cacheKey: 'services',
  });
  if (!data?.service_details) return null;

  return data.service_details.map((s) => {
    const name = strip(s.service_name);
    const group = SERVICE_GROUPS.find((g) => g.match.test(name)) || SERVICE_GROUPS[0];

    return {
      id: String(s.id),
      name,
      group: group.id,
      price: Number(s.price) || 0,
      mrp: Number(s.price_without_discount) || 0,
      image: s.image || null,
      points: bullets(s.description),
    };
  });
}

// The service API returns states and cities in no particular order, and not
// the same order twice. A dropdown of 90 states is unusable unsorted, so both
// lists are ordered here rather than left to however the rows came back.
const byName = (a, b) => a.localeCompare(b, 'en');

export async function getStates() {
  const data = await call('getState.php', { cacheKey: 'states' });
  return (data?.AvailableState?.map((s) => s.state).filter(Boolean) || []).sort(byName);
}

export async function getCities(state) {
  if (!state) return [];
  const data = await call(`getCity.php?state=${encodeURIComponent(state)}`, { cacheKey: `city:${state}` });
  return (data?.AvailableCities?.map((c) => c.city_name).filter(Boolean) || []).sort(byName);
}

export async function getTimeSlots() {
  const data = await call('getTimeSlots.php', { cacheKey: 'slots' });
  return data?.alltimeslots?.map((s) => ({ id: String(s.id), time: s.time_slots, name: s.slot_name })) || [];
}

/**
 * Books the visit. The parameter names are the ones the live page sends, so
 * the lead arrives in the same shape the current site creates.
 */
export async function createBooking(fields) {
  const params = new URLSearchParams({
    name: fields.name,
    mobile: fields.mobile,
    email: fields.email || '',
    pincode: fields.pincode || '',
    house_no: fields.houseNo || '',
    area: fields.area || '',
    near_by: fields.nearBy || '',
    state: fields.state || '',
    city: fields.city || '',
    lead_type: WATER_PURIFIER,
    complain_type: COMPLAIN_SERVICE,
    sev_type_val: fields.serviceGroup || SERVICE_GROUPS[0].id,
    new_type_val: 'product',
    new_purchase_type: fields.premises || '1',
    site_url: fields.siteUrl || '',
    check: 'nootp',
  });

  let data;
  try {
    const response = await fetch(`${BASE}/AddLead_new.php?${params}`, { signal: AbortSignal.timeout(20_000) });
    data = JSON.parse(await response.text());
  } catch (err) {
    console.error('[wizard] booking failed:', err.message);
    return { ok: false, reason: 'Could not reach the booking service. Please call +91-9311587716.' };
  }

  if (data?.error) return { ok: false, reason: data.msg || 'The booking could not be created.' };
  return { ok: true, reference: data?.lead_id || data?.status || null };
}

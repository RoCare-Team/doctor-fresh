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

// Where the lead came from, as their panel reads it. Their own wizard sends
// the page it ran on; ours says Doctor Fresh so these never look like RO Care's
// own enquiries.
const SITE_URL = process.env.SITE_URL || 'https://www.doctorfresh.in/';
const SOURCE = process.env.WIZARD_LEAD_SOURCE || 'doctorfresh';

/*
 * Their own wizard sends `otp_chk` on every one of these calls — their routes
 * send 'rocare' — and it appears to be the tag their panel groups a lead under.
 * Ours says doctorfresh so the lead is theirs to find under this site's name;
 * WIZARD_LEAD_TAG changes it without a deploy if their panel expects something
 * else.
 */
const TAG = process.env.WIZARD_LEAD_TAG || 'doctorfresh';

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
 * A new purchase never went through an OTP on their own wizard, and neither
 * does lead type 3; everything else is a service request, where the number is
 * verified before the lead counts as real on their side.
 */
export function needsOtp(fields) {
  return !(String(fields.complainType) === '1' || String(fields.leadType) === '3');
}

/**
 * Sends the enquiry, with exactly the query their own wizard sends.
 *
 * With `otp` false the lead is filed as it stands; with `otp` true their
 * system also texts a six-digit code, which `verifyLeadOtp` then confirms —
 * that is the sequence their site follows for a service request.
 */
export async function submitLead(fields, { otp = false } = {}) {
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
    site_url: SITE_URL,
    source: SOURCE,
    otp_chk: TAG,
    check: 'nootp',
    // Their wizard sends these two on every call. Without them a lead can sit
    // in their panel waiting for an OTP that this form never asks for — we
    // have already taken the number on our own page.
    otpsend: otp ? '1' : '0',
    otp_verify: 'verifyed',
  });

  // Outside production, the exact call and the exact answer are printed:
  // when a lead does not turn up in their panel, the first question is always
  // what we actually sent and what they actually said back.
  if (process.env.NODE_ENV !== 'production' || process.env.WIZARD_DEBUG === '1') {
    console.info('[wizard] → AddLead_new.php?%s', query.toString());
  }

  const data = await getJson(`${APP}/AddLead_new.php?${query}`);

  if (process.env.NODE_ENV !== 'production' || process.env.WIZARD_DEBUG === '1') {
    console.info('[wizard] ← %s', JSON.stringify(data));
  }

  // status 2 is their "this number already has an open request in this
  // category" — the enquiry is on their desk either way, so it is not an
  // error to the person filling the form.
  if (data && data.error && Number(data.status) !== 2) {
    throw new Error(String(data.msg || 'The request was rejected.'));
  }
  return data;
}

/**
 * Confirms the code their system texted. Returns true only when they say so —
 * a wrong code must not pass as verified.
 */
export async function verifyLeadOtp({ mobile, otp }) {
  const query = new URLSearchParams({
    mobile: String(mobile),
    otp: String(otp),
    check: 'yesotp',
    otp_verify: 'verifyed',
  });

  if (process.env.NODE_ENV !== 'production' || process.env.WIZARD_DEBUG === '1') {
    console.info('[wizard] → AddLead_new.php?%s', query.toString());
  }

  const data = await getJson(`${APP}/AddLead_new.php?${query}`);

  if (process.env.NODE_ENV !== 'production' || process.env.WIZARD_DEBUG === '1') {
    console.info('[wizard] ← %s', JSON.stringify(data));
  }

  return Number(data?.status) === 1 && !data?.error;
}

// Addresses the customer has already given the service system.
//
// They arrive with the verified OTP — the service answers a correct code with
// the customer's name, email and every address they have booked to before —
// and new ones are written back to the same place, so an address typed on this
// site is there on the next booking whichever site takes it.
//
// Nothing about the shape of those rows is guaranteed: the service has been
// answering with `address`, `full_address`, `address_line` and a bare string at
// different times. Everything here is defensive, and a row that cannot be read
// is dropped rather than shown as a half-empty card.

const ADD_URL = process.env.ADDRESS_ADD_URL
  || 'https://waterpurifierservicecenter.in/customer/ro_customer/add_address.php';

const clean = (v) => String(v ?? '').trim();

/** The one line a saved address is shown as. */
function oneLine(row) {
  const parts = [
    row.houseNo || row.house_no || row.house,
    row.street || row.area || row.address_line,
    row.landmark || row.near_by,
    row.city,
    row.state,
  ].map(clean).filter(Boolean);

  const line = parts.join(', ');
  const pin = clean(row.pincode || row.pin_code || row.zip);
  return pin ? `${line}${line ? ' – ' : ''}${pin}` : line;
}

/**
 * One address from the service, in the shape this site uses. Returns null when
 * there is not enough of it to send a technician to.
 */
export function normaliseAddress(row, index = 0) {
  if (!row) return null;

  // Sometimes it is simply a string.
  if (typeof row === 'string') {
    const line = clean(row);
    return line ? { id: `a${index}`, label: 'Saved address', line } : null;
  }

  const id = clean(row.id || row.address_id || row.addr_id) || `a${index}`;
  const label = clean(row.name || row.customer_name || row.home_office) || 'Saved address';
  const line = clean(row.address || row.fullAddress || row.full_address || row.address_line) || oneLine(row);
  if (!line) return null;

  return {
    id,
    // The service's own id for this address. A booking is filed against it, so
    // an address without one has to be saved there before it can be used.
    remoteId: clean(row.id || row.address_id || row.addr_id),
    label,
    line,
    // Kept so a booking can be sent with its parts, not just the one line.
    houseNo: clean(row.houseNo || row.house_no),
    street: clean(row.street || row.area),
    landmark: clean(row.landmark || row.near_by),
    city: clean(row.city),
    state: clean(row.state),
    pincode: clean(row.pincode || row.pin_code),
    phone: clean(row.phone || row.alt_address_mob),
    type: clean(row.home_office) || 'home',
  };
}

/** Every readable address out of whatever the service sent. */
export function normaliseAddresses(input) {
  const list = Array.isArray(input) ? input : (input ? [input] : []);
  return list.map(normaliseAddress).filter(Boolean);
}

/**
 * Saves a new address with the service and returns the list it answers with.
 *
 * The service is the record: it is what the technicians' system reads, and
 * what the next sign-in will hand back.
 */
export async function saveAddress(fields) {
  const payload = {
    phoneNumber: fields.mobile,
    name: fields.name,
    phone: fields.phone || fields.mobile,
    alt_address_mob: fields.altPhone || fields.phone || fields.mobile,
    email: fields.email || '',
    houseNo: fields.houseNo,
    street: fields.street,
    landmark: fields.landmark || '',
    city: fields.city,
    state: fields.state,
    pincode: fields.pincode,
    home_office: fields.type === 'office' ? 'office' : 'home',
  };

  let text;
  try {
    const res = await fetch(ADD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    text = await res.text();
  } catch (err) {
    console.error('[address] could not reach the service:', err.message);
    return { ok: false, error: 'Could not save the address. Please try again.' };
  }

  let data;
  try {
    // The service prefixes its JSON with a blank line often enough to matter.
    data = JSON.parse(text.trim());
  } catch {
    console.error('[address] unreadable answer:', text.slice(0, 200));
    return { ok: false, error: 'Could not save the address. Please try again.' };
  }

  if (data?.error === true) {
    return { ok: false, error: clean(data.msg) || 'Could not save the address.' };
  }

  const saved = normaliseAddresses(data?.address);
  // Nothing came back but the save was accepted: the address is shown from
  // what was typed, so the booking can carry on.
  const fallback = normaliseAddress({ ...payload, id: data?.address_id });

  return {
    ok: true,
    addresses: saved.length ? saved : [fallback].filter(Boolean),
    newId: clean(data?.address_id) || null,
  };
}

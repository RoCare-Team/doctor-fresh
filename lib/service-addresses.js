'use client';

// The addresses this customer has on file, kept in the browser between pages.
//
// They come from the OTP service when the code is verified — it answers with
// every address the customer has had a technician to — and the booking page
// reads them from here rather than asking for them again. Nothing private is
// added by keeping them here: they are this visitor's own addresses, on this
// visitor's own device, and they are dropped when they sign out.

const KEY = 'df-service-addresses';

/** The saved list, or an empty one when there is nothing to read. */
export function readAddresses() {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((a) => a && a.line) : [];
  } catch {
    return [];
  }
}

export function writeAddresses(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.isArray(list) ? list.slice(0, 20) : []));
  } catch { /* a full or blocked store: they are simply asked for an address */ }
}

export function clearAddresses() {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

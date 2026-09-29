'use client';

// The booking someone left to go and pay for.
//
// The payment page belongs to the service's own gateway: it cannot be framed,
// and where it returns to after a cancellation is their setting, not ours — a
// customer who presses "cancel" lands on a page of theirs with no way back.
//
// So the booking is noted here before the browser leaves, and the next time it
// reaches any page of this site it is taken straight back to that booking,
// where it can be paid for or left to be paid after the visit.
//
// Kept for half an hour: after that it is a new visit, not an interrupted one.

const KEY = 'df-pending-booking';
const WINDOW_MS = 30 * 60 * 1000;

export function markPendingBooking(ref) {
  if (!ref) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ref, at: Date.now() }));
  } catch { /* a blocked store only costs the shortcut back */ }
}

/** The booking to go back to, or null. */
export function readPendingBooking() {
  try {
    const held = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    if (!held?.ref || Date.now() - Number(held.at || 0) > WINDOW_MS) return null;
    return held.ref;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

// The times a technician can be asked for on a given day.
//
// The service keeps the slots and which of them are still open, so they are
// asked for per date rather than listed here. When no per-date endpoint is
// configured the service's standing list is used, and if even that cannot be
// reached the four usual windows are offered — a booking must never be blocked
// by a slot list.

import { getTimeSlots } from '@/lib/services/wizard';

export const dynamic = 'force-dynamic';

const PER_DATE_URL = process.env.TIMESLOT_URL || process.env.NEXT_PUBLIC_API_GET_TIMESLOT || '';

const USUAL = ['9 am – 12 pm', '12 pm – 3 pm', '3 pm – 6 pm', '6 pm – 8 pm'];

/** The service answers with rows; a slot is whichever field holds the words. */
const slotOf = (row) => String(
  typeof row === 'string' ? row : (row?.time_slots || row?.time_slot || row?.time || row?.slot || ''),
).trim();

export async function GET(request) {
  const date = new URL(request.url).searchParams.get('date') || '';

  if (PER_DATE_URL && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    try {
      const res = await fetch(PER_DATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = JSON.parse((await res.text()).trim());
      const list = (data?.all_time_slots || data?.alltimeslots || [])
        .map(slotOf)
        .filter(Boolean);

      // An empty list is an answer, not a failure: that day is full.
      return Response.json({ ok: true, slots: list });
    } catch (err) {
      console.error('[timeslots] per-date lookup failed:', err.message);
    }
  }

  try {
    const standing = (await getTimeSlots()).map((s) => s.time).filter(Boolean);
    if (standing.length) return Response.json({ ok: true, slots: standing });
  } catch (err) {
    console.error('[timeslots] standing list failed:', err.message);
  }

  return Response.json({ ok: true, slots: USUAL });
}

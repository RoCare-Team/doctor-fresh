// GET /api/mobile/services — the bookable water purifier services with their
// prices, grouped as the service pages (/water-purifier-service, …) show them,
// plus the states a visit can be booked in.
//
//   { ok, groups: [{ id, label }], services: [{ id, name, group, price, mrp,
//     image, points }], states: [string] }
//
// Read-only.

import { getServices, getStates, SERVICE_GROUPS } from '@/lib/services/wizard';
import { fail, ok } from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [services, states] = await Promise.all([getServices(), getStates()]);
    if (!services) return fail('Services are unavailable right now.', 502);
    return ok({
      groups: SERVICE_GROUPS.map((g) => ({ id: g.id, label: g.label })),
      services,
      states,
    });
  } catch (err) {
    console.error('[mobile/services]', err?.message || err);
    return fail('Services are unavailable right now.', 502);
  }
}

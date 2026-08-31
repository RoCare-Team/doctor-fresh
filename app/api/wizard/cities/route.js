// Cities in a state, for the wizard's dependent dropdown.

import { getCities } from '@/lib/wizard';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const state = new URL(request.url).searchParams.get('state') || '';
  try {
    return Response.json({ ok: true, cities: await getCities(state) });
  } catch (err) {
    console.error('[wizard] could not load cities:', err.message);
    return Response.json({ ok: false, cities: [] }, { status: 502 });
  }
}

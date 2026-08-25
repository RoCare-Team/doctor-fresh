// Cities in a state, for the dependent dropdown on the booking form.

import { getCities } from '@/lib/sql/forms';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const state = new URL(request.url).searchParams.get('state') || '';
  return Response.json({ cities: await getCities(state) });
}

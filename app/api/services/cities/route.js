// Cities the service network covers in a state.

import { getCities } from '@/lib/services/wizard';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const state = new URL(request.url).searchParams.get('state') || '';
  return Response.json({ cities: await getCities(state) });
}

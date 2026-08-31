// Categories and states for the request wizard.

import { getLeadTypes, getStates } from '@/lib/wizard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [leadTypes, states] = await Promise.all([getLeadTypes(), getStates()]);
    return Response.json({ ok: true, leadTypes, states });
  } catch (err) {
    console.error('[wizard] could not load the options:', err.message);
    return Response.json({ ok: false, leadTypes: [], states: [] }, { status: 502 });
  }
}

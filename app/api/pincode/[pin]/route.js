// City, state and localities for an Indian pin code, so checkout can fill them
// in. Looked up from India Post's public directory; only the pin code is sent.
//
// A failed or slow lookup answers ok:false and the customer simply types the
// city and state — this is a convenience, never a gate on placing an order.

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { pin } = await params;
  if (!/^[1-9]\d{5}$/.test(String(pin))) {
    return Response.json({ ok: false, error: 'Enter a valid 6-digit pin code.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(6000),
      // Pin codes do not move; a day of caching spares the directory and the wait.
      next: { revalidate: 86400 },
    });
    const [data] = await res.json();
    const offices = data?.Status === 'Success' ? data.PostOffice || [] : [];

    if (!offices.length) {
      return Response.json({ ok: false, error: 'We could not find that pin code.' });
    }

    return Response.json(
      {
        ok: true,
        city: offices[0].District,
        state: offices[0].State,
        areas: [...new Set(offices.map((o) => o.Name))].slice(0, 30),
      },
      { headers: { 'Cache-Control': 'public, max-age=86400' } },
    );
  } catch {
    return Response.json({ ok: false, error: 'Could not look up the pin code right now.' });
  }
}

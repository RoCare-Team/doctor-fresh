// The pin code for a pair of coordinates, so "Use my location" at checkout can
// fill the address in. The browser sends only the coordinates it was given
// permission to share, and nothing is stored here.
//
// A failed lookup answers ok:false and the customer types the pin code — this
// is a convenience, never a gate on placing an order.

export const dynamic = 'force-dynamic';

// OpenStreetMap asks callers to identify themselves and to keep the rate low;
// the coordinates are rounded to about 100 m so repeat taps hit the cache.
const AGENT = 'DoctorFreshStore/1.0 (+https://www.doctorfresh.in)';
const round = (n) => Math.round(n * 1000) / 1000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ ok: false, error: 'Send a valid latitude and longitude.' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${round(lat)}&lon=${round(lon)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': AGENT, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const a = data?.address || {};

    const pincode = String(a.postcode || '').replace(/\D/g, '').slice(0, 6);
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      return Response.json({ ok: false, error: 'No pin code for that spot.' });
    }

    return Response.json(
      {
        ok: true,
        pincode,
        // A suggestion for the street line; the customer confirms it.
        area: [a.road, a.suburb || a.neighbourhood || a.village].filter(Boolean).join(', '),
        city: a.city || a.town || a.state_district || a.county || '',
        state: a.state || '',
      },
      { headers: { 'Cache-Control': 'private, max-age=600' } },
    );
  } catch {
    return Response.json({ ok: false, error: 'Could not find your location right now.' });
  }
}

import Link from '@/components/common/NavLink'; // no prefetch until hovered
import StoreSlider from './StoreSlider';

/**
 * "Nearby Store Locations" on a service page: the Doctor Fresh branches in the
 * page's city (or state) as a slider of cards, each with its address, hours,
 * directions and — when the admin added one — the embedded map.
 */
export default function NearbyStores({ stores = [], place = '', scope = 'city' }) {
  if (!stores.length) return null;
  const shown = stores.slice(0, 12);

  const intro = scope === 'all'
    ? 'Visit a Doctor Fresh branch for demos, spare parts and service support.'
    : `Find our nearby Doctor Fresh ${stores.length === 1 ? 'branch' : 'branches'}${place ? ` in ${place}` : ''}.`;

  return (
    <section
      className="relative mt-12 overflow-hidden rounded-3xl bg-linear-to-br from-primary-50 via-white to-primary-50/60 px-4 py-9 md:px-8 md:py-11"
      aria-labelledby="nearby-stores"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-100/60 blur-2xl" />
      <div className="relative text-center">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-primary-600">Visit us</p>
        <h2 id="nearby-stores" className="mt-1 text-[24px] font-bold tracking-tight text-ink-900 md:text-[32px]">
          {scope === 'all' ? 'Our Store Locations' : 'Nearby Store Locations'}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-500">{intro}</p>
      </div>

      <div className="relative mt-7">
        <StoreSlider stores={shown} />
      </div>

      {stores.length > shown.length || scope === 'all' ? (
        <p className="relative mt-5 text-center">
          <Link href="/store-locator" className="text-[14.5px] font-semibold text-primary-700 hover:text-primary-800">
            See all store locations →
          </Link>
        </p>
      ) : null}
    </section>
  );
}

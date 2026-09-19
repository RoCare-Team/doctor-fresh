import {
  MapPin, Clock, Navigation, Phone,
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { stores } from '@/data/site';
import { listLocations } from '@/lib/sql/locations';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Doctor Fresh - Store Locator',
  description: 'Find Doctor Fresh store locations across India with addresses and opening hours.',
  path: '/store-locator',
});

// Branches are edited in the admin (GMB Locations); a save refreshes this page
// at once, and it is rebuilt in the background every 10 minutes regardless.
export const revalidate = 600;

export default async function StoreLocatorPage() {
  // The admin list, or the built-in branches when the database is unreachable.
  const fromDb = await listLocations({ activeOnly: true }).catch(() => null);
  const locations = fromDb ?? stores.map((s) => ({
    city: s.city, branch: `Doctor Fresh ${s.city}`, address: s.address, time: s.hours, mapLink: '', mapEmbed: '', phone: '',
  }));

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Store Locator', href: '/store-locator' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
        <header className="mb-8">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">Store locations</h1>
          <p className="mt-2.5 max-w-2xl text-[15.5px] leading-relaxed text-ink-400">
            Visit a Doctor Fresh location for product demos, spare parts and service support.
          </p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((s, i) => (
            <li key={s.id || `${s.city}-${i}`} className="df-card flex flex-col overflow-hidden">
              {s.mapEmbed ? (
                <iframe
                  src={s.mapEmbed}
                  title={`Map of ${s.branch}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-44 w-full border-0"
                />
              ) : null}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-primary-700">{s.city}</p>
                <h2 className="mt-0.5 text-[16px] font-semibold text-ink-900">{s.branch}</h2>
                <p className="mt-2.5 flex gap-2 text-[14.5px] leading-relaxed text-ink-500">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
                  {s.address}
                </p>
                {s.time ? (
                  <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-400">
                    <Clock size={14} className="shrink-0 text-primary-700" aria-hidden="true" />
                    {s.time}
                  </p>
                ) : null}
                {s.phone ? (
                  <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="mt-2 flex items-center gap-2 text-[14px] text-ink-500 hover:text-primary-700">
                    <Phone size={14} className="shrink-0 text-primary-700" aria-hidden="true" />
                    {s.phone}
                  </a>
                ) : null}
                <a
                  href={s.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.branch}, ${s.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13.5px] font-medium text-primary-700 transition-colors hover:border-primary-500 hover:bg-primary-50"
                >
                  <Navigation size={14} aria-hidden="true" />
                  Get directions
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

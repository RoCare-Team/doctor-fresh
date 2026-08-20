import { MapPin, Clock } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { stores } from '@/data/site';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Doctor Fresh - Store Locator',
  description: 'Find Doctor Fresh store locations across India with addresses and opening hours.',
  path: '/store-locator',
});

export default function StoreLocatorPage() {
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
        {stores.map((s, i) => (
          <li key={`${s.city}-${i}`} className="df-card p-5">
            <h2 className="text-[16px] font-semibold text-ink-900">{s.city}</h2>
            <p className="mt-2.5 flex gap-2 text-[14.5px] leading-relaxed text-ink-500">
              <MapPin size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
              {s.address}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-400">
              <Clock size={14} className="shrink-0 text-primary-700" aria-hidden="true" />
              {s.hours}
            </p>
          </li>
        ))}
      </ul>
      </div>
    </>
  );
}

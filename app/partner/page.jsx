import { Handshake, TrendingUp, Headset, PackageCheck } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import PartnerForm from '@/components/forms/PartnerForm';
import { partnerPage, brand } from '@/data/site';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: partnerPage.metaTitle || 'Become A Partner - Doctor Fresh',
  description:
    partnerPage.metaDescription ||
    'Become a Doctor Fresh dealer, distributor or C&F / master partner. Apply online for a water purifier business opportunity in India.',
  path: '/partner',
});

const BENEFITS = [
  { icon: TrendingUp, title: 'Growing category', text: 'Water treatment demand across domestic, commercial and industrial segments.' },
  { icon: PackageCheck, title: 'Full product range', text: 'Purifiers, RO plants, softeners, ionizers, ATMs, STP/ETP and spare parts.' },
  { icon: Headset, title: 'Service backup', text: 'Trained technician network and genuine spare parts supply.' },
  { icon: Handshake, title: 'Territory support', text: 'Marketing material, pricing support and lead sharing in your area.' },
];

export default function PartnerPage() {
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Become A Partner', href: '/partner' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">{partnerPage.heading}</h1>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-400">
          Partner with Doctor Fresh as a dealer, distributor or C&amp;F / master franchise and build a
          water purification business in your territory.
        </p>
      </header>

      <ul className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <li key={b.title} className="df-card p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h2 className="text-[15.5px] font-medium text-ink-900">{b.title}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-400">{b.text}</p>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <section>
          <h2 className="mb-5 text-lg font-semibold text-ink-900">Partner application</h2>
          <PartnerForm tabs={partnerPage.tabs} fields={partnerPage.fields} />
        </section>

        <aside className="rounded-[14px] border border-line bg-surface-muted p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">Prefer to talk first?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
            Our channel team can walk you through investment, margins and territory availability.
          </p>
          <ul className="mt-4 space-y-2 text-[14.5px]">
            <li>
              <a href={`tel:${brand.phoneRaw}`} className="text-primary-700 hover:underline">{brand.phone}</a>
            </li>
            <li>
              <a href={`mailto:${brand.email}`} className="text-primary-700 hover:underline">{brand.email}</a>
            </li>
          </ul>
        </aside>
      </div>
      </div>
    </>
  );
}

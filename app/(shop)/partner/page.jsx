import { Handshake, TrendingUp, Headset, PackageCheck } from 'lucide-react';
import { getBrand } from '@/lib/catalog';
import Breadcrumb from '@/components/common/Breadcrumb';
import PartnerForm from '@/components/forms/PartnerForm';
import { partnerPage } from '@/data/site';
import { getContent } from '@/lib/sql/site-content';
import { metaFor } from '@/lib/utils';

// Text and search listing come from the admin (Site content).
export async function generateMetadata() {
  const c = await getContent('pages').catch(() => null);
  return metaFor({
    title: c?.partnerMetaTitle || partnerPage.metaTitle || 'Become A Partner - Doctor Fresh',
    description: c?.partnerMetaDescription || partnerPage.metaDescription,
    path: '/partner',
  });
}

const BENEFITS = [
  { icon: TrendingUp, title: 'Growing category', text: 'Water treatment demand across domestic, commercial and industrial segments.' },
  { icon: PackageCheck, title: 'Full product range', text: 'Purifiers, RO plants, softeners, ionizers, ATMs, STP/ETP and spare parts.' },
  { icon: Headset, title: 'Service backup', text: 'Trained technician network and genuine spare parts supply.' },
  { icon: Handshake, title: 'Territory support', text: 'Marketing material, pricing support and lead sharing in your area.' },
];

export default async function PartnerPage() {
  const [brand, c] = await Promise.all([getBrand(), getContent('pages').catch(() => ({}))]);
  // The built-in icons stay; the words come from the admin.
  const benefits = (c.partnerBenefits?.length ? c.partnerBenefits : BENEFITS)
    .map((b, i) => ({ ...b, icon: BENEFITS[i % BENEFITS.length].icon }));
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Become A Partner', href: '/partner' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">{c.partnerHeading || partnerPage.heading}</h1>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-400">
          {c.partnerIntro}
        </p>
      </header>

      <ul className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => {
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
          <PartnerForm tabs={c.partnerTabs?.length ? c.partnerTabs : partnerPage.tabs} fields={partnerPage.fields} />
        </section>

        <aside className="rounded-[14px] border border-line bg-surface-muted p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">{c.partnerAsideTitle}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
            {c.partnerAsideText}
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

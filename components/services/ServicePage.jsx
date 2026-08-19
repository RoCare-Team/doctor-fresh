import Link from 'next/link';
import { Phone, Mail, Globe, Star, CheckCircle2 } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ServicePackages from './ServicePackages';
import ServiceBookingForm from './ServiceBookingForm';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import Button from '@/components/common/Button';
import { fillDeep } from '@/lib/utils';

const CTA_ICON = { tel: Phone, mailto: Mail };

/**
 * Shared renderer for every service page and every location/service SEO page.
 * `template` is the extracted page content; `location` fills the {location}
 * token so one component serves 21,400 URLs without duplicating JSX.
 */
export default function ServicePage({ template, location, breadcrumb = [], nearby = [], nearbyTitle, nearbyPrefix }) {
  const page = fillDeep(template, location);

  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={breadcrumb} />

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div>
          <header>
            <h1 className="text-[25px] font-semibold leading-tight text-ink-900 md:text-[32px]">
              {page.heading}
            </h1>
            {page.ratingLabel ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-surface-muted px-3 py-1.5 text-[14px] text-ink-500">
                <Star size={14} className="text-warning" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                {page.ratingLabel}
              </p>
            ) : null}
            {page.metaDescription ? (
              <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-400">
                {page.metaDescription}
              </p>
            ) : null}
          </header>

          {page.promise?.length ? (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {page.promise.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink-500">
                  <CheckCircle2 size={15} className="shrink-0 text-success" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          ) : null}

          {page.packages?.length ? (
            <div className="mt-10">
              <ServicePackages packages={page.packages} />
            </div>
          ) : null}

          {page.whyChoose?.points?.length ? (
            <section className="mt-12 border-t border-line pt-10">
              <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">
                {page.whyChoose.title}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {page.whyChoose.points.map((p, i) => (
                  <li key={i} className="rounded-[10px] border border-line bg-white p-4">
                    {p.label ? <h3 className="text-[15px] font-medium text-ink-900">{p.label}</h3> : null}
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-500">{p.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {page.cta?.title ? (
            <section className="mt-10 rounded-[10px] border border-line bg-surface-muted px-6 py-7">
              <h2 className="text-lg font-semibold text-ink-900 md:text-xl">{page.cta.title}</h2>
              {page.cta.text ? <p className="mt-2 text-[14.5px] text-ink-500">{page.cta.text}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                {page.cta.links.map((l) => {
                  const scheme = l.href.split(':')[0];
                  const Icon = CTA_ICON[scheme] || Globe;
                  return (
                    <Button key={l.href} href={l.href} variant={scheme === 'tel' ? 'primary' : 'outline'}>
                      <Icon size={15} aria-hidden="true" />
                      {l.label}
                    </Button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="mt-12 space-y-10">
            <SeoContent sections={page.contentSections} />
            <FaqSection faqs={page.faqs} />
          </div>

          {nearby?.length ? (
            <section className="mt-12 border-t border-line pt-8">
              <h2 className="mb-4 text-[16px] font-semibold text-ink-900">{nearbyTitle}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {nearby.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/${nearbyPrefix}-${n.slug}`}
                    className="text-[13.5px] text-ink-400 transition-colors hover:text-primary-800"
                  >
                    {n.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-[178px] lg:self-start">
          <ServiceBookingForm location={location} serviceLabel={page.packages?.[0]?.groupTitle || 'Service'} />

          <div className="mt-4 rounded-[10px] border border-line bg-surface-muted p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Talk to us directly</h2>
            <ul className="mt-3 space-y-2.5 text-[14.5px]">
              <li>
                <a href="tel:9311587716" className="inline-flex items-center gap-2 text-ink-500 transition-colors hover:text-primary-800">
                  <Phone size={15} className="text-primary-700" aria-hidden="true" />
                  +91-9311587716
                </a>
              </li>
              <li>
                <a href="mailto:info@doctorfresh.in" className="inline-flex items-center gap-2 text-ink-500 transition-colors hover:text-primary-800">
                  <Mail size={15} className="text-primary-700" aria-hidden="true" />
                  info@doctorfresh.in
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

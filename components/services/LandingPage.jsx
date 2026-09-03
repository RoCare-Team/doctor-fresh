import Link from 'next/link';
import { Phone, Mail, MapPin, Star } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import SeoContent from '@/components/categories/SeoContent';
import FaqSection from '@/components/common/FaqSection';
import ProductRail from '@/components/products/ProductRail';
import ServiceBookingForm from './ServiceBookingForm';
import Reveal from '@/components/common/Reveal';

/**
 * Renders one row of `landing_pages` — a national service page or one of the
 * per-city SEO pages.
 *
 * Everything on the page comes from that row: the heading, the written copy,
 * the FAQs, the products to feature and the internal links. Nothing is filled
 * in from a template.
 */
export default function LandingPage({ page, products = [], nearby = [], breadcrumb = [], brand, formOptions }) {
  const place = page.locality || page.city;
  const showPlace = place && place.toLowerCase() !== 'india';

  return (
    <div className="df-container py-6 md:py-8">
      {breadcrumb.length ? <Breadcrumb items={breadcrumb} className="mb-5" /> : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Reveal>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink-900 md:text-[34px]">
              {page.heading}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} className="text-warning" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                4.5 rating from Doctor Fresh customers
              </span>
              {showPlace ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden="true" />
                  {place}
                  {page.state && page.state.toLowerCase() !== 'india' ? `, ${page.state}` : ''}
                </span>
              ) : null}
            </div>

            {page.metaDescription ? (
              <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-500">
                {page.metaDescription}
              </p>
            ) : null}
          </Reveal>

          {page.contentSections.length ? (
            <div className="mt-10">
              <SeoContent sections={page.contentSections} />
            </div>
          ) : (
            /* A few rows have copy that is not split into headings; it is still
               their own content, so it is rendered as written. */
            <div
              className="df-prose mt-10 max-w-none"
              dangerouslySetInnerHTML={{ __html: page.contentHtml }}
            />
          )}

          {page.faqs.length ? <FaqSection faqs={page.faqs} /> : null}

          {nearby.length ? (
            <Reveal className="mt-12">
              <h2 className="mb-4 text-[19px] font-semibold text-ink-900 md:text-[22px]">
                {page.serviceType || 'Service'} in nearby locations
              </h2>
              <ul className="flex flex-wrap gap-2">
                {nearby.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={n.href}
                      className="inline-block rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
                    >
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {page.relatedTopics.length ? (
            <Reveal className="mt-10">
              <h2 className="mb-4 text-[19px] font-semibold text-ink-900 md:text-[22px]">Related topics</h2>
              <ul className="flex flex-wrap gap-2">
                {page.relatedTopics.map((t) => (
                  <li key={`${t.name}-${t.href ?? ''}`}>
                    {t.href ? (
                      <Link
                        href={t.href}
                        className="inline-block rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      <span className="inline-block rounded-md border border-line bg-surface-muted px-3.5 py-2 text-[14px] text-ink-400">
                        {t.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-[138px] lg:self-start">
          <ServiceBookingForm
            location={showPlace ? place : 'India'}
            serviceLabel={page.serviceType || 'Service'}
            pageId={page.id}
            options={formOptions}
          />

          <div className="df-card mt-4 p-5">
            <h2 className="text-[16px] font-semibold text-ink-900">Talk to us</h2>
            <ul className="mt-3 space-y-3 text-[14.5px] text-ink-500">
              <li className="flex gap-2.5">
                <Phone size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
                <a href={`tel:${brand.phoneRaw}`} className="transition-colors hover:text-primary-800">
                  {brand.phone}
                </a>
              </li>
              <li className="flex gap-2.5">
                <Mail size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
                <a href={`mailto:${brand.email}`} className="transition-colors hover:text-primary-800">
                  {brand.email}
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {products.length ? (
        <div className="mt-4">
          <ProductRail
            title="Recommended by Doctor Fresh"
            products={products}
            href="/all-category"
          />
        </div>
      ) : null}
    </div>
  );
}

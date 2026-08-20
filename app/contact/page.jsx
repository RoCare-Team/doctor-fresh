import { Phone, Mail, MapPin, Globe, Clock, MessageCircle } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ContactForm from '@/components/forms/ContactForm';
import { brand, contactPage } from '@/data/site';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: contactPage.metaTitle || 'Contact Doctor Fresh',
  description:
    contactPage.metaDescription ||
    'Contact Doctor Fresh for water purifier sales, RO service, installation and AMC support across India.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Contact', href: '/contact' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">Contact us</h1>
        <p className="mt-2.5 max-w-2xl text-[15.5px] leading-relaxed text-ink-400">
          Sales, service, spare parts or partnership — reach the Doctor Fresh team directly.
          We respond to every enquiry within one working day.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <section>
          <h2 className="mb-5 text-lg font-semibold text-ink-900">{contactPage.formTitle}</h2>
          <ContactForm fields={contactPage.fields} />
        </section>

        <aside>
          <h2 className="mb-5 text-lg font-semibold text-ink-900">{contactPage.otherInfoTitle}</h2>

          <ul className="space-y-3">
            <li className="df-card p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                <Phone size={15} className="text-primary-700" aria-hidden="true" />
                Business phone
              </p>
              <a href={`tel:${brand.phoneRaw}`} className="mt-1 block text-[16px] text-primary-700 hover:underline">
                {brand.phone}
              </a>
            </li>

            <li className="df-card p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                <Mail size={15} className="text-primary-700" aria-hidden="true" />
                Email
              </p>
              <a href={`mailto:${brand.email}`} className="mt-1 block text-[16px] text-primary-700 hover:underline">
                {brand.email}
              </a>
            </li>

            <li className="df-card p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                <MessageCircle size={15} className="text-primary-700" aria-hidden="true" />
                WhatsApp
              </p>
              <a
                href={brand.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-[16px] text-primary-700 hover:underline"
              >
                {brand.phoneRaw}
              </a>
            </li>

            {brand.offices.map((o) => (
              <li key={o.label} className="df-card p-4">
                <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                  <MapPin size={15} className="text-primary-700" aria-hidden="true" />
                  {o.label}
                </p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{o.address}</p>
              </li>
            ))}

            <li className="df-card p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                <Globe size={15} className="text-primary-700" aria-hidden="true" />
                Website
              </p>
              <p className="mt-1 text-[14.5px] text-ink-500">{brand.website}</p>
            </li>

            <li className="df-card p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink-900">
                <Clock size={15} className="text-primary-700" aria-hidden="true" />
                Service response
              </p>
              <p className="mt-1 text-[14.5px] text-ink-500">Service within 24 hours across serviced cities</p>
            </li>
          </ul>
        </aside>
      </div>
      </div>
    </>
  );
}

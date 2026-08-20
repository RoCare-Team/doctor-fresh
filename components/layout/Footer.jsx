import Link from 'next/link';
import Image from 'next/image';
import {
  Phone, Mail, Globe, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, Mails,
} from 'lucide-react';
import {
  brand, footer, popularServices, popularRoServiceCities, popularWaterPurifierCities,
} from '@/data/site';
import { imageUrl } from '@/lib/utils';
import NewsletterForm from '@/components/forms/NewsletterForm';

const SOCIAL_ICON = {
  facebook: Facebook,
  twitter: Twitter,
  linkden: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

function LinkColumn({ title, links }) {
  if (!links?.length) return null;
  return (
    <div>
      <h3 className="mb-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-white">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={`${title}-${l.href}-${l.label}`}>
            <Link
              href={l.href}
              className="text-[14.5px] leading-relaxed text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const popularCities = [...popularRoServiceCities, ...popularWaterPurifierCities].slice(0, 14);

  return (
    <footer className="bg-ink-900 text-white">
      {/* -------------------------------------------------------- newsletter */}
      <div className="border-b border-white/10">
        <div className="df-container flex flex-col items-start justify-between gap-6 py-10 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white sm:flex">
              <Mails size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[19px] font-semibold text-white md:text-[22px]">Stay Updated</h2>
              <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-white/60">
                Offers, new launches and water care tips — straight to your inbox.
              </p>
            </div>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* ------------------------------------------------------ main columns */}
      <div className="df-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4 lg:pr-8">
          {/* The live footer still points at a legacy RoCare India asset; the
              Doctor Fresh logo belongs here. Its gold plate reads well on navy. */}
          <Image
            src={imageUrl(brand.logo)}
            alt="Doctor Fresh"
            width={200}
            height={52}
            className="h-11 w-auto rounded-md"
            unoptimized
          />
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-white/60">{brand.about}</p>

          <div className="mt-6 flex gap-2.5">
            {brand.social.map((s) => {
              const Icon = SOCIAL_ICON[s.key];
              if (!Icon) return null;
              return (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={s.key}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition-colors hover:border-primary-500 hover:bg-primary-500 hover:text-white"
                >
                  <Icon size={17} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Categories" links={footer.categories} />
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Useful Links" links={footer.usefulLinks} />
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Popular Services" links={popularServices} />

          <h3 className="mb-3 mt-8 text-[14px] font-semibold uppercase tracking-[0.1em] text-white">
            Popular Cities
          </h3>
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {popularCities.map((l) => (
              <li key={`city-${l.href}`}>
                <Link
                  href={l.href}
                  className="text-[13.5px] text-white/55 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-white">
            Contact Us
          </h3>
          <ul className="space-y-4 text-[14.5px] text-white/60">
            {brand.offices.map((o) => (
              <li key={o.label} className="flex gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
                <span className="leading-relaxed">
                  <strong className="block font-medium text-white/85">{o.label}</strong>
                  {o.address}
                </span>
              </li>
            ))}
            <li className="flex gap-2.5">
              <Phone size={15} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <a href={`tel:${brand.phoneRaw}`} className="transition-colors hover:text-white">
                {brand.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail size={15} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <a href={`mailto:${brand.email}`} className="transition-colors hover:text-white">
                {brand.email}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Globe size={15} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <span>{brand.website}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* -------------------------------------------------------- bottom bar */}
      <div className="border-t border-white/10">
        <div className="df-container flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13.5px] text-white/45">
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {footer.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13.5px] text-white/55 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

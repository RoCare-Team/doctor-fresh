import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import {
  Phone, Mail, Globe, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, Mails,
} from 'lucide-react';
import { getBrand, getFooterLinks } from '@/lib/catalog';
import { getContent } from '@/lib/sql/site-content';
import { imageUrl } from '@/lib/utils';
import NewsletterForm from '@/components/forms/NewsletterForm';

const SOCIAL_ICON = {
  facebook: Facebook,
  twitter: Twitter,
  linkden: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

// Pages the footer carries itself: they are not categories, services or cities.
const COMPANY = [
  { label: 'Blog', href: '/blogs' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Careers', href: '/careers' },
  { label: 'Store Locator', href: '/store-locator' },
  { label: 'Become a Partner', href: '/partner' },
];

function LinkColumn({ title, links }) {
  if (!links?.length) return null;
  return (
    <div>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-300">{title}</h3>
      {/* size and line height on the list itself, so each row is as short as its text */}
      <ul className="space-y-1.5 text-[12.5px] leading-5">
        {links.map((l) => (
          <li key={`${title}-${l.href}-${l.label}`}>
            <Link
              href={l.href}
              className="text-[12.5px] leading-snug text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Footer() {
  const [brand, footer, copy] = await Promise.all([
    getBrand(), getFooterLinks(), getContent('footer').catch(() => ({})),
  ]);
  const popularServices = footer.popularServices;
  const popularCities = [...footer.popularRoServiceCities, ...footer.popularWaterPurifierCities].slice(0, 8);

  return (
    <footer className="relative overflow-hidden bg-ink-900 text-white">
      {/* a faint glow so the dark block does not read as flat */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/4 h-72 w-[40rem] rounded-full bg-primary-500/10 blur-3xl" />

      {/* -------------------------------------------------------- newsletter */}
      <div className="relative border-b border-white/10">
        <div className="df-container flex flex-col items-start justify-between gap-3 py-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600/90 text-white ring-1 ring-white/10 sm:flex">
              <Mails size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-white">{copy.newsletterTitle || 'Stay Updated'}</h2>
              <p className="max-w-md text-[12.5px] leading-snug text-white/55">
                {copy.newsletterText}
              </p>
            </div>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* ------------------------------------------------------ main columns */}
      {/* two link columns side by side even on a phone, so the footer is not a long single file */}
      <div className="df-container relative grid grid-cols-2 gap-x-4 gap-y-6 py-6 lg:grid-cols-12 lg:gap-6">
        <div className="col-span-2 lg:col-span-3 lg:pr-4">
          {/* the logo artwork has a solid white background, so on navy it sits
              on a white plate rather than showing as a hard rectangle */}
          <span className="inline-flex rounded-lg bg-white px-2.5 py-1.5">
            <Image
              src={imageUrl(brand.logo)}
              alt="Doctor Fresh"
              width={878}
              height={188}
              className="h-6 w-auto"
            />
          </span>
          <p className="mt-3 line-clamp-2 max-w-sm text-[12.5px] leading-relaxed text-white/55">{brand.about}</p>

          <div className="mt-3 flex gap-1.5">
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
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-primary-500 hover:bg-primary-600 hover:text-white"
                >
                  <Icon size={14} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Categories" links={footer.categories} />
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Popular Services" links={popularServices} />
        </div>

        {/* Cities get their own column rather than sitting under the services,
            so both lists read at the same level. */}
        <div className="lg:col-span-2">
          <LinkColumn title="Popular Cities" links={popularCities} />
        </div>

        <div className="col-span-2 sm:col-span-1 lg:col-span-3">
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-300">
            Contact Us
          </h3>
          <ul className="space-y-2 text-[12.5px] leading-5 text-white/60">
            {brand.offices.map((o) => (
              <li key={o.label} className="flex gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
                <span className="leading-snug">
                  <strong className="font-medium text-white/85">{o.label}: </strong>
                  {o.address}
                </span>
              </li>
            ))}
            <li className="flex gap-2">
              <Phone size={14} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <a href={`tel:${brand.phoneRaw}`} className="transition-colors hover:text-white">
                {brand.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail size={14} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <a href={`mailto:${brand.email}`} className="transition-colors hover:text-white">
                {brand.email}
              </a>
            </li>
            <li className="flex gap-2">
              <Globe size={14} className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
              <span>{brand.website}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* -------------------------------------------------------- bottom bar */}
      <div className="relative border-t border-white/10 bg-black/15">
        <div className="df-container flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="shrink-0 whitespace-nowrap text-[12px] text-white/50">
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-5">
            {COMPANY.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[12px] font-medium text-white/75 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li aria-hidden="true" className="hidden h-4 w-px bg-white/20 sm:block" />
            {footer.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[12px] text-white/45 transition-colors hover:text-white">
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

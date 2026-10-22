import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import {
  Phone, Mail, Globe, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube,
  ArrowRight, ShieldCheck, Wrench, Truck,
} from 'lucide-react';
import { getBrand, getFooterLinks } from '@/lib/catalog';
import { imageUrl } from '@/lib/utils';

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

// What every order comes with, said once rather than on each product.
const PROMISES = [
  { icon: Truck, label: 'Free shipping across India' },
  { icon: Wrench, label: 'Free installation by our own technicians' },
  { icon: ShieldCheck, label: '1-year onsite warranty' },
];

function LinkColumn({ title, links }) {
  if (!links?.length) return null;
  return (
    <div>
      <ColumnTitle>{title}</ColumnTitle>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={`${title}-${l.href}-${l.label}`}>
            <Link
              href={l.href}
              className="text-[13.5px] leading-snug text-white/65 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every column is headed the same way: small caps over a short brand rule. */
function ColumnTitle({ children }) {
  return (
    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">
      {children}
      <span aria-hidden="true" className="mt-2 block h-px w-7 bg-primary-500/60" />
    </h3>
  );
}

/** One line of the contact column: an icon in its own disc, then the text. */
function ContactRow({ icon: Icon, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-primary-300 ring-1 ring-white/10">
        <Icon size={13} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 pt-1 text-[13.5px] leading-relaxed text-white/65">{children}</span>
    </li>
  );
}

export default async function Footer() {
  const [brand, footer] = await Promise.all([getBrand(), getFooterLinks()]);
  const popularServices = footer.popularServices;

  return (
    <footer className="relative overflow-hidden bg-ink-900 text-white">
      {/* two faint glows so the dark block reads as lit rather than flat */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/4 h-72 w-[40rem] rounded-full bg-primary-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 right-0 h-80 w-[32rem] rounded-full bg-primary-400/[0.07] blur-3xl" />

      {/* ------------------------------------------------------------ the ask */}
      {/* The footer opens with the one thing we want people to do, so it is
          not only a map of the site. */}
      <div className="relative border-b border-white/10">
        <div className="df-container flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <p className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[19px]">
              Not sure which purifier suits your water?
            </p>
            <p className="mt-1 text-[13.5px] text-white/55">
              Talk to a Doctor Fresh expert — free advice, honest recommendation.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <a
              href={`tel:${brand.phoneRaw}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14.5px] font-semibold text-ink-900 transition-colors hover:bg-primary-50"
            >
              <Phone size={15} aria-hidden="true" />
              {brand.phone}
            </a>
            <Link
              href="/contact"
              className="group inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 px-5 text-[14.5px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
            >
              Request a callback
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ main columns */}
      {/* Two link columns side by side even on a phone, so the footer is not
          one long single file. */}
      <div className="df-container relative grid grid-cols-2 gap-x-6 gap-y-9 py-10 lg:grid-cols-12 lg:gap-x-8 lg:py-12">
        <div className="col-span-2 lg:col-span-3 lg:pr-6">
          {/* the logo artwork has a solid white background, so on navy it sits
              on a white plate rather than showing as a hard rectangle */}
          <span className="inline-flex rounded-xl bg-white px-3 py-2">
            <Image
              src={imageUrl(brand.logo)}
              alt="Doctor Fresh"
              title="Doctor Fresh"
              width={878}
              height={188}
              className="h-7 w-auto"
            />
          </span>

          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-white/55">{brand.about}</p>

          <ul className="mt-5 space-y-2">
            {PROMISES.map((p) => (
              <li key={p.label} className="flex items-center gap-2.5 text-[13px] text-white/60">
                <p.icon size={14} className="shrink-0 text-primary-300" aria-hidden="true" />
                {p.label}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2">
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-all hover:-translate-y-0.5 hover:border-primary-500 hover:bg-primary-600 hover:text-white"
                >
                  <Icon size={15} aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="max-lg:row-span-2 lg:col-span-2">
          <LinkColumn title="Categories" links={footer.categories} />
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Popular Services" links={popularServices} />
        </div>

        <div className="lg:col-span-2">
          <LinkColumn title="Quick Links" links={COMPANY} />
        </div>

        <div className="col-span-2 lg:col-span-3">
          <ColumnTitle>Contact Us</ColumnTitle>
          <ul className="space-y-3.5">
            {brand.offices.map((o) => (
              <ContactRow key={o.label} icon={MapPin}>
                <strong className="block font-medium text-white/85">{o.label}</strong>
                {o.address}
              </ContactRow>
            ))}
            <ContactRow icon={Phone}>
              <a href={`tel:${brand.phoneRaw}`} className="transition-colors hover:text-white">
                {brand.phone}
              </a>
            </ContactRow>
            <ContactRow icon={Mail}>
              <a href={`mailto:${brand.email}`} className="break-all transition-colors hover:text-white">
                {brand.email}
              </a>
            </ContactRow>
            <ContactRow icon={Globe}>{brand.website}</ContactRow>
          </ul>
        </div>
      </div>

      {/* -------------------------------------------------------- bottom bar */}
      <div className="relative border-t border-white/10 bg-black/20">
        <div className="df-container flex flex-col gap-2.5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <p className="shrink-0 whitespace-nowrap text-[12.5px] text-white/50">
            © {new Date().getFullYear()} {footer.copyright || 'Doctor Fresh. All rights reserved.'}
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] leading-5 lg:justify-end">
            {footer.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/50 transition-colors hover:text-white">
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

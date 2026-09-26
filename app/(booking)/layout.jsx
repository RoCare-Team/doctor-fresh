import Link from 'next/link';
import Image from 'next/image';
import { Phone, ShieldCheck } from 'lucide-react';
import { getBrand } from '@/lib/catalog';
import { imageUrl } from '@/lib/utils';

/**
 * The booking pages carry no menu.
 *
 * A visitor part-way through booking a visit has one thing to do; a row of
 * categories above it is an invitation to leave. The logo goes home, the
 * number is there for anyone who would rather call, and that is all.
 */
export default async function BookingLayout({ children }) {
  const brand = await getBrand();

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="df-container flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label={brand.name} className="relative block h-8 w-[170px] shrink-0 lg:h-9 lg:w-[243px]">
            <Image
              src={imageUrl(brand.logo)}
              alt={brand.name}
              fill
              sizes="(min-width: 1024px) 243px, 170px"
              className="object-contain object-left"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 text-[13.5px] text-ink-400 sm:inline-flex">
              <ShieldCheck size={15} className="text-success" aria-hidden="true" />
              Secure booking
            </span>
            <a
              href={`tel:${brand.phone || '+919311587716'}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13.5px] text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-800"
            >
              <Phone size={14} aria-hidden="true" />
              {brand.phone || '+91-9311587716'}
            </a>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="border-t border-line bg-surface-muted">
        <div className="df-container flex flex-wrap items-center justify-between gap-3 py-5 text-[13px] text-ink-400">
          <span>{`© ${new Date().getFullYear()} ${brand.name}`}</span>
          <span className="flex flex-wrap gap-4">
            <Link href="/legal/terms-and-conditions" className="transition-colors hover:text-primary-800">Terms</Link>
            <Link href="/legal/privacy-and-policy" className="transition-colors hover:text-primary-800">Privacy</Link>
            <Link href="/contact" className="transition-colors hover:text-primary-800">Contact</Link>
          </span>
        </div>
      </footer>
    </>
  );
}

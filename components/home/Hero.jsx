import Image from 'next/image';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  ArrowRight, ArrowUpRight, Droplets, Hammer, PackageSearch, Wrench,
} from 'lucide-react';
import { imageUrl } from '@/lib/utils';

/**
 * The first screen: what we sell on the right, what we do on the left.
 *
 * It replaces a rotating banner. A carousel showed one message at a time and
 * moved it away before it was read; this shows the four things we sell and the
 * four jobs we are called out for at once, and every one of them is a link.
 * Nothing here moves, so nothing has to be waited for.
 *
 * The copy is still the admin's (Home page content); only the artwork is fixed,
 * and that comes from the catalogue itself — each card carries a real photo of
 * a product in that category, so it can never show something we do not sell.
 */

/** The jobs people ring up about, in the order they ring up about them. */
const SERVICES = [
  {
    icon: Wrench, label: 'RO Service\n& Repair', href: '/water-purifier-service', photo: 'water-purifier',
  },
  {
    icon: Hammer, label: 'New RO\nInstallation', href: '/water-purifier-installation', photo: 'ro-plant',
  },
  {
    icon: PackageSearch, label: 'Spare Parts\nReplacement', href: '/spare-parts', photo: 'spare-parts',
  },
  {
    icon: Droplets, label: 'Water Softener\nService', href: '/water-purifier-service', photo: 'water-softener',
  },
];

/**
 * The four cards on the right. Each tint is its own so the grid reads as four
 * things rather than one block of colour; they are pale enough that the
 * product photo on them is still the brightest thing in the card.
 */
const CARDS = [
  {
    key: 'water-purifier',
    title: 'Water\nPurifiers',
    note: 'Clean & Healthy\nDrinking Water',
    href: '/category/water-purifier',
    tint: 'bg-[#eaf4fd]',
  },
  {
    key: 'ro-plant',
    title: 'RO Plant\nSolutions',
    note: 'For Homes,\nOffices & Industry',
    href: '/category/ro-plant',
    tint: 'bg-[#e8f6ef]',
  },
  {
    key: 'water-softener',
    title: 'Water\nSofteners',
    note: 'Say Goodbye\nto Hard Water',
    href: '/category/water-softener',
    tint: 'bg-[#fdf3e6]',
  },
  {
    key: 'spare-parts',
    title: 'Genuine\nSpare Parts',
    note: 'Original Parts\nfor Longer Life',
    href: '/spare-parts',
    tint: 'bg-[#eeeefc]',
  },
];

/** Two lines of copy written as one string, so the shape is part of the copy. */
const lines = (text) => String(text).split('\n');

export default function Hero({ content = {}, cards = {}, serviceImages = {} }) {
  const c = {
    headingLine1: 'Pure Water for',
    headingLine2: 'Every Home & Office',
    intro: 'Water purifiers, RO plants, softeners, ionizers and water ATMs — complete sales, installation, service, AMC and genuine spare parts at your doorstep.',
    primaryLabel: 'Shop Water Purifiers',
    primaryHref: '/category/water-purifier',
    secondaryLabel: 'Explore All Services',
    secondaryHref: '/water-purifier-service',
    ...Object.fromEntries(Object.entries(content).filter(([, v]) => v)),
  };

  return (
    <section className="relative overflow-hidden bg-primary-600">
      <div className="df-container grid gap-5 pb-0 pt-5 sm:gap-8 sm:py-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:py-12">
        {/* ------------------------------------------------------------- copy */}
        <div>
          <h1
            style={{ '--df-delay': '150ms' }}
            className="df-rise text-[19px] font-bold leading-[1.2] tracking-tight text-white sm:text-[33px] sm:leading-[1.12] lg:text-[40px]"
          >
            {c.headingLine1}
            {c.headingLine2 ? <span className="text-accent-300 sm:block">{` ${c.headingLine2}`}</span> : null}
          </h1>

          <p
            style={{ '--df-delay': '240ms' }}
            // White at full strength, not faded: this blue leaves only 4.8:1
            // against white, so any transparency drops the paragraph below the
            // 4.5:1 a body of text has to meet.
            className="df-rise mt-3.5 hidden max-w-lg text-[14.5px] leading-relaxed text-white sm:block sm:text-[15.5px]"
          >
            {c.intro}
          </p>

          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70 sm:hidden">
            Our Services
          </p>

          {/* The four jobs, as links rather than as a sentence about them. */}
          <ul style={{ '--df-delay': '320ms' }} className="df-rise mt-3 grid grid-cols-4 gap-2 sm:mt-6 sm:gap-3">
            {SERVICES.map(({ icon: Icon, label, href, photo }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="group relative flex h-full flex-col items-center text-center transition-all duration-200 sm:items-stretch sm:rounded-xl sm:bg-white sm:p-3 sm:text-left sm:shadow-[0_6px_18px_-12px_rgb(3_30_40/0.6)] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_14px_28px_-14px_rgb(3_30_40/0.7)]"
                >
                  <span className="flex h-[76px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 text-primary-600 shadow-[0_6px_16px_-10px_rgb(3_30_40/0.8)] transition-colors duration-200 sm:h-9 sm:w-9 sm:rounded-lg sm:bg-primary-50 sm:p-0 sm:shadow-none sm:group-hover:bg-primary-600 sm:group-hover:text-white">
                    {serviceImages[photo] ? (
                      <Image
                        src={imageUrl(serviceImages[photo])}
                        alt=""
                        width={150}
                        height={150}
                        className="h-full w-full object-contain sm:hidden"
                      />
                    ) : (
                      <Icon size={24} aria-hidden="true" className="sm:hidden" />
                    )}
                    <Icon size={17} aria-hidden="true" className="hidden sm:block" />
                  </span>

                  <span className="mt-2 text-[11px] font-medium leading-tight text-white sm:mt-2.5 sm:text-[12.5px] sm:font-semibold sm:text-ink-900">
                    {lines(label).map((l) => <span key={l} className="block">{l}</span>)}
                  </span>

                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="absolute right-2.5 top-2.5 hidden text-ink-300 transition-colors duration-200 group-hover:text-primary-600 sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ '--df-delay': '380ms' }} className="df-rise mt-6 hidden flex-col gap-3 sm:flex sm:flex-row">
            <Link
              href={c.primaryHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14.5px] font-semibold text-primary-700 shadow-[0_10px_22px_-12px_rgb(3_30_40/0.8)] transition-all hover:bg-ink-900 hover:text-white active:scale-[0.97]"
            >
              {c.primaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href={c.secondaryHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/45 px-5 text-[14.5px] font-medium text-white transition-all hover:border-white hover:bg-white/10 active:scale-[0.97]"
            >
              {c.secondaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------- what we sell */}
        <ul className="-mx-4 grid grid-cols-2 gap-3 rounded-t-3xl bg-white px-4 pb-6 pt-5 sm:mx-0 sm:rounded-none sm:bg-transparent sm:p-0 sm:gap-4">
          {CARDS.map((card, i) => {
            const image = cards[card.key];
            return (
              <li key={card.key} style={{ '--df-delay': `${200 + i * 90}ms` }} className="df-rise">
                <Link
                  href={card.href}
                  className={`group relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgb(6_59_76/0.55)] sm:min-h-[214px] sm:p-5 lg:min-h-[236px] ${card.tint}`}
                >
                  {image ? (
                    <Image
                      src={imageUrl(image)}
                      alt=""
                      width={260}
                      height={260}
                      priority={i < 2}
                      // Catalogue photos are shot on a light backdrop, not on
                      // nothing: multiply sinks that backdrop into the card's
                      // tint, and the soft mask hides the edge of it where a
                      // photo's grey is a shade off the card's own colour.
                      className="pointer-events-none absolute right-0 top-1 h-[52%] w-[46%] select-none object-contain object-right-top mix-blend-multiply transition-transform duration-300 [mask-image:radial-gradient(75%_75%_at_58%_55%,#000_62%,transparent_100%)] group-hover:scale-105 sm:bottom-0 sm:top-auto sm:h-[86%] sm:w-[56%] sm:object-right-bottom"
                      aria-hidden="true"
                    />
                  ) : null}

                  <span className="relative">
                    {/* Only the title has to keep clear of the photo in the
                        corner; the line under it runs the full width, or it
                        would break into four words on a phone. */}
                    <span className="block max-w-[54%] text-[17px] font-bold leading-tight tracking-tight text-ink-900 sm:max-w-[62%] sm:text-[20px]">
                      {lines(card.title).map((l) => <span key={l} className="block">{l}</span>)}
                    </span>
                    <span className="mt-1.5 block max-w-[86%] text-[11.5px] leading-snug text-ink-500 sm:max-w-[62%] sm:text-[12.5px]">
                      {lines(card.note).map((l) => <span key={l} className="inline sm:block">{`${l} `}</span>)}
                    </span>
                  </span>

                  <span className="relative mt-3 inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-primary-600 px-3.5 text-[12.5px] font-semibold text-white shadow-[0_4px_12px_-6px_rgb(6_59_76/0.6)] transition-colors duration-200 group-hover:bg-ink-900 sm:text-[13px]">
                    Explore Now
                    <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

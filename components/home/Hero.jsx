import Image from 'next/image';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { imageUrl } from '@/lib/utils';

/**
 * The first screen: what we do on the left, what that looks like on the right.
 *
 * It replaces a rotating banner. A carousel showed one message at a time and
 * took it away before it was read; this says the whole business in a line and
 * opens eight doors under it, each one a thing someone might have come here
 * about, and each one a link.
 */


/**
 * The four photographs. The wider column carries the two with something
 * happening in them — the purifier on the wall, the technician at work — and
 * the narrower one the two close-ups.
 */
const SHOTS = [
  { src: '/images/banner15.png', href: '/category/water-purifier', label: 'Water purifiers' },
  { src: '/images/banner16.png', href: '/category/water-purifier', label: 'Clean drinking water' },
  { src: '/images/banner17.png', href: '/water-purifier-service', label: 'RO service and filter change' },
  { src: '/images/banner18.png', href: '/water-purifier-amc', label: 'Yearly service plans' },
];

export default function Hero({ tiles = [] }) {
  return (
    <section className="bg-white">
      <Link
        href="/category/water-purifier"
        aria-label="Water purifiers"
        className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-tint sm:aspect-[5/2] lg:hidden"
      >
        <Image
          src="/images/banner12.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </Link>

      <div className="df-container grid gap-6 py-6 lg:grid-cols-[minmax(0,46%)_1fr] lg:items-stretch lg:gap-10 lg:py-8">
        {/* ------------------------------------------------------ what we do */}
        <div>
          <p className="hidden items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-600 lg:flex">
            Our Services
            <span aria-hidden="true" className="h-px w-10 bg-primary-300" />
          </p>

          <h1 className="sr-only lg:not-sr-only lg:mt-2.5 lg:text-[36px] lg:font-bold lg:leading-[1.12] lg:tracking-tight lg:text-ink-900">
            Complete RO &amp; Water Solutions
          </h1>

          <p className="hidden text-[15px] text-ink-400 lg:mt-2 lg:block">
            Installation, Repair, Filter Change, AMC &amp; Genuine Parts
          </p>

          <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-5 lg:mt-5">
            <ul className="grid grid-cols-3 gap-3 sm:gap-4">
              {tiles.map((tile) => (
                <li key={tile.label}>
                  <Link href={tile.href} className="group block text-center">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-[#f5f8fb] transition-colors duration-200 group-hover:bg-primary-50">
                      {tile.image ? (
                        <Image
                          src={imageUrl(tile.image)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 140px, 30vw"
                          className="object-contain p-3 mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : null}
                    </span>

                    <span className="mt-2 block text-[11.5px] font-semibold leading-tight text-ink-900 sm:text-[12.5px]">
                      {tile.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------- what that looks like */}
        <div className="hidden grid-cols-[1.45fr_1fr] gap-3 sm:gap-4 lg:grid lg:h-full lg:grid-rows-2">
          {SHOTS.map(({ src, href, label }, i) => (
            <Link
              key={src}
              href={href}
              aria-label={label}
              className="group relative block h-full min-h-[128px] overflow-hidden rounded-2xl bg-surface-tint sm:min-h-[170px]"
            >
              <Image
                src={src}
                alt=""
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 32vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

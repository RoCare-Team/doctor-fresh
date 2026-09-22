'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  ArrowRight, Droplet, Wrench, Clock, MapPin,
} from 'lucide-react';
import { cx } from '@/lib/utils';

// Campaign artwork from /public/images. Each banner keeps its left third clear,
// which is where the copy sits on a wide screen.
const DEFAULT_BANNERS = [
  // '/images/banner1.png',
  '/images/banner5.png',
  '/images/banner4.png',
];

// What the copy promises, as quick reads for a phone.
const HIGHLIGHTS = [
  { icon: Wrench, label: 'Free installation' },
  { icon: Clock, label: 'Same-day RO service' },
  { icon: MapPin, label: 'Service across India' },
];

const INTERVAL = 5000;

/**
 * `content` comes from the admin (Home page); anything missing falls back to
 * the built-in copy and artwork.
 */
export default function Hero({ content = {} }) {
  const BANNERS = content.banners?.length ? content.banners : DEFAULT_BANNERS;
  const c = {
    eyebrow: 'Purity · Hygiene · Sanitation',
    headingLine1: 'Pure water for every',
    headingLine2: 'home, office & industry',
    intro: 'Water purifiers, RO plants, softeners, ionizers and water ATMs — backed by a nationwide service network, free installation and same-day RO service.',
    primaryLabel: 'Shop water purifiers',
    primaryHref: '/category/water-purifier',
    secondaryLabel: 'Book free water test',
    secondaryHref: '#water-test',
    ...Object.fromEntries(Object.entries(content).filter(([, v]) => v)),
  };
  const [index, setIndex] = useState(0);
  const count = BANNERS.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(id);
  }, [count]);

  const dots = (tone) => (count > 1 ? BANNERS.map((src, i) => (
    <button
      key={`dot-${src}`}
      type="button"
      onClick={() => setIndex(i)}
      aria-label={`Show banner ${i + 1}`}
      aria-current={i === index}
      className={cx(
        'h-1.5 rounded-full transition-all duration-300',
        i === index
          ? cx('w-8', tone === 'light' ? 'bg-white' : 'bg-primary-500')
          : cx('w-2.5', tone === 'light' ? 'bg-white/55 hover:bg-white/80' : 'bg-ink-900/25 hover:bg-ink-900/45'),
      )}
    />
  )) : null);

  return (
    <section className="relative isolate overflow-hidden bg-linear-to-b from-primary-50 to-white lg:bg-surface-muted lg:bg-none">
      {/* ------------------------------------------------ auto-rotating banners */}
      {/* One set of images for every screen. On a wide screen they fill the
          section and the copy sits in their clear left third. On a phone that
          clear third is cropped away, so there the artwork becomes a rounded
          card of its own above the copy, framed on the products. */}
      <div
        className={cx(
          'relative mx-4 mt-4 h-52 overflow-hidden rounded-2xl shadow-[0_18px_40px_-22px_rgb(6_59_76_/_0.45)] ring-1 ring-primary-100',
          'sm:mx-6 sm:h-72 md:h-80',
          'lg:absolute lg:inset-0 lg:m-0 lg:h-auto lg:rounded-none lg:shadow-none lg:ring-0',
        )}
      >
        {BANNERS.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            aria-hidden="true"
            className={cx(
              'pointer-events-none select-none object-cover object-[80%_center] transition-opacity duration-1000 ease-out lg:object-right',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}

        {/* Phone only: a fade for the dots to sit on, and the brand line. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-ink-900/45 to-transparent lg:hidden" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-primary-700 shadow-sm backdrop-blur lg:hidden">
          <Droplet size={10} className="fill-primary-500 text-primary-500" aria-hidden="true" />
          {c.eyebrow}
        </span>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">{dots('light')}</div>
      </div>

      <div className="df-container relative pb-8 pt-6 sm:pb-10 lg:flex lg:min-h-[580px] lg:items-center lg:py-16">
        <div className="max-w-xl lg:max-w-lg">
          <span
            style={{ '--df-delay': '60ms' }}
            className="df-rise hidden items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary-700 lg:inline-flex"
          >
            <Droplet size={12} className="fill-primary-500 text-primary-500" aria-hidden="true" />
            {c.eyebrow}
          </span>

          <h1
            style={{ '--df-delay': '150ms' }}
            className="df-rise text-[27px] font-bold leading-[1.15] tracking-tight text-ink-900 sm:text-[36px] lg:mt-4 lg:text-[48px] lg:font-semibold lg:leading-[1.1]"
          >
            {c.headingLine1}
            {c.headingLine2 ? <span className="block text-primary-500 lg:inline">{` ${c.headingLine2}`}</span> : null}
          </h1>

          <p
            style={{ '--df-delay': '240ms' }}
            className="df-rise mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-500 sm:mt-4 sm:text-[16px]"
          >
            {c.intro}
          </p>

          <div
            style={{ '--df-delay': '330ms' }}
            className="df-rise mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 lg:mt-7"
          >
            <Link
              href={c.primaryHref}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 text-[14.5px] font-semibold text-white shadow-[0_10px_22px_-12px_rgb(21_151_197_/_0.9)] transition-all hover:bg-ink-900 active:scale-[0.97] sm:px-6 sm:text-[15px]"
            >
              {c.primaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href={c.secondaryHref}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-ink-900 bg-white px-4 text-[14.5px] font-medium text-ink-900 transition-all hover:bg-white active:scale-[0.97] sm:px-6 sm:text-[15px]"
            >
              {c.secondaryLabel}
            </Link>
          </div>

          {/* Phone and tablet: the promises from the copy, at a glance. */}
          <ul style={{ '--df-delay': '400ms' }} className="df-rise mt-5 grid grid-cols-3 gap-2 lg:hidden">
            {HIGHLIGHTS.map(({ icon: Icon, label: builtIn }, i) => ({ Icon, label: content.highlights?.[i] || builtIn })).map(({ Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-primary-100 bg-white px-1.5 py-2.5 text-center"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="text-[11.5px] font-medium leading-tight text-ink-700">{label}</span>
              </li>
            ))}
          </ul>

          <div style={{ '--df-delay': '420ms' }} className="df-rise mt-9 hidden gap-2 lg:flex">
            {dots('dark')}
          </div>
        </div>
      </div>
    </section>
  );
}

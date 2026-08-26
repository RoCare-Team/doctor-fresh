'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Droplet } from 'lucide-react';
import { cx } from '@/lib/utils';

// Campaign artwork from /public/images. Each banner keeps its left third clear,
// which is where the copy sits.
const BANNERS = [
  // '/images/banner1.png',
  '/images/banner5.png',
  '/images/banner4.png',
];

const INTERVAL = 5000;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const count = BANNERS.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(id);
  }, [count]);

  return (
    <section className="relative isolate overflow-hidden bg-surface-muted">
      {/* ------------------------------------------------ auto-rotating banners */}
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
            'pointer-events-none select-none object-cover object-right transition-opacity duration-1000 ease-out',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      <div className="df-container relative flex min-h-[440px] items-center py-12 md:min-h-[520px] md:py-16 lg:min-h-[580px]">
        <div className="max-w-xl lg:max-w-lg">
          <span
            style={{ '--df-delay': '60ms' }}
            className="df-rise inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary-700"
          >
            <Droplet size={12} className="fill-primary-500 text-primary-500" aria-hidden="true" />
            Purity · Hygiene · Sanitation
          </span>

          <h1
            style={{ '--df-delay': '150ms' }}
            className="df-rise mt-4 text-[32px] font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-[40px] lg:text-[48px]"
          >
            Pure water for every
            <span className="text-primary-500"> home, office &amp; industry</span>
          </h1>

          <p
            style={{ '--df-delay': '240ms' }}
            className="df-rise mt-4 max-w-lg text-[16px] leading-relaxed text-ink-500"
          >
            Water purifiers, RO plants, softeners, ionizers and water ATMs — backed by a
            nationwide service network, free installation and same-day RO service.
          </p>

          <div style={{ '--df-delay': '330ms' }} className="df-rise mt-7 flex flex-wrap gap-3">
            <Link
              href="/category/water-purifier"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white transition-all hover:bg-ink-900 active:scale-[0.97]"
            >
              Shop water purifiers
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="#water-test"
              className="inline-flex h-12 items-center rounded-xl border border-ink-900 bg-white px-6 text-[15px] font-medium text-ink-900 transition-all hover:bg-white active:scale-[0.97]"
            >
              Book free water test
            </Link>
          </div>

          {count > 1 ? (
            <div style={{ '--df-delay': '420ms' }} className="df-rise mt-9 flex gap-2">
              {BANNERS.map((src, i) => (
                <button
                  key={`dot-${src}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show banner ${i + 1}`}
                  aria-current={i === index}
                  className={cx(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === index ? 'w-8 bg-primary-500' : 'w-2.5 bg-ink-900/25 hover:bg-ink-900/45',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

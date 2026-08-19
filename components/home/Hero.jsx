'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, Droplet } from 'lucide-react';
import { imageUrl, cx } from '@/lib/utils';

export default function Hero({ slides = [] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [count]);

  return (
    <section className="relative overflow-hidden bg-ink-900">
      {/* Full-bleed brand band: solid dark navy with two soft gold glows and a
          faint dot texture. Purely decorative, no extra markup in the flow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-44 h-[520px] w-[520px] rounded-full bg-primary-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-56 right-[-8rem] h-[480px] w-[480px] rounded-full bg-primary-400/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(var(--color-primary-300)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top_left,black_0%,transparent_70%)]"
      />

      <div className="df-container relative grid items-center gap-8 py-9 md:py-11 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12 lg:py-12">
        {/* ------------------------------------------------------------ copy */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary-300">
            <Droplet size={12} className="fill-primary-400 text-primary-400" aria-hidden="true" />
            Purity · Hygiene · Sanitation
          </span>

          <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[38px] lg:text-[44px]">
            Pure water for every
            <span className="text-primary-400"> home, office &amp; industry</span>
          </h1>

          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-white/65">
            Water purifiers, RO plants, softeners, ionizers and water ATMs — backed by a
            nationwide service network, free installation and same-day RO service.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/category/water-purifier"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-ink-900 transition-colors hover:bg-primary-400"
            >
              Shop water purifiers
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="#water-test"
              className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 text-[15px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/5"
            >
              Book free water test
            </Link>
          </div>
        </div>

        {/* -------------------------------------------------------- slideshow */}
        {count ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_30px_60px_-28px_rgba(0,0,0,0.55)]">
            <div className="relative aspect-[16/9] w-full lg:aspect-[16/8]">
              {slides.map((s, i) => (
                <Image
                  key={s.src}
                  src={imageUrl(s.src)}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className={cx(
                    'object-cover transition-opacity duration-700',
                    i === index ? 'opacity-100' : 'opacity-0',
                  )}
                  unoptimized
                />
              ))}
            </div>

            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i - 1 + count) % count)}
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm transition-colors hover:bg-white sm:flex"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i + 1) % count)}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm transition-colors hover:bg-white sm:flex"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>

                <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {slides.map((s, i) => (
                    <button
                      key={`dot-${s.src}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={i === index}
                      className={cx(
                        'h-1.5 rounded-full transition-all',
                        i === index ? 'w-7 bg-primary-500' : 'w-1.5 bg-white/80 hover:bg-white',
                      )}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

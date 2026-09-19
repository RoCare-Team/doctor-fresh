'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cx } from '@/lib/utils';

const AUTOPLAY_MS = 4500;

/**
 * Branch cards that slide: swipe or drag on a phone, arrows and dots on a
 * desktop, and a gentle auto-advance that stops while the pointer or focus is
 * on the slider — and never runs for people who ask for reduced motion.
 */
export default function StoreSlider({ stores }) {
  const track = useRef(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [paused, setPaused] = useState(false);

  // How many cards fit is decided by CSS; the page count is read back from it.
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const total = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    setPages(total);
    setPage(Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, stores.length]);

  const go = useCallback((to) => {
    const el = track.current;
    if (!el) return;
    const target = (to + pages) % pages;
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  }, [pages]);

  useEffect(() => {
    if (paused || pages < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => go(page + 1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, pages, page, go]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Store locations"
    >
      <div className="relative">
        <ul
          ref={track}
          onScroll={measure}
          className="df-no-scrollbar -mx-2 flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-3 pt-2"
        >
          {stores.map((s, i) => (
            <li
              key={s.id || i}
              className="w-full shrink-0 snap-start px-2 md:w-1/2 lg:w-1/3"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${stores.length}`}
            >
              <StoreCard store={s} />
            </li>
          ))}
        </ul>

        {pages > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(page - 1)}
              aria-label="Previous stores"
              className="absolute -left-6 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-700 shadow-[0_10px_24px_-12px_rgb(6_59_76/0.5)] transition-colors hover:border-primary-400 hover:text-primary-700 md:flex"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(page + 1)}
              aria-label="Next stores"
              className="absolute -right-6 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-700 shadow-[0_10px_24px_-12px_rgb(6_59_76/0.5)] transition-colors hover:border-primary-400 hover:text-primary-700 md:flex"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {/* Dots while they fit; a plain counter when there are too many for a phone. */}
      {pages > 7 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(page - 1)} aria-label="Previous store" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-700"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="min-w-14 text-center text-[14px] font-semibold tabular-nums text-ink-700" aria-live="polite">{`${page + 1} / ${pages}`}</span>
          <button type="button" onClick={() => go(page + 1)} aria-label="Next store" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-700"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      ) : pages > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show stores page ${i + 1}`}
              aria-current={i === page ? 'true' : undefined}
              className={cx('h-2.5 rounded-full transition-all', i === page ? 'w-7 bg-primary-500' : 'w-2.5 bg-primary-200 hover:bg-primary-300')}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One branch, laid out like the RO Care India cards: name, address, timings,
 * a Google Maps button and the map itself. The admin's embed is used when
 * there is one; otherwise Google's map is placed by the branch's address.
 */
function StoreCard({ store: s }) {
  const query = `${s.branch}, ${s.address}`;
  const maps = s.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const embed = s.mapEmbed || `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_14px_32px_-26px_rgb(6_59_76/0.55)] transition-shadow duration-300 hover:shadow-[0_22px_40px_-24px_rgb(6_59_76/0.55)]">
      <h3 className="text-[18px] font-semibold leading-snug text-primary-800">{s.branch}</h3>

      <p className="mt-3 text-[14px] leading-relaxed text-ink-700">
        <span className="font-semibold text-ink-900">Address: </span>
        {s.address}
      </p>
      {s.time ? (
        <p className="mt-2.5 text-[14px] text-ink-700">
          <span className="font-semibold text-ink-900">Timings: </span>
          {s.time}
        </p>
      ) : null}
      {s.phone ? (
        <p className="mt-2.5 text-[14px] text-ink-700">
          <span className="font-semibold text-ink-900">Phone: </span>
          <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="hover:text-primary-700">{s.phone}</a>
        </p>
      ) : null}

      <a
        href={maps}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex w-fit items-center rounded-lg bg-ink-900 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Open in Google Maps
      </a>

      {/* Pushed to the bottom so the maps line up across a row of cards. */}
      <div className="mt-auto pt-4">
        <iframe
          src={embed}
          title={`Map of ${s.branch}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-52 w-full rounded-lg border border-ink-900/70"
        />
      </div>
    </article>
  );
}

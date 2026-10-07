'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SliderDots, { pageState, goToPage, measureLater } from '@/components/common/SliderDots';
import { cx } from '@/lib/utils';

/**
 * The dots under a scrolling row — and, with `arrows`, a previous/next button
 * either side of it.
 *
 * A row used to be a client component so it could hold the scroll position —
 * which meant every card inside it was client code too, sent twice and
 * hydrated on arrival, for the sake of a handful of dots. The row is now
 * rendered on the server and this finds its track by id, so the only thing
 * the browser takes over is the controls themselves.
 *
 * The row scrolls on its own either way: the track is a scroll-snap list, so
 * it works by touch and by keyboard before this ever loads.
 *
 * The arrows are positioned against the nearest `relative` parent, so the
 * caller leaves room for them at its sides from the small breakpoint up.
 */
export default function RailControls({ trackId, label, tone = 'light', arrows = false }) {
  const track = useRef(null);
  const [{ pages, current }, setPaging] = useState({ pages: 1, current: 0 });

  useEffect(() => {
    const el = document.getElementById(trackId);
    track.current = el;
    if (!el) return undefined;

    const update = () => setPaging(pageState(el));
    const cancel = measureLater(update);
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      cancel();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [trackId]);

  return (
    <>
      {arrows && pages > 1 ? (
        <>
          <Arrow side="left" disabled={current === 0} onClick={() => goToPage(track.current, current - 1)} label={label} />
          <Arrow side="right" disabled={current >= pages - 1} onClick={() => goToPage(track.current, current + 1)} label={label} />
        </>
      ) : null}
      <SliderDots
        pages={pages}
        current={current}
        onSelect={(page) => goToPage(track.current, page)}
        label={label}
        tone={tone}
      />
    </>
  );
}

function Arrow({ side, disabled, onClick, label }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label.replace(/, page$/, '')}: ${side === 'left' ? 'previous' : 'next'}`}
      className={cx(
        // centred on the cards, not on cards + the dots below them
        'absolute top-[calc(50%-1.1rem)] z-10 hidden size-9 md:flex -translate-y-1/2 items-center justify-center rounded-full border border-[#e6ecf0] bg-white/95 text-ink-900 shadow-[0_8px_20px_-10px_rgb(6_59_76/0.45)] transition-all sm:size-10',
        'hover:border-primary-300 hover:bg-primary-600 hover:text-white',
        'disabled:pointer-events-none disabled:opacity-0 sm:disabled:opacity-35',
        // a phone has no gutter, so the arrows sit just inside the row's edges
        side === 'left' ? 'left-1 md:left-0 md:-translate-x-1/2' : 'right-1 md:right-0 md:translate-x-1/2',
      )}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import SliderDots, { pageState, goToPage, measureLater } from '@/components/common/SliderDots';

/**
 * The dots under a scrolling row, and nothing else.
 *
 * A row used to be a client component so it could hold the scroll position —
 * which meant every card inside it was client code too, sent twice and
 * hydrated on arrival, for the sake of a handful of dots. The row is now
 * rendered on the server and this finds its track by id, so the only thing
 * the browser takes over is the dots themselves.
 *
 * The row scrolls on its own either way: the track is a scroll-snap list, so
 * it works by touch and by keyboard before this ever loads.
 */
export default function RailControls({ trackId, label, tone = 'light' }) {
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
    <SliderDots
      pages={pages}
      current={current}
      onSelect={(page) => goToPage(track.current, page)}
      label={label}
      tone={tone}
    />
  );
}

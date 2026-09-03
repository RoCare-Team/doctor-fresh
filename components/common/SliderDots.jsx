'use client';

import { cx } from '@/lib/utils';

/**
 * Page dots under a scroll-snap slider — the same marker the hero banner uses,
 * so every slider on the site is steered the same way.
 *
 * One dot per screenful rather than per card: a rail of twenty products would
 * otherwise draw twenty dots and say nothing.
 */
// The deal banner is dark, where an ink dot would be invisible.
const REST = {
  light: 'bg-ink-900/25 hover:bg-ink-900/45',
  dark: 'bg-white/30 hover:bg-white/55',
};

// A row of eighteen dots says no more than a row of seven and fills the width
// of a phone, so long sliders show a window that travels with the active page.
const WINDOW = 7;

function windowFor(pages, current) {
  if (pages <= WINDOW) return { from: 0, to: pages };
  const from = Math.min(Math.max(current - Math.floor(WINDOW / 2), 0), pages - WINDOW);
  return { from, to: from + WINDOW };
}

export default function SliderDots({
  pages, current, onSelect, label = 'Slide', tone = 'light',
}) {
  if (pages < 2) return null;

  const { from, to } = windowFor(pages, current);

  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: to - from }, (_, n) => {
        const i = from + n;
        // The dots at the ends of a travelling window shrink, so it reads as
        // a window rather than as the whole slider.
        const edge = pages > WINDOW && (i === from || i === to - 1) && i !== current;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${label} ${i + 1} of ${pages}`}
            aria-current={i === current}
            className={cx(
              'h-1.5 rounded-full transition-all duration-300',
              i === current
                ? cx('w-8', tone === 'dark' ? 'bg-white' : 'bg-primary-500')
                : cx(edge ? 'w-1.5' : 'w-2.5', REST[tone] || REST.light),
            )}
          />
        );
      })}
    </div>
  );
}

/**
 * The scroll maths every slider repeats: how many screenfuls the track holds
 * and which one is showing.
 *
 * The last page is usually a partial one — eight cards two at a time leaves a
 * half screen at the end — so it is counted (ceil) but can never be scrolled
 * fully into view. Reaching the end is therefore what marks the last dot
 * active, rather than the scroll position dividing evenly.
 */
export function pageState(el) {
  if (!el || !el.clientWidth) return { pages: 1, current: 0 };

  // A hair of tolerance: sub-pixel widths make an exact fit measure as 2.0001.
  const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.02));
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;

  return {
    pages,
    current: atEnd
      ? pages - 1
      : Math.min(Math.round(el.scrollLeft / el.clientWidth), pages - 1),
  };
}

/** Scrolls to a page, stopping at the end rather than past it. */
export function goToPage(el, page) {
  if (!el) return;
  el.scrollTo({
    left: Math.min(page * el.clientWidth, el.scrollWidth - el.clientWidth),
    behavior: 'smooth',
  });
}

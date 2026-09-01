import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/utils';

export const PER_PAGE = 20;

/**
 * Cuts a list down to one page.
 *
 * The admin lists are small enough to read in one query, so the slice happens
 * here rather than in SQL — which keeps the total known without a second
 * COUNT and keeps every list page working the same way.
 */
export function paginate(rows = [], page = 1, perPage = PER_PAGE) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const from = (current - 1) * perPage;

  return {
    rows: rows.slice(from, from + perPage),
    page: current,
    pages,
    total,
    from: total ? from + 1 : 0,
    to: Math.min(from + perPage, total),
  };
}

/** 1 … 4 5 [6] 7 8 … 20 — never more than a handful of numbers. */
function pageNumbers(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const numbers = new Set([1, pages, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => numbers.add(n));
  if (current >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => numbers.add(n));

  const sorted = [...numbers].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  const withGaps = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) withGaps.push('gap');
    withGaps.push(n);
  });
  return withGaps;
}

/**
 * `params` carries the tab, search and filter already on the URL, so paging
 * never quietly drops them.
 */
export default function Pagination({ page, pages, total, from, to, params = {}, label = 'items' }) {
  if (pages <= 1) {
    return total ? (
      <p className="mt-4 text-[13.5px] text-ink-400">
        {total} {label}
      </p>
    ) : null;
  }

  const href = (n) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, String(value));
    }
    if (n > 1) query.set('page', String(n));
    const suffix = query.toString();
    return suffix ? `?${suffix}` : '?';
  };

  const step = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-[13.5px] transition-colors';

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pages">
      <p className="text-[13.5px] text-ink-400">
        <span className="font-medium text-ink-700">{from}–{to}</span> of {total} {label}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" aria-label="Previous page" className={cx(step, 'border-line-strong bg-white text-ink-700 hover:border-primary-500')}>
            <ChevronLeft size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className={cx(step, 'border-line bg-white text-ink-300')}>
            <ChevronLeft size={15} aria-hidden="true" />
          </span>
        )}

        {pageNumbers(page, pages).map((n, i) => (
          n === 'gap' ? (
            // eslint-disable-next-line react/no-array-index-key
            <span key={`gap-${i}`} className="px-1 text-ink-300">…</span>
          ) : (
            <Link
              key={n}
              href={href(n)}
              aria-current={n === page ? 'page' : undefined}
              className={cx(
                step,
                n === page
                  ? 'border-primary-500 bg-primary-500 font-medium text-white'
                  : 'border-line-strong bg-white text-ink-700 hover:border-primary-500',
              )}
            >
              {n}
            </Link>
          )
        ))}

        {page < pages ? (
          <Link href={href(page + 1)} rel="next" aria-label="Next page" className={cx(step, 'border-line-strong bg-white text-ink-700 hover:border-primary-500')}>
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className={cx(step, 'border-line bg-white text-ink-300')}>
            <ChevronRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

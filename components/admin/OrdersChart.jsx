'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';

const dayLabel = (ms, opts) => new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });

/**
 * Orders per day as columns — one series, so the card title names it and no
 * legend box is needed. Columns grow from one baseline with rounded tops,
 * hovering (or tabbing to) a day shows its orders and paid sales, and the
 * busiest day carries the only direct label. The same numbers sit in a table
 * for screen readers.
 */
export default function OrdersChart({ days }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.orders));
  // Clean ticks: 0, half, top — always above the busiest day, so its label
  // has room over the column instead of running into the header.
  const top = Math.max(2, Math.ceil((max + 1) / 2) * 2);
  const ticks = [top, top / 2, 0];
  const peak = days.reduce((best, d, i) => (d.orders > (days[best]?.orders ?? -1) ? i : best), 0);
  const total = days.reduce((sum, d) => sum + d.orders, 0);
  const shown = active ?? null;

  return (
    // Fills the card: the plot takes whatever height the row has, so there is
    // never a band of empty card under the axis.
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink-400">{`Orders — last ${days.length} days`}</p>
          <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-ink-900">{total}</p>
        </div>
        {/* The hovered day, read out above the plot rather than covering a column. */}
        <div className="min-h-10 text-right" aria-live="polite">
          {shown !== null ? (
            <>
              <p className="text-[12.5px] text-ink-400">{dayLabel(days[shown].date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
              <p className="text-[14px] font-semibold text-ink-900">
                {`${days[shown].orders} order${days[shown].orders === 1 ? '' : 's'}`}
                <span className="ml-1.5 font-normal text-ink-400">{`· ${formatPrice(days[shown].paid)} paid`}</span>
              </p>
            </>
          ) : (
            <p className="pt-4 text-[12.5px] text-ink-300">Hover a day for details</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex min-h-32 flex-1 gap-2" aria-hidden="true">
        {/* y-axis ticks */}
        <div className="flex w-6 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-ink-300">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{t}</span>)}
        </div>

        <div className="relative flex-1">
          {/* recessive hairline grid */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => <span key={t} className="block h-px bg-line" />)}
          </div>

          <div className="absolute inset-0 flex items-end gap-0.5">
            {days.map((d, i) => {
              const height = (d.orders / top) * 100;
              const isActive = shown === i;
              return (
                <button
                  key={d.date}
                  type="button"
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${dayLabel(d.date, { day: 'numeric', month: 'short' })}: ${d.orders} orders`}
                  // The hit target is the whole day's slot, taller and wider than the column.
                  className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-none focus-visible:bg-primary-50"
                >
                  {i === peak && d.orders > 0 ? (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[11.5px] font-semibold tabular-nums text-ink-700"
                      style={{ bottom: `calc(${height}% + 4px)` }}
                    >
                      {d.orders}
                    </span>
                  ) : null}
                  <span
                    className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${isActive ? 'bg-primary-700' : 'bg-primary-500 group-hover:bg-primary-600'}`}
                    style={{ height: d.orders ? `${Math.max(height, 3)}%` : '2px', opacity: d.orders ? 1 : 0.35 }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* x-axis: first, middle and last day, so labels never crowd */}
      <div className="ml-8 mt-2 flex justify-between text-[11px] text-ink-300" aria-hidden="true">
        <span>{dayLabel(days[0].date, { day: 'numeric', month: 'short' })}</span>
        <span>{dayLabel(days[Math.floor(days.length / 2)].date, { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>

      <table className="sr-only">
        <caption>{`Orders per day, last ${days.length} days`}</caption>
        <thead><tr><th>Day</th><th>Orders</th><th>Paid sales</th></tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date, { day: 'numeric', month: 'short' })}</td>
              <td>{d.orders}</td>
              <td>{formatPrice(d.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

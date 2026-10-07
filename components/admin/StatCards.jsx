import Link from 'next/link';
import { cx } from '@/lib/utils';

/**
 * The row of figures that sits above an admin list.
 *
 * One component rather than a set per page, so every list that gets a summary
 * gets the same one: label, figure, an icon in its own tinted square, and the
 * whole card a link to the filtered view when there is one.
 */

const TONES = {
  primary: { chip: 'bg-primary-50 text-primary-700', value: 'text-ink-900' },
  blue: { chip: 'bg-primary-50 text-primary-700', value: 'text-primary-700' },
  amber: { chip: 'bg-warning/10 text-warning', value: 'text-warning' },
  green: { chip: 'bg-success/10 text-success', value: 'text-success' },
  violet: { chip: 'bg-violet-50 text-violet-700', value: 'text-violet-700' },
};

export default function StatCards({ cards = [], className }) {
  if (!cards.length) return null;

  return (
    <div className={cx('grid grid-cols-2 gap-3 xl:grid-cols-4', className)}>
      {cards.map(({
        id, label, value, note, icon: Icon, tone = 'primary', href, active,
      }) => {
        const look = TONES[tone] || TONES.primary;
        const body = (
          <>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-ink-500">{label}</span>
              <span className={cx('mt-1 block truncate text-[26px] font-bold leading-none tabular-nums', look.value)}>
                {value}
              </span>
              {note ? <span className="mt-1.5 block truncate text-[12px] text-ink-400">{note}</span> : null}
            </span>
            {Icon ? (
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', look.chip)}>
                <Icon size={19} aria-hidden="true" />
              </span>
            ) : null}
          </>
        );

        const shell = cx(
          'flex items-center justify-between gap-3 rounded-2xl border bg-white p-4',
          active ? 'border-primary-400' : 'border-line',
          href && 'transition-colors hover:border-primary-200',
        );

        return href
          ? <Link key={id || label} href={href} className={shell}>{body}</Link>
          : <div key={id || label} className={shell}>{body}</div>;
      })}
    </div>
  );
}

import { cx } from '@/lib/utils';

const TONE = {
  pending: 'bg-warning/12 text-warning',
  shipped: 'bg-primary-50 text-primary-800',
  delivered: 'bg-success/12 text-success',
  'order cancelled': 'bg-danger/10 text-danger',
};

const LABEL = {
  pending: 'Pending',
  shipped: 'Shipped',
  delivered: 'Delivered',
  'order cancelled': 'Cancelled',
};

export default function StatusPill({ status }) {
  return (
    <span
      className={cx(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium',
        TONE[status] || 'bg-surface-muted text-ink-500',
      )}
    >
      {LABEL[status] || status || '—'}
    </span>
  );
}

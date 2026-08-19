import { Star } from 'lucide-react';

export default function Rating({ value = 0, count, size = 14, className = '' }) {
  if (!value) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5 text-[12px] font-semibold text-white">
        {value.toFixed(1)}
        <Star size={size - 4} fill="currentColor" strokeWidth={0} aria-hidden="true" />
      </span>
      <span className="sr-only">Rated {value} out of 5</span>
      {count ? <span className="text-[13px] text-ink-400">({count})</span> : null}
    </span>
  );
}

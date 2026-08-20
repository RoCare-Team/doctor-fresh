import { BadgeCheck, Star } from 'lucide-react';

export default function ProductReviews({ reviews = [], rating, reviewCount }) {
  if (!reviews.length && !rating) return null;

  return (
    <div>
      {rating ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[14px] border border-line bg-surface-muted px-5 py-4">
          <div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-ink-900">{rating.toFixed(1)}</span>
              <span className="text-sm text-ink-400">/ 5</span>
            </p>
            <div className="mt-1 flex gap-0.5 text-warning" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} fill={i <= Math.round(rating) ? 'currentColor' : 'none'} strokeWidth={1.5} />
              ))}
            </div>
          </div>
          {reviewCount ? (
            <p className="text-[14.5px] text-ink-500">
              Based on <span className="font-medium text-ink-900">{reviewCount}</span> customer reviews
            </p>
          ) : null}
        </div>
      ) : null}

      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((r, i) => (
            <li key={`${r.author}-${i}`} className="df-card p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-success px-1.5 py-0.5 text-[12px] font-semibold text-white">
                  {r.rating.toFixed(1)}
                  <Star size={10} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </span>
                <h3 className="text-[15px] font-medium text-ink-900">{r.title}</h3>
              </div>
              <p className="text-[14.5px] leading-relaxed text-ink-500">{r.text}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-ink-400">
                {r.author}
                {r.verified ? (
                  <>
                    <BadgeCheck size={13} className="text-primary-700" aria-hidden="true" />
                    Certified Buyer
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14.5px] text-ink-400">
          No written reviews yet for this product.
        </p>
      )}
    </div>
  );
}

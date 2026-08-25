'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { cx } from '@/lib/utils';

/**
 * Rate and review a product.
 *
 * Writes to `user_rating` and adjusts the product's running rating totals, the
 * same way `ajax_post_user_rating` does — one rating per customer per product,
 * updated rather than duplicated if they rate it again.
 */
export default function ReviewForm({ productId }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!rating) { setError('Choose a star rating first.'); setStatus('error'); return; }

    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const comment = new FormData(form).get('comment');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.signIn) { router.push('/login'); return; }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save your review.');

      setStatus('done');
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="df-card mt-6 p-5 md:p-6">
      <h3 className="text-[16px] font-semibold text-ink-900">Write a review</h3>

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            className="p-0.5"
          >
            <Star
              size={24}
              className={cx('transition-colors', n <= shown ? 'text-warning' : 'text-ink-300')}
              fill={n <= shown ? 'currentColor' : 'none'}
              strokeWidth={n <= shown ? 0 : 1.5}
              aria-hidden="true"
            />
          </button>
        ))}
        {rating ? <span className="ml-2 text-[14px] text-ink-500">{rating} of 5</span> : null}
      </div>

      <Textarea
        name="comment"
        rows={3}
        placeholder="What did you think of this product? (optional)"
        aria-label="Your review"
        className="mt-4"
      />

      <div className="mt-4">
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Saving…' : 'Submit review'}
        </Button>
      </div>

      {status !== 'idle' && status !== 'sending' ? (
        <div className="mt-3">
          <FormNote status={status} error={error} doneMessage="Thank you — your review has been saved." />
        </div>
      ) : null}
    </form>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Star, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, ExternalLink, X,
  CheckCircle2, CalendarDays,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

/**
 * Product reviews.
 *
 * The same table the PHP panel writes, so a review added here shows on the
 * product page — and in its star rating — exactly like one left by a customer.
 * Hiding takes a review off the site and keeps it here; deleting does not come
 * back.
 */
const PER_PAGE = 20;

const when = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
}) : '—');

const today = () => new Date().toISOString().slice(0, 10);

function Stars({ value, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cx(
            value >= n - 0.25 ? 'fill-warning text-warning'
              : value >= n - 0.75 ? 'fill-warning/50 text-warning' : 'text-ink-200',
          )}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1 text-[12.5px] font-medium text-ink-500">{Number(value).toFixed(1)}</span>
    </span>
  );
}

/** A circle with the reviewer's initial, coloured from their name. */
function Avatar({ name }) {
  const tones = ['bg-primary-600', 'bg-success', 'bg-warning', 'bg-ink-700', 'bg-danger'];
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const tone = tones[letter.charCodeAt(0) % tones.length];

  return (
    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold text-white', tone)} aria-hidden="true">
      {letter}
    </span>
  );
}

const EMPTY = {
  id: 0, productId: '', author: '', rating: 5, title: '', body: '', date: today(),
};

/** The write / edit form, shown in place of the list. */
function ReviewForm({ value, products, onCancel, onDone }) {
  const [form, setForm] = useState(value);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const editing = Boolean(form.id);
    const res = await fetch('/api/admin/reviews', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id || undefined,
        productId: Number(form.productId),
        author: form.author,
        rating: Number(form.rating),
        title: form.title,
        body: form.body,
        date: editing ? undefined : form.date,
      }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setError(data?.error || 'Could not save the review.');
      setStatus('error');
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink-900">
          {form.id ? 'Edit review' : 'Write a review'}
        </h2>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700" aria-label="Close">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-700">Product</span>
          <select
            value={form.productId}
            onChange={(e) => set({ productId: e.target.value })}
            required
            className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500"
          >
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-700">Reviewer’s name</span>
          <input
            value={form.author}
            onChange={(e) => set({ author: e.target.value })}
            required
            placeholder="Ashwani Kumar"
            className="h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-700">Rating</span>
          <select
            value={form.rating}
            onChange={(e) => set({ rating: e.target.value })}
            className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500"
          >
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((n) => (
              <option key={n} value={n}>{`${n} star${n === 1 ? '' : 's'}`}</option>
            ))}
          </select>
        </label>

        {!form.id ? (
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-ink-700">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
              className="h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500"
            />
          </label>
        ) : null}

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-ink-700">Heading</span>
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            required
            maxLength={50}
            placeholder="Great product"
            className="h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500"
          />
          <span className="mt-1 block text-[12px] text-ink-400">{`${form.title.length}/50`}</span>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[13px] font-medium text-ink-700">Review</span>
          <textarea
            value={form.body}
            onChange={(e) => set({ body: e.target.value })}
            required
            rows={4}
            placeholder="Installed in two days, water tastes clean and the service visit was on time."
            className="w-full rounded-lg border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-primary-500"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {status === 'saving' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
          {form.id ? 'Save review' : 'Publish review'}
        </button>
        <button type="button" onClick={onCancel} className="text-[14px] text-ink-500 transition-colors hover:text-ink-900">
          Cancel
        </button>
        {error ? <span className="text-[13.5px] text-danger">{error}</span> : null}
      </div>
    </form>
  );
}

/** One figure worth knowing at a glance, above the list. */
function Stat({ label, value, tone = 'plain' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[13px] text-ink-400">{label}</p>
      <p className={cx(
        'mt-0.5 text-[22px] font-semibold',
        tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-ink-900',
      )}
      >
        {value}
      </p>
    </div>
  );
}

export default function ReviewsManager({ reviews, products }) {
  const router = useRouter();
  const allow = useCan();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [stars, setStars] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // EMPTY-shaped, or null when the list is showing
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (tab === 'visible' && !r.live) return false;
      if (tab === 'hidden' && r.live) return false;
      // A star filter covers its own half step: 4 takes 4 and 4.5.
      if (stars !== 'all' && Math.floor(r.rating) !== Number(stars)) return false;
      if (!q) return true;
      return `${r.author} ${r.title} ${r.body} ${r.productName}`.toLowerCase().includes(q);
    });
  }, [reviews, query, tab, stars]);

  const counts = useMemo(() => {
    const live = reviews.filter((r) => r.live).length;
    const total = reviews.length;
    const sum = reviews.reduce((n, r) => n + (Number(r.rating) || 0), 0);
    return {
      total,
      live,
      hidden: total - live,
      average: total ? (sum / total).toFixed(1) : '—',
    };
  }, [reviews]);

  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function send(id, init) {
    setBusy(id);
    setError('');
    const res = await fetch('/api/admin/reviews', init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(0);
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save the change.'); return; }
    router.refresh();
  }

  const toggle = (r) => send(r.id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: r.id, live: !r.live }),
  });

  const edit = (r) => setForm({
    id: r.id,
    productId: String(r.productId),
    author: r.author,
    rating: r.rating,
    title: r.title,
    body: r.body,
    date: today(),
  });

  const remove = (r) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${r.author}’s review of ${r.productName}?\n\nTo take it off the site but keep it here, use Hide instead.`)) return;
    send(r.id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id }),
    });
  };

  if (form) {
    return (
      <>
        <h1 className="mb-5 text-[20px] font-semibold text-ink-900">Reviews</h1>
        <ReviewForm
          value={form}
          products={products}
          onCancel={() => setForm(null)}
          onDone={() => { setForm(null); router.refresh(); }}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink-900">Reviews</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">
            Shown on the product page, and counted in its star rating.
          </p>
        </div>
        {allow('reviews', 'create') ? (
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY })}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-[14px] font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={16} aria-hidden="true" />
            Write a review
          </button>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total reviews" value={counts.total} />
        <Stat label="Shown on site" value={counts.live} tone="good" />
        <Stat label="Hidden" value={counts.hidden} tone={counts.hidden ? 'warn' : 'plain'} />
        <Stat label="Average rating" value={counts.average} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3">
        <span className="relative flex-1 min-w-56">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search reviews, products, names…"
            className="h-10 w-full rounded-lg border border-line-strong pl-9 pr-3 text-[14px] outline-none focus:border-primary-500"
          />
        </span>

        <select
          value={tab}
          onChange={(e) => { setTab(e.target.value); setPage(1); }}
          aria-label="Status"
          className="h-10 rounded-lg border border-line-strong bg-white px-3 text-[14px] text-ink-700 outline-none focus:border-primary-500"
        >
          <option value="all">All status</option>
          <option value="visible">Shown on site</option>
          <option value="hidden">Hidden</option>
        </select>

        <select
          value={stars}
          onChange={(e) => { setStars(e.target.value); setPage(1); }}
          aria-label="Rating"
          className="h-10 rounded-lg border border-line-strong bg-white px-3 text-[14px] text-ink-700 outline-none focus:border-primary-500"
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{`${n} star${n === 1 ? '' : 's'}`}</option>
          ))}
        </select>

        {query || tab !== 'all' || stars !== 'all' ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setTab('all'); setStars('all'); setPage(1); }}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-line-strong px-3 text-[13.5px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
          >
            <X size={14} aria-hidden="true" />
            {`Clear (${shown.length} shown)`}
          </button>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-[13.5px] text-danger">{error}</p> : null}

      {current.length ? (
        <ul className="space-y-3">
          {current.map((r) => (
            <li
              key={r.id}
              className={cx(
                'rounded-xl border bg-white p-5',
                r.live ? 'border-line' : 'border-warning/40 bg-warning/5',
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar name={r.author} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-semibold text-ink-900">{r.author || 'Anonymous'}</span>
                    {r.live ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11.5px] font-semibold text-success">
                        <CheckCircle2 size={11} aria-hidden="true" />
                        Shown on site
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11.5px] font-semibold text-warning">
                        <EyeOff size={11} aria-hidden="true" />
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[12.5px] text-ink-400">
                    {r.productHref ? (
                      <a href={r.productHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-800">
                        {r.productName}
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-danger">{`${r.productName} — this product no longer exists, so the review shows nowhere`}</span>
                    )}
                    {` · Product ID: ${r.productId} · Review ID: ${r.id}`}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Stars value={r.rating} size={15} />
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-400">
                      <CalendarDays size={12} aria-hidden="true" />
                      {when(r.at)}
                    </span>
                  </div>

                  <p className="mt-3 text-[15px] font-semibold text-ink-900">{r.title}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{r.body}</p>
                </div>

                {/* The two quiet actions sit in the corner, as on the rest of
                    the admin; the ones that change what visitors see are
                    spelled out along the bottom. */}
                <div className="flex shrink-0 items-center gap-1">
                  {allow('reviews', 'edit') ? (
                    <button
                      type="button"
                      onClick={() => edit(r)}
                      title="Edit this review"
                      aria-label={`Edit ${r.author}'s review`}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-surface-muted hover:text-primary-800"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                  {allow('reviews', 'delete') ? (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busy === r.id}
                      title="Delete for good"
                      aria-label={`Delete ${r.author}'s review`}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger/5 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              {allow('reviews', 'edit') || allow('reviews', 'delete') ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {allow('reviews', 'edit') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => edit(r)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-800"
                      >
                        <Pencil size={13} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(r)}
                        disabled={busy === r.id}
                        className={cx(
                          'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-50',
                          r.live
                            ? 'bg-warning/10 text-warning hover:bg-warning/15'
                            : 'bg-success/10 text-success hover:bg-success/15',
                        )}
                      >
                        {busy === r.id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                          : r.live ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                        {r.live ? 'Hide from site' : 'Show on site'}
                      </button>
                    </>
                  ) : null}
                  {allow('reviews', 'delete') ? (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busy === r.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger/10 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/15 disabled:opacity-50"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-[14px] text-ink-400">
          {reviews.length ? 'No review matches that.' : 'No reviews yet. Write the first one above.'}
        </p>
      )}

      {pages > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={cx(
                'h-8 min-w-8 rounded-md border px-2 text-[13.5px] transition-colors',
                n === page ? 'border-primary-500 bg-primary-50 font-medium text-primary-800'
                  : 'border-line-strong text-ink-500 hover:border-primary-300',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

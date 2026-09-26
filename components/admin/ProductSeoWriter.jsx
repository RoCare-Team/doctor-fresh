'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Loader2, Check, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

/**
 * A first draft of a product page, written by Claude.
 *
 * Nothing is saved until it has been read: the draft comes back in pieces,
 * each with a tick, and only the ticked pieces are written to the product.
 * Reviews are the part to weigh carefully — they go out under customers'
 * names, so they are off by default.
 */
const PIECES = [
  { id: 'descriptionHtml', label: 'Description', note: 'Replaces the description on the product page' },
  { id: 'specs', label: 'Specification table', note: 'Replaces the spec rows' },
  { id: 'faqs', label: 'FAQs', note: 'Replaces the questions on the page' },
  { id: 'metaTitle', label: 'Meta title', note: 'What Google shows as the headline' },
  { id: 'metaDescription', label: 'Meta description', note: 'The grey text under it' },
  { id: 'keywords', label: 'Keywords', note: 'Saved to the product’s keyword field' },
  { id: 'reviews', label: 'Reviews', note: 'Added as new reviews under this product' },
];

function Box({ title, note, children }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
      {note ? <p className="mt-0.5 text-[12.5px] text-ink-400">{note}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ProductSeoWriter({ product }) {
  const router = useRouter();
  const [context, setContext] = useState('');
  const [status, setStatus] = useState('idle'); // idle | writing | ready | saving | saved | error
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [keep, setKeep] = useState({});
  const [result, setResult] = useState(null);

  async function write() {
    setStatus('writing');
    setError('');
    setResult(null);

    const res = await fetch('/api/admin/products/seo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, context }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setError(data?.error || 'Could not reach the AI service.');
      setStatus('error');
      return;
    }

    setDraft(data.draft);
    // Everything but the reviews is ticked: those carry people's names.
    setKeep({
      descriptionHtml: true, specs: true, faqs: true, metaTitle: true, metaDescription: true, keywords: true, reviews: false,
    });
    setStatus('ready');
  }

  async function apply() {
    setStatus('saving');
    setError('');

    const picked = {};
    for (const piece of PIECES) if (keep[piece.id] && draft[piece.id]) picked[piece.id] = draft[piece.id];

    const res = await fetch('/api/admin/products/seo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, apply: picked }),
    }).catch(() => null);

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setError(data?.error || 'Could not save the draft.');
      setStatus('error');
      return;
    }

    setResult(data);
    setStatus('saved');
    router.refresh();
  }

  const busy = status === 'writing' || status === 'saving';
  const tick = (id) => setKeep((k) => ({ ...k, [id]: !k[id] }));

  return (
    <>
      <section className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50/70 to-white p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
          <Sparkles size={18} className="text-violet-600" aria-hidden="true" />
          AI SEO Generator
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-500">
          Writes the description, specifications, reviews, meta tags and FAQs for this product.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
            Additional context / keywords{' '}
            <span className="font-normal text-ink-400">(optional, but recommended)</span>
          </span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="E.g. '10 litre RO+UV+TDS purifier for a family of four, borewell water up to 2000 TDS, 1 year warranty on electricals' or 'Target: families, offices, borewell areas'"
            className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-violet-500"
          />
        </label>

        <p className="mt-2 text-[12.5px] text-ink-400">
          💡 Say what the product is for, who buys it and its key features — the more it knows,
          the better the copy. Facts it is not given, it leaves out: it will not invent a
          warranty, a certificate or a number.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {status === 'writing' ? (
            <span className="mr-auto text-[13.5px] text-ink-400">This takes up to a minute.</span>
          ) : null}
          {error ? (
            <span className="mr-auto inline-flex items-center gap-1.5 text-[13.5px] text-danger">
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </span>
          ) : null}
          <Can section="products" action="edit" fallback={<ViewOnlyNote />}>
            <button
              type="button"
              onClick={write}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-[14px] font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === 'writing'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : draft ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
              {status === 'writing' ? 'Generating…' : draft ? 'Generate again' : 'Generate SEO content'}
            </button>
          </Can>
        </div>

        <div className="mt-4 rounded-lg border border-violet-100 bg-white p-4">
          <p className="text-[13px] font-semibold text-ink-900">What will be generated:</p>
          <ul className="mt-2 space-y-1">
            {[
              'Product description (SEO-ready HTML)',
              'Technical specifications (table rows)',
              '8 realistic product reviews (Indian names)',
              'Product features (bulleted list)',
              'SEO keywords (5–8 relevant ones)',
              'Meta title (under 60 characters)',
              'Meta description (under 155 characters)',
              '5 product FAQs (question + answer)',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-[13px] text-ink-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {draft ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-line bg-surface-muted/60 p-4">
            <p className="text-[13.5px] font-medium text-ink-700">Tick what to keep</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PIECES.map((piece) => {
                const value = draft[piece.id];
                const empty = !value || (Array.isArray(value) && !value.length);
                return (
                  <label
                    key={piece.id}
                    className={cx(
                      'flex items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5',
                      empty ? 'border-line opacity-50' : 'border-line-strong',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(keep[piece.id]) && !empty}
                      disabled={empty}
                      onChange={() => tick(piece.id)}
                      className="mt-0.5 h-4 w-4 accent-primary-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-ink-900">
                        {piece.label}
                        {Array.isArray(value) && value.length ? (
                          <span className="ml-1.5 text-[12.5px] font-normal text-ink-400">{`${value.length}`}</span>
                        ) : null}
                      </span>
                      <span className="block text-[12.5px] text-ink-400">{empty ? 'Nothing written' : piece.note}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={apply}
                disabled={busy || !PIECES.some((p) => keep[p.id])}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-[14px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                Apply to this product
              </button>
              {status === 'saved' && result ? (
                <span className="text-[13.5px] text-success">
                  {`Saved${result.reviewsWritten ? `, and ${result.reviewsWritten} reviews added` : ''}. The product page is already updated.`}
                </span>
              ) : null}
            </div>
          </div>

          {draft.descriptionHtml ? (
            <Box title="Description">
              <div className="df-prose max-w-none text-[14.5px]" dangerouslySetInnerHTML={{ __html: draft.descriptionHtml }} />
            </Box>
          ) : null}

          {draft.specs?.length ? (
            <Box title="Specifications">
              <table className="w-full border-collapse text-[14px]">
                <tbody>
                  {draft.specs.map((s) => (
                    <tr key={s.label} className="border-b border-line last:border-0">
                      <th scope="row" className="w-1/3 bg-surface-muted px-3 py-2 text-left font-medium text-ink-700">{s.label}</th>
                      <td className="px-3 py-2 text-ink-600">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : null}

          {draft.features?.length ? (
            <Box title="Features" note="Not saved on its own — paste any of these into the description.">
              <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink-600">
                {draft.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </Box>
          ) : null}

          {draft.reviews?.length ? (
            <Box title="Reviews" note="These go out under customers’ names. Read every one before you keep them.">
              <ul className="space-y-3">
                {draft.reviews.map((r) => (
                  <li key={`${r.author}-${r.title}`} className="rounded-lg border border-line px-3 py-2.5">
                    <p className="text-[13.5px] font-semibold text-ink-900">
                      {r.title}
                      <span className="ml-2 font-normal text-warning">{`${r.rating} ★`}</span>
                    </p>
                    <p className="mt-1 text-[14px] text-ink-600">{r.body}</p>
                    <p className="mt-1 text-[12.5px] text-ink-400">{r.author}</p>
                  </li>
                ))}
              </ul>
            </Box>
          ) : null}

          {draft.faqs?.length ? (
            <Box title="FAQs">
              <ul className="space-y-3">
                {draft.faqs.map((f) => (
                  <li key={f.question}>
                    <p className="text-[14px] font-medium text-ink-900">{f.question}</p>
                    <p className="mt-0.5 text-[14px] text-ink-600">{f.answer}</p>
                  </li>
                ))}
              </ul>
            </Box>
          ) : null}

          <Box title="Search listing">
            <p className="text-[15px] font-medium text-primary-800">{draft.metaTitle}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-500">{draft.metaDescription}</p>
            {draft.keywords?.length ? (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {draft.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12.5px] text-ink-600">{k}</span>
                ))}
              </p>
            ) : null}
          </Box>
        </div>
      ) : null}
    </>
  );
}

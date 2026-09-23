'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, X,
} from 'lucide-react';
import { FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

/**
 * The product page's highlights table.
 *
 * The labels and their values are the ones the PHP panel keeps in `attribute`
 * and `attribute_filter`; a product simply carries a list of chosen values.
 * Order is the whole point of this screen: the page shows the first six labels
 * as the highlights table and puts the rest under the Attribute tab, so the
 * ones worth seeing first have to be movable.
 */
const SHOWN_ON_PAGE = 6;

export default function ProductHighlights({ product, attributes }) {
  const byId = useMemo(() => new Map(attributes.map((a) => [a.id, a])), [attributes]);

  // Values as one list per label, in the order they are stored.
  const [rows, setRows] = useState(() => {
    const out = [];
    const seen = new Map();
    for (const valueId of product.attributeValueIds || []) {
      const attribute = attributes.find((a) => a.values.some((v) => v.id === valueId));
      if (!attribute) continue; // a value the PHP panel has since removed
      if (!seen.has(attribute.id)) {
        seen.set(attribute.id, out.length);
        out.push({ attributeId: attribute.id, valueIds: [] });
      }
      out[seen.get(attribute.id)].valueIds.push(valueId);
    }
    return out;
  });

  const [adding, setAdding] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');

  const used = new Set(rows.map((r) => r.attributeId));
  const spare = attributes.filter((a) => !used.has(a.id));

  const change = (next) => { setRows(next); setStatus('idle'); };

  const move = (index, by) => {
    const next = [...rows];
    const to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    change(next);
  };

  const toggleValue = (index, valueId) => change(rows.map((row, i) => {
    if (i !== index) return row;
    const has = row.valueIds.includes(valueId);
    return {
      ...row,
      valueIds: has ? row.valueIds.filter((v) => v !== valueId) : [...row.valueIds, valueId],
    };
  }));

  async function save() {
    setStatus('saving');
    setError('');
    // A label with nothing chosen has nothing to store.
    const ids = rows.flatMap((r) => r.valueIds);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, attributeValueIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const filled = rows.filter((r) => r.valueIds.length);

  return (
    <>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Highlights</h2>
        <p className="mt-1 text-[13px] text-ink-400">
          The first {SHOWN_ON_PAGE} labels here make the{' '}
          <span className="font-medium text-ink-700">Product highlights</span> table on the
          product page. The rest still show, lower down, under the Attribute tab.
        </p>

        {rows.length ? (
          <ol className="mt-4 space-y-2">
            {rows.map((row, index) => {
              const attribute = byId.get(row.attributeId);
              if (!attribute) return null;
              const onPage = index < SHOWN_ON_PAGE && row.valueIds.length > 0;

              return (
                <li
                  key={row.attributeId}
                  className={cx(
                    'rounded-lg border p-3',
                    onPage ? 'border-primary-300 bg-primary-50/40' : 'border-line bg-surface-muted/40',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${attribute.title} up`}
                        className="rounded p-0.5 text-ink-300 transition-colors hover:text-primary-700 disabled:opacity-30"
                      >
                        <ChevronUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                        aria-label={`Move ${attribute.title} down`}
                        className="rounded p-0.5 text-ink-300 transition-colors hover:text-primary-700 disabled:opacity-30"
                      >
                        <ChevronDown size={14} aria-hidden="true" />
                      </button>
                    </span>

                    <span className="flex-1 text-[14px] font-medium text-ink-900">
                      {attribute.title}
                      {onPage ? (
                        <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-primary-800">
                          On page
                        </span>
                      ) : null}
                      {!row.valueIds.length ? (
                        <span className="ml-2 text-[12.5px] font-normal text-ink-400">
                          nothing chosen — it will not show
                        </span>
                      ) : null}
                    </span>

                    <button
                      type="button"
                      onClick={() => change(rows.filter((_, i) => i !== index))}
                      aria-label={`Remove ${attribute.title}`}
                      className="shrink-0 rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-white hover:text-danger"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {attribute.values.map((v) => {
                      const picked = row.valueIds.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleValue(index, v.id)}
                          aria-pressed={picked}
                          className={cx(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors',
                            picked
                              ? 'border-primary-500 bg-primary-600 text-white'
                              : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
                          )}
                        >
                          {v.title}
                          {picked ? <X size={11} aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-[13.5px] text-ink-400">
            No highlights yet. Add a label below and choose its values.
          </p>
        )}

        {spare.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="Label to add"
              className="h-10 rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500"
            >
              <option value="">Add a label…</option>
              {spare.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!adding}
              onClick={() => {
                change([...rows, { attributeId: Number(adding), valueIds: [] }]);
                setAdding('');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[13.5px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800 disabled:opacity-40"
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          </div>
        ) : null}

        <p className="mt-4 text-[12.5px] text-ink-400">
          {filled.length
            ? `${Math.min(filled.length, SHOWN_ON_PAGE)} on the product page, ${filled.length} in total.`
            : 'Nothing chosen, so the product page shows no highlights table.'}
          {' '}New labels and values are added in the old panel; everything already there is listed here.
        </p>
      </section>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Can section="products" action="edit" fallback={<ViewOnlyNote />}>
            <Button type="button" onClick={save} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Save highlights'}
            </Button>
          </Can>
          {status === 'saved' ? (
            <span className="text-[13.5px] text-success">Saved. The product page is already updated.</span>
          ) : null}
        </div>

        {status === 'error' ? <FormNote status="error" error={error} /> : null}
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * Everything the product page shows below the buy box: the description, the
 * specification table, the FAQ, and the installation and shipping notes.
 *
 * These are the columns the storefront already reads — the spec rows are saved
 * back as the same `<table>` the PHP panel writes, so a product edited here
 * still opens correctly in the old panel.
 */
export default function ProductDetails({ product }) {
  const [specs, setSpecs] = useState(
    product.specs?.length ? product.specs : [{ label: '', value: '' }],
  );
  const [faqs, setFaqs] = useState(
    product.faqs?.length ? product.faqs : [{ question: '', answer: '' }],
  );
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          descriptionHtml: values.descriptionHtml,
          installationHtml: values.installationHtml,
          shippingHtml: values.shippingHtml,
          specs: specs.filter((s) => s.label.trim() || s.value.trim()),
          faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const editRow = (list, setList, index, patch) => setList(
    list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  );
  const dropRow = (list, setList, index) => setList(
    list.length > 1 ? list.filter((_, i) => i !== index) : list,
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">About this product</h2>
        <p className="mt-1 text-[13px] text-ink-400">
          Shown under the Description tab. Basic HTML works — <code>&lt;p&gt;</code>,{' '}
          <code>&lt;ul&gt;&lt;li&gt;</code>, <code>&lt;strong&gt;</code>.
        </p>
        <div className="mt-4">
          <Textarea
            label=""
            name="descriptionHtml"
            rows={10}
            defaultValue={product.descriptionHtml}
            placeholder="<p>What this product does, who it suits, what is in the box…</p>"
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
        </div>
      </section>

      {/* ------------------------------------------------------ specifications */}
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Specifications</h2>
        <p className="mt-1 text-[13px] text-ink-400">
          The table customers compare on — technology, stages, capacity, dimensions, warranty.
          This is the section most products are missing.
        </p>

        <div className="mt-4 space-y-2">
          {specs.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex items-center gap-2">
              <GripVertical size={15} className="shrink-0 text-ink-200" aria-hidden="true" />
              <input
                value={row.label}
                onChange={(e) => editRow(specs, setSpecs, index, { label: e.target.value })}
                placeholder="Purification Stage"
                aria-label={`Specification ${index + 1} name`}
                className="h-10 w-2/5 rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500"
              />
              <input
                value={row.value}
                onChange={(e) => editRow(specs, setSpecs, index, { value: e.target.value })}
                placeholder="12 Stage"
                aria-label={`Specification ${index + 1} value`}
                className="h-10 flex-1 rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => dropRow(specs, setSpecs, index)}
                aria-label="Remove this row"
                className="shrink-0 rounded-lg p-2 text-ink-300 transition-colors hover:bg-surface-muted hover:text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSpecs([...specs, { label: '', value: '' }])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
        >
          <Plus size={14} aria-hidden="true" />
          Add a row
        </button>
      </section>

      {/* ---------------------------------------------------------------- FAQ */}
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Frequently asked questions</h2>
        <p className="mt-1 text-[13px] text-ink-400">
          Shown at the bottom of the product page, and given to Google as FAQ markup.
        </p>

        <div className="mt-4 space-y-3">
          {faqs.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="rounded-lg border border-line p-3">
              <div className="flex items-start gap-2">
                <input
                  value={row.question}
                  onChange={(e) => editRow(faqs, setFaqs, index, { question: e.target.value })}
                  placeholder="How often should the filter be changed?"
                  aria-label={`Question ${index + 1}`}
                  className="h-10 flex-1 rounded-lg border border-line-strong px-3 text-[14px] font-medium outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => dropRow(faqs, setFaqs, index)}
                  aria-label="Remove this question"
                  className="shrink-0 rounded-lg p-2 text-ink-300 transition-colors hover:bg-surface-muted hover:text-danger"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <textarea
                value={row.answer}
                onChange={(e) => editRow(faqs, setFaqs, index, { answer: e.target.value })}
                rows={2}
                placeholder="Every 6 to 12 months, depending on your water quality."
                aria-label={`Answer ${index + 1}`}
                className="mt-2 w-full rounded-lg border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-primary-500"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
        >
          <Plus size={14} aria-hidden="true" />
          Add a question
        </button>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Installation &amp; shipping</h2>
        <p className="mt-1 text-[13px] text-ink-400">
          Their own tabs on the product page. Left blank, the standard Doctor Fresh
          installation note is shown instead.
        </p>
        <div className="mt-4 grid gap-3.5">
          <Textarea
            label="Installation & service"
            name="installationHtml"
            rows={4}
            defaultValue={product.installationHtml}
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
          <Textarea
            label="Billing & shipping"
            name="shippingHtml"
            rows={4}
            defaultValue={product.shippingHtml}
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save details'}
        </Button>
        {status === 'saved' ? (
          <span className="text-[13.5px] text-success">
            Saved. The product page updates within 5 minutes.
          </span>
        ) : null}
      </div>

      {status === 'error' ? <FormNote status="error" error={error} /> : null}
    </form>
  );
}

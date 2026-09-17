'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, SlidersHorizontal, Tag, Boxes, IndianRupee, Loader2, X,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * Search and filters for the admin product list. Every filter lives in the
 * URL, so a filtered view survives a refresh, can be bookmarked, and the page
 * that reads it stays a server component.
 */
export default function ProductFilters({ categories = [], brands = [], values = {} }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeCount = ['category', 'brand', 'min', 'max'].filter((k) => values[k]).length;
  // Opens on its own when the page was reached with a filter already set.
  const [open, setOpen] = useState(activeCount > 0);

  const [form, setForm] = useState({
    q: values.q || '',
    category: values.category || '',
    brand: values.brand || '',
    min: values.min || '',
    max: values.max || '',
  });

  function go(next) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (String(v).trim()) query.set(k, String(v).trim());
    }
    const qs = query.toString();
    startTransition(() => router.push(qs ? `/admin/products?${qs}` : '/admin/products'));
  }

  // A select applies the moment it changes; typed fields wait for Enter or
  // Apply, so the list does not reload on every keystroke.
  function pick(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    go(next);
  }

  function reset() {
    const cleared = { q: '', category: '', brand: '', min: '', max: '' };
    setForm(cleared);
    go(cleared);
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); go(form); }}
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_24px_-18px_rgb(6_59_76/0.35)]"
    >
      <div className="bg-linear-to-br from-primary-50 to-white p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search products</span>
          {pending
            ? <Loader2 size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary-600" aria-hidden="true" />
            : <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />}
          <input
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
            placeholder="Search by product, category, or brand…"
            className="h-12 w-full rounded-xl border border-line-strong bg-white pl-11 pr-4 text-[14.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cx(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[13.5px] font-semibold transition-colors',
              open
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-line-strong bg-white text-ink-800 hover:border-primary-300',
            )}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            {open ? 'Hide Filters' : 'Show Filters'}
            {activeCount ? (
              <span className={cx('rounded-full px-1.5 text-[11.5px]', open ? 'bg-white/25' : 'bg-primary-500 text-white')}>
                {activeCount}
              </span>
            ) : null}
          </button>

          {activeCount || values.q ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-danger"
            >
              <X size={14} aria-hidden="true" />
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-surface-muted/60 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field icon={Tag} label="Category">
              <select
                value={form.category}
                onChange={(e) => pick('category', e.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-white px-3 text-[14px] text-ink-900 outline-none focus:border-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{`${c.name} (${c.products})`}</option>
                ))}
              </select>
            </Field>

            <Field icon={Boxes} label="Brand">
              <select
                value={form.brand}
                onChange={(e) => pick('brand', e.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-white px-3 text-[14px] text-ink-900 outline-none focus:border-primary-500"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{`${b.name} (${b.products})`}</option>
                ))}
              </select>
            </Field>

            <Field icon={IndianRupee} label="Min Price">
              <PriceInput value={form.min} onChange={(v) => setForm({ ...form, min: v })} placeholder="Min" />
            </Field>

            <Field icon={IndianRupee} label="Max Price">
              <PriceInput value={form.max} onChange={(v) => setForm({ ...form, max: v })} placeholder="Max" />
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={reset}
              className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-300"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-70"
            >
              {pending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
              Apply filters
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-800">
        <Icon size={15} className="text-primary-600" aria-hidden="true" />
        {label}
      </span>
      {children}
    </label>
  );
}

function PriceInput({ value, onChange, placeholder }) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-400">₹</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        inputMode="numeric"
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line-strong bg-white pl-7 pr-3 text-[14px] text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-500"
      />
    </span>
  );
}

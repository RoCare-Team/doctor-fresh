'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { formatPrice, cx } from '@/lib/utils';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'name', label: 'Name: A to Z' },
];

const PAGE_SIZE = 12;

export default function CategoryProducts({ products = [], subcategories = [], activeSlug = null }) {
  const [sort, setSort] = useState('featured');
  const [maxPrice, setMaxPrice] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const priceBuckets = useMemo(() => {
    const priced = products.filter((p) => p.price > 0).map((p) => p.price);
    if (!priced.length) return [];
    const top = Math.max(...priced);
    return [5000, 10000, 20000, 50000, 100000].filter((b) => b < top).slice(0, 4);
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (maxPrice) list = list.filter((p) => p.price > 0 && p.price <= maxPrice);
    if (inStockOnly) list = list.filter((p) => p.inStock);

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [products, sort, maxPrice, inStockOnly]);

  const hasFilters = Boolean(maxPrice) || inStockOnly;

  function clearFilters() {
    setMaxPrice(null);
    setInStockOnly(false);
    setVisible(PAGE_SIZE);
  }

  // Names the filter that is responsible, so it is obvious what to relax.
  const reasons = [
    maxPrice ? `nothing here is under ${formatPrice(maxPrice)}` : null,
    inStockOnly ? 'nothing is in stock right now' : null,
  ].filter(Boolean).join(', and ');
  const clearedMessage = reasons
    ? `${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}. Try widening your filters.`
    : 'Try widening your filters.';

  /* ------------------------------------------------------------- sidebar */

  // Each option is a padded row rather than a bare line of text. Several
  // category names wrap onto two lines, and with only a small margin between
  // items a wrapped name ran into the next one.
  const ROW = 'block rounded-md px-2 py-[7px] text-[14px] leading-[1.45] transition-colors';

  const filterControls = (
    <div className="divide-y divide-line">
      {subcategories.length ? (
        <div className="py-5">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
            Category
          </h2>
          <ul className="-mx-2 space-y-px">
            {subcategories.map((s) => {
              const isActive = s.slug === activeSlug;
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      ROW,
                      isActive
                        ? 'bg-primary-50 font-semibold text-primary-800'
                        : 'text-ink-500 hover:bg-surface-muted hover:text-primary-700',
                    )}
                  >
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {priceBuckets.length ? (
        <div className="py-5">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
            Price
          </h2>
          <ul className="-mx-2 space-y-px">
            {priceBuckets.map((b) => (
              <li key={b}>
                <label
                  className={cx(
                    ROW,
                    'flex cursor-pointer items-center gap-2.5 text-ink-500 hover:bg-surface-muted hover:text-primary-700',
                    'has-checked:bg-primary-50 has-checked:font-semibold has-checked:text-primary-800',
                  )}
                >
                  <input
                    type="radio"
                    name="price"
                    checked={maxPrice === b}
                    onChange={() => { setMaxPrice(b); setVisible(PAGE_SIZE); }}
                    className="accent-primary-500"
                  />
                  Under {formatPrice(b)}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="py-5">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-400">
          Availability
        </h2>
        <div className="-mx-2">
          <label
            className={cx(
              ROW,
              'flex cursor-pointer items-center gap-2.5 text-ink-500 hover:bg-surface-muted hover:text-primary-700',
              'has-checked:bg-primary-50 has-checked:font-semibold has-checked:text-primary-800',
            )}
          >
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => { setInStockOnly(e.target.checked); setVisible(PAGE_SIZE); }}
              className="accent-primary-500"
            />
            In stock only
          </label>
        </div>
      </div>

      {hasFilters ? (
        <div className="py-5">
          <button
            type="button"
            onClick={clearFilters}
            className="text-[14px] font-medium text-primary-600 transition-colors hover:text-primary-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );

  if (!products.length) {
    return (
      <EmptyState
        title="Nothing listed here yet"
        message="Products in this category are available on request — tell us what you need and we will quote it."
      >
        <Button href="/contact">Request a quotation</Button>
        <Button href="tel:9311587716" variant="outline">Call +91-9311587716</Button>
      </EmptyState>
    );
  }

  return (
    <div>
      {/* ------------------------------------------------------ results bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <p className="text-[14px] text-ink-500">
          1-<span className="font-semibold text-ink-900">{Math.min(visible, filtered.length)}</span> of{' '}
          <span className="font-semibold text-ink-900">{filtered.length}</span> results
        </p>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={cx(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[14px] font-medium transition-colors lg:hidden',
              hasFilters
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-line-strong bg-white text-ink-700 hover:border-primary-500',
            )}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters
          </button>

          <label className="hidden text-[14px] text-ink-500 sm:block" htmlFor="sort">
            Sort by:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-lg border border-line-strong bg-white px-3 text-[14px] font-medium text-ink-900 outline-none transition-colors hover:border-primary-500 focus:border-primary-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ----------------------------------------------- sidebar + results */}
      <div className="grid gap-7 lg:grid-cols-[232px_1fr] lg:gap-9">
        {/* On desktop the filters are their own panel, lifted off the page so
            they read as a control surface rather than loose links. In the
            mobile sheet they already sit on white, so the card is not repeated. */}
        <aside className="hidden lg:block">
          <div className="sticky top-[138px] rounded-[14px] border border-line bg-white px-4 shadow-[0_4px_16px_-10px_rgb(6_59_76_/_0.28)]">
            {filterControls}
          </div>
        </aside>

        <div>
          {filtered.length ? (
            <ProductGrid products={filtered.slice(0, visible)} />
          ) : (
            <EmptyState
              title="No products match these filters"
              message={clearedMessage}
            >
              <Button type="button" onClick={clearFilters}>Clear filters</Button>
            </EmptyState>
          )}

          {visible < filtered.length ? (
            <div className="mt-8 flex justify-center">
              <Button type="button" variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Load more products
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* --------------------------------------------------- mobile filters */}
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close" className="p-1 text-ink-400">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {filterControls}
            <Button type="button" full size="lg" className="mt-6" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} products
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

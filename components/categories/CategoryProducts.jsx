'use client';

import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductGrid from '@/components/products/ProductGrid';
import Button from '@/components/common/Button';
import { formatPrice, cx } from '@/lib/utils';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'name', label: 'Name: A to Z' },
];

const PAGE_SIZE = 12;

export default function CategoryProducts({ products = [] }) {
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

  const filterControls = (
    <div className="space-y-5">
      {priceBuckets.length ? (
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-ink-900">Price</h3>
          <ul className="space-y-1.5">
            {priceBuckets.map((b) => (
              <li key={b}>
                <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-500">
                  <input
                    type="radio"
                    name="price"
                    checked={maxPrice === b}
                    onChange={() => { setMaxPrice(b); setVisible(PAGE_SIZE); }}
                    className="accent-primary-600"
                  />
                  Under {formatPrice(b)}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-[14px] font-semibold text-ink-900">Availability</h3>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-500">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => { setInStockOnly(e.target.checked); setVisible(PAGE_SIZE); }}
            className="accent-primary-600"
          />
          In stock only
        </label>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => { setMaxPrice(null); setInStockOnly(false); setVisible(PAGE_SIZE); }}
          className="text-[14px] font-medium text-primary-700 hover:text-primary-800"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );

  if (!products.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-muted px-6 py-12 text-center">
        <p className="text-sm text-ink-500">
          Products in this category are available on request.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button href="/contact">Request a quotation</Button>
          <Button href="tel:9311587716" variant="outline">Call +91-9311587716</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-[178px]">{filterControls}</div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-400">
            Showing <span className="font-medium text-ink-700">{Math.min(visible, filtered.length)}</span> of{' '}
            <span className="font-medium text-ink-700">{filtered.length}</span> products
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[14px] lg:hidden',
                hasFilters ? 'border-primary-500 text-primary-700' : 'border-line-strong text-ink-500',
              )}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              Filters
            </button>

            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink-700 outline-none focus:border-primary-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <ProductGrid products={filtered.slice(0, visible)} columns={4} />

        {visible < filtered.length ? (
          <div className="mt-8 flex justify-center">
            <Button type="button" variant="outline" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Load more products
            </Button>
          </div>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
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

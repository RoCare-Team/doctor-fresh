'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  SlidersHorizontal, X, ChevronDown, ChevronLeft, Search, Star, Check,
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ProductGrid from '@/components/products/ProductGrid';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { formatPrice, cx } from '@/lib/utils';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price — low to high' },
  { value: 'price-desc', label: 'Price — high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'name', label: 'Name A–Z' },
];

const PAGE_SIZE = 12;

const RATINGS = [4, 3];

// Above this many, a list is worth searching rather than scrolling.
const SEARCHABLE_FROM = 8;

/**
 * 38,400 → 40,000; 2,310 → 2,500; 2,90,000 → 3,00,000.
 *
 * A price step is read, not calculated, so it is rounded up to the nearest
 * half or fifth of its own size — which is how people say prices anyway.
 */
function roundUpNicely(value) {
  if (!(value > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const leading = value / magnitude;
  const step = leading >= 5 ? magnitude : leading >= 2 ? magnitude / 2 : magnitude / 5;
  return Math.ceil(value / step) * step;
}

/**
 * One section of the filter panel, with its own open/closed state.
 *
 * Shops put filters in labelled, collapsible blocks because a long category
 * list otherwise pushes price and rating off the screen. The heading is the
 * button, so the whole row is a hit target.
 */
function FilterGroup({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">
          {title}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cx('shrink-0 text-ink-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

/** A box that is checked, drawn rather than left to the browser. */
function Box({ checked, round = false }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex h-[17px] w-[17px] shrink-0 items-center justify-center border transition-colors',
        round ? 'rounded-full' : 'rounded-[3px]',
        checked ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong bg-white',
      )}
    >
      {checked
        ? (round
          ? <span className="h-[7px] w-[7px] rounded-full bg-white" />
          : <Check size={12} strokeWidth={3.5} />)
        : null}
    </span>
  );
}

/** One tickable line: a box, its label, and how many products it would leave. */
function Option({
  type = 'checkbox', name, checked, onChange, count, children,
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-[7px] text-[13.5px] leading-[1.45] transition-colors',
        checked ? 'font-semibold text-ink-900' : 'text-ink-600 hover:bg-surface-muted',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <Box checked={checked} round={type === 'radio'} />
      <span className="min-w-0 flex-1">{children}</span>
      {count === undefined ? null : (
        <span className="shrink-0 text-[12px] font-normal tabular-nums text-ink-300">{count}</span>
      )}
    </label>
  );
}

/** A filter that is on, listed under the heading so it can be taken off. */
function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-[3px] bg-surface-muted py-1 pl-1.5 pr-2.5 text-[12.5px] font-medium text-ink-700">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${children}`}
        className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-900 hover:text-white"
      >
        <X size={11} strokeWidth={3} aria-hidden="true" />
      </button>
      <span className="truncate uppercase tracking-[0.02em]">{children}</span>
    </span>
  );
}

/** The small search box that sits above a long list of options. */
function ListSearch({ label, value, onChange }) {
  return (
    <div className="relative mb-1.5">
      <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-8 w-full rounded-[3px] border border-line bg-surface-muted pl-7 pr-2 text-[13px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-400 focus:bg-white"
      />
    </div>
  );
}

export default function CategoryProducts({
  products = [], subcategories = [], activeSlug = null, trail = [], activeName = '', heading = '',
  breadcrumb = [],
}) {
  const [sort, setSort] = useState('featured');
  const [band, setBand] = useState(null);
  const [minRating, setMinRating] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catQuery, setCatQuery] = useState('');

  /*
   * The price steps are read off this page's own products rather than being
   * one fixed ladder for the whole site: a jug category runs from ₹776 to
   * ₹60,000 and an RO plant category from ₹38,000 to ₹3,00,000, and a
   * "Under ₹5,000" on the second one matches nothing at all.
   *
   * The cuts are taken at quarters of the sorted list, so each step has
   * products behind it, and then rounded up to a figure somebody would
   * actually say out loud.
   */
  const priceBands = useMemo(() => {
    const priced = products.filter((p) => p.price > 0).map((p) => p.price).sort((a, b) => a - b);
    if (priced.length < 3) return [];

    const low = priced[0];
    const high = priced[priced.length - 1];
    if (high <= low) return [];

    // Three cuts at thirds of the sorted list make four bands that each hold
    // roughly a quarter of the catalogue, whatever it costs.
    const cuts = [...new Set([0.25, 0.5, 0.75]
      .map((q) => priced[Math.min(priced.length - 1, Math.floor(q * priced.length))])
      .map(roundUpNicely)
      .filter((c) => c > low && c <= high))].sort((a, b) => a - b);

    if (!cuts.length) return [];

    const edges = [null, ...cuts, null];
    const bands = [];
    for (let i = 0; i < edges.length - 1; i += 1) {
      const min = edges[i];
      const max = edges[i + 1];
      const label = min === null ? `Under ${formatPrice(max)}`
        : max === null ? `${formatPrice(min)} & above`
          : `${formatPrice(min)} – ${formatPrice(max)}`;
      const count = products.filter((p) => p.price > 0
        && (min === null || p.price >= min)
        && (max === null || p.price < max)).length;
      // A band nothing falls into is a line that can only disappoint.
      if (count) bands.push({ key: `${min || 0}-${max || 0}`, min, max, label, count });
    }
    return bands;
  }, [products]);

  // How many products each option would leave, counted over the whole
  // category so the numbers do not jump about as other filters are ticked.
  const counts = useMemo(() => ({
    rated: (r) => products.filter((p) => (p.rating || 0) >= r).length,
    inStock: products.filter((p) => p.inStock).length,
  }), [products]);

  const ratingOptions = useMemo(
    () => RATINGS.filter((r) => counts.rated(r) > 0 && counts.rated(r) < products.length),
    [counts, products.length],
  );

  const shownCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter((s) => s.name.toLowerCase().includes(q));
  }, [subcategories, catQuery]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (band) {
      list = list.filter((p) => p.price > 0
        && (band.min === null || p.price >= band.min)
        && (band.max === null || p.price < band.max));
    }
    if (minRating) list = list.filter((p) => (p.rating || 0) >= minRating);
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
  }, [products, sort, band, minRating, inStockOnly]);

  // Picking a filter always sends the reader back to the first page.
  const pick = (set) => (value) => { set(value); setVisible(PAGE_SIZE); };

  const applied = [
    band ? { key: 'price', label: band.label, remove: () => pick(setBand)(null) } : null,
    minRating ? { key: 'rating', label: `${minRating}★ & above`, remove: () => pick(setMinRating)(null) } : null,
    inStockOnly ? { key: 'stock', label: 'In stock only', remove: () => pick(setInStockOnly)(false) } : null,
  ].filter(Boolean);

  const hasFilters = applied.length > 0;

  function clearFilters() {
    setBand(null);
    setMinRating(null);
    setInStockOnly(false);
    setVisible(PAGE_SIZE);
  }

  // Names the filter that is responsible, so it is obvious what to relax.
  const reasons = [
    band ? `nothing here is priced ${band.label.toLowerCase()}` : null,
    minRating ? `nothing is rated ${minRating} stars or more` : null,
    inStockOnly ? 'nothing is in stock right now' : null,
  ].filter(Boolean).join(', and ');
  const clearedMessage = reasons
    ? `${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}. Try widening your filters.`
    : 'Try widening your filters.';

  /* ------------------------------------------------------------- sidebar */

  const filterControls = (
    <>
      {/* The panel says what it is, what is on, and how to undo it. */}
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-900">
            <SlidersHorizontal size={15} aria-hidden="true" className="text-ink-400" />
            Filters
          </span>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] font-semibold uppercase tracking-[0.04em] text-primary-600 transition-colors hover:text-primary-800"
            >
              Clear all
            </button>
          ) : null}
        </div>

        {hasFilters ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {applied.map((a) => (
              <Chip key={a.key} onRemove={a.remove}>{a.label}</Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* Where you are, and where else you can go — the trail above, the
          current page in bold, and its neighbours listed below it. */}
      {trail.length || subcategories.length ? (
        <div className="border-b border-line px-4 py-3.5">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-500">
            Categories
          </p>

          {trail.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="-ml-1 flex items-center gap-1 rounded-md px-1 py-1 text-[13.5px] text-ink-500 transition-colors hover:text-primary-700"
            >
              <ChevronLeft size={14} aria-hidden="true" className="shrink-0 text-ink-300" />
              {t.name}
            </Link>
          ))}

          {activeName ? (
            <p className="px-1 py-1 text-[14px] font-semibold text-ink-900">{activeName}</p>
          ) : null}

          {subcategories.length ? (
            <div className="mt-2">
              {subcategories.length >= SEARCHABLE_FROM ? (
                <ListSearch label="Search category" value={catQuery} onChange={setCatQuery} />
              ) : null}

              {/* Each option is a padded row rather than a bare line of text:
                  several names wrap onto two lines, and with only a small
                  margin a wrapped name ran into the next one. */}
              <ul className="-mx-1 max-h-[260px] space-y-px overflow-y-auto pr-1">
                {shownCategories.map((s) => {
                  const isActive = s.slug === activeSlug;
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cx(
                          'flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13.5px] leading-[1.45] transition-colors',
                          isActive
                            ? 'bg-primary-50 font-semibold text-primary-800'
                            : 'text-ink-600 hover:bg-surface-muted hover:text-primary-700',
                        )}
                      >
                        <Box checked={isActive} />
                        <span className="min-w-0 flex-1">{s.name}</span>
                      </Link>
                    </li>
                  );
                })}
                {shownCategories.length ? null : (
                  <li className="px-1 py-1.5 text-[13px] text-ink-300">No category by that name.</li>
                )}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {priceBands.length ? (
        <FilterGroup title="Price">
          <ul className="-mx-2 space-y-px">
            {priceBands.map((b) => (
              <li key={b.key}>
                <Option
                  type="radio"
                  name="price"
                  checked={band?.key === b.key}
                  onChange={() => pick(setBand)(b)}
                  count={b.count}
                >
                  {b.label}
                </Option>
              </li>
            ))}
            {band ? (
              <li>
                <Option
                  type="radio"
                  name="price"
                  checked={false}
                  onChange={() => pick(setBand)(null)}
                  count={products.length}
                >
                  Any price
                </Option>
              </li>
            ) : null}
          </ul>
        </FilterGroup>
      ) : null}

      {ratingOptions.length ? (
        <FilterGroup title="Customer rating">
          <ul className="-mx-2 space-y-px">
            {ratingOptions.map((r) => (
              <li key={r}>
                <Option
                  type="radio"
                  name="rating"
                  checked={minRating === r}
                  onChange={() => pick(setMinRating)(minRating === r ? null : r)}
                  count={counts.rated(r)}
                >
                  <span className="inline-flex items-center gap-1">
                    {r}
                    <Star size={12} fill="currentColor" strokeWidth={0} className="text-[#f0a202]" aria-hidden="true" />
                    &amp; above
                  </span>
                </Option>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title="Sort by">
        <ul className="-mx-2 space-y-px">
          {SORTS.map((s) => (
            <li key={s.value}>
              <Option
                type="radio"
                name="sort"
                checked={sort === s.value}
                onChange={() => { setSort(s.value); setVisible(PAGE_SIZE); }}
              >
                {s.label}
              </Option>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="-mx-2">
          <Option
            checked={inStockOnly}
            onChange={(e) => pick(setInStockOnly)(e.target.checked)}
            count={counts.inStock}
          >
            In stock only
          </Option>
        </div>
      </FilterGroup>
    </>
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
      {/* ----------------------------------------------- sidebar + results */}
      <div className="grid gap-5 lg:grid-cols-[250px_1fr] lg:gap-5">
        {/* On desktop the filters are their own panel, lifted off the page so
            they read as a control surface rather than loose links. In the
            mobile sheet they already sit on white, so the card is not repeated. */}
        <aside className="hidden lg:block">
          <div className="sticky top-[122px] bg-white shadow-[0_1px_3px_rgb(15_23_42/0.08),8px_0_20px_-10px_rgb(15_23_42/0.22),0_10px_28px_-16px_rgb(15_23_42/0.28)]">
            {filterControls}
          </div>
        </aside>

        <div className="min-w-0 bg-white p-4 shadow-[0_1px_3px_rgb(15_23_42/0.08),-8px_0_20px_-10px_rgb(15_23_42/0.22),0_10px_28px_-16px_rgb(15_23_42/0.28)] sm:p-5">
          {breadcrumb.length ? (
            <div className="mb-2.5 border-b border-line pb-2">
              <Breadcrumb items={breadcrumb} />
            </div>
          ) : null}

          {/* --------------------------------------------- heading and sorts */}
          {heading ? (
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-line pb-2.5 max-lg:mb-2 max-lg:border-b-0 max-lg:pb-0">
              <h1 className="text-[18px] font-semibold leading-snug tracking-tight text-ink-900 md:text-[20px]">
                {heading}
              </h1>
              <p className="text-[13px] text-ink-400">
                (Showing 1 &ndash; {Math.min(visible, filtered.length)} products of {filtered.length} products)
              </p>
            </div>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-2 lg:hidden">
            <span className="text-[13.5px] text-ink-500">
              Sorted by <span className="font-semibold text-ink-900">{SORTS.find((s) => s.value === sort)?.label}</span>
            </span>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={cx(
                'my-1 inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[14px] font-medium transition-colors lg:hidden',
                hasFilters
                  ? 'border-primary-500 bg-primary-50 text-primary-800'
                  : 'border-line-strong bg-white text-ink-700 hover:border-primary-500',
              )}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              Filters
              {applied.length ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-semibold text-white">
                  {applied.length}
                </span>
              ) : null}
            </button>
          </div>

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
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-5">
            {/* the sheet's own close button sits above the panel's heading */}
            <div className="sticky top-0 flex justify-end bg-white px-5 pt-3">
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close" className="p-1 text-ink-400">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {filterControls}
            <Button type="button" full size="lg" className="mt-6 !w-[calc(100%-2.5rem)] mx-5" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} products
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

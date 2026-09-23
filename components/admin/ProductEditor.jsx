'use client';

import { useState } from 'react';
import { cx } from '@/lib/utils';
import ProductForm from '@/components/admin/ProductForm';
import ProductImages from '@/components/admin/ProductImages';
import ProductDetails from '@/components/admin/ProductDetails';
import ProductHighlights from '@/components/admin/ProductHighlights';

/**
 * The product editor, split so each screen is short enough to work through.
 *
 * "Details" is where the page's depth comes from — description, specification
 * table and FAQ — and the count beside each tab says at a glance what a product
 * is still missing.
 */
// Photos close the Details screen rather than taking a tab of their own, so
// everything below the basics is worked through on one page, top to bottom.
const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'details', label: 'Details & Images' },
  { id: 'highlights', label: 'Highlights' },
];

export default function ProductEditor({ product, categories, attributes = [] }) {
  const [tab, setTab] = useState('basics');

  const missing = {
    details: !product.descriptionHtml && !product.specs?.length && !product.faqs?.length,
    highlights: !product.attributeValueIds?.length,
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Product editor"
        className="mb-5 flex gap-1 border-b border-line"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'relative px-4 py-2.5 text-[14.5px] font-medium transition-colors',
              tab === t.id ? 'text-primary-700' : 'text-ink-400 hover:text-ink-700',
            )}
          >
            {t.label}
            {missing[t.id] ? (
              <span
                title="Nothing entered yet"
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle"
              />
            ) : null}
            {tab === t.id ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary-500" />
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'basics' ? <ProductForm product={product} categories={categories} /> : null}
      {tab === 'highlights' ? (
        <ProductHighlights product={product} attributes={attributes} />
      ) : null}
      {tab === 'details' ? (
        // Photos sit above the save button but outside the details form (see ProductDetails).
        <ProductDetails product={product}>
          <div className="mt-6">
            <ProductImages productId={product.id} />
          </div>
        </ProductDetails>
      ) : null}
    </>
  );
}

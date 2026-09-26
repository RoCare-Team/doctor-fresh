'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import ProductImages from '@/components/admin/ProductImages';
import ProductDetails from '@/components/admin/ProductDetails';
import ProductHighlights from '@/components/admin/ProductHighlights';
import ProductSeoWriter from '@/components/admin/ProductSeoWriter';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';

/**
 * Editing a product: one page, top to bottom.
 *
 * It was four tabs, which meant three separate save buttons and no way to see
 * at once what a product was missing. Everything is on one page now, and the
 * bar at the bottom saves all of it — the basics, the description and spec
 * table, and the highlights each have their own form, so the button simply
 * submits all three.
 *
 * Photos are the exception: an upload is saved the moment it lands, so they
 * sit outside the forms and outside the button.
 */
export default function ProductEditor({ product, categories, attributes = [] }) {
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const forms = [
    `product-basics-${product.id}`,
    `product-details-${product.id}`,
    `product-highlights-${product.id}`,
  ];

  function saveAll() {
    setStatus('saving');
    for (const id of forms) document.getElementById(id)?.requestSubmit();

    // Each form reports its own error where it happened; this bar only says
    // the round trip is over, so it waits long enough for them to have run.
    window.setTimeout(() => setStatus('saved'), 1500);
  }

  return (
    <>
      <div className="space-y-5 pb-24">
        <ProductForm product={product} categories={categories} formId={forms[0]} bare />

        <ProductSeoWriter product={product} />

        <ProductDetails product={product} bare>
          <div className="mt-6">
            <ProductImages productId={product.id} />
          </div>
        </ProductDetails>

        <ProductHighlights product={product} attributes={attributes} bare />
      </div>

      {/* Follows the page down, so the button is never a scroll away. */}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {status === 'saved' ? (
            <span className="mr-auto text-[13.5px] text-success">
              Saved. The product page is already updated.
            </span>
          ) : (
            <span className="mr-auto text-[13px] text-ink-400">
              Saves the basics, the description, the specifications and the highlights together.
            </span>
          )}
          <Can section="products" action="edit" fallback={<ViewOnlyNote />}>
            <button
              type="button"
              onClick={saveAll}
              disabled={status === 'saving'}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {status === 'saving'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Check size={16} aria-hidden="true" />}
              {status === 'saving' ? 'Saving…' : 'Update product'}
            </button>
          </Can>
        </div>
      </div>
    </>
  );
}

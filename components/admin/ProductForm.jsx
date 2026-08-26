'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { formatPrice } from '@/lib/utils';

/**
 * Editing a product.
 *
 * Only the fields shown here are written; everything else on the row — images,
 * attributes, specifications, the description tabs — is left exactly as the
 * PHP admin panel set it.
 */
export default function ProductForm({ product, categories }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  // Shown live so the discount is obvious before saving.
  const [salePrice, setSalePrice] = useState(product.salePrice);
  const [discount, setDiscount] = useState(product.discount);
  const [discountType, setDiscountType] = useState(product.discountType);

  const final = (() => {
    const base = Number(salePrice) || 0;
    const off = Number(discount) || 0;
    if (!base || off <= 0) return base;
    return Math.round((discountType === 'percent' ? base - (base * off) / 100 : base - off) * 100) / 100;
  })();

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          ...values,
          live: form.get('live') === 'on',
          featured: form.get('featured') === 'on',
          deal: form.get('deal') === 'on',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save the product.');

      setStatus('done');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Details</h2>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Input label="Product name" name="title" defaultValue={product.name} required maxLength={500} className="sm:col-span-2" />
          <Select
            label="Category"
            name="categoryId"
            defaultValue={String(product.categoryId)}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select category"
          />
          <Input label="Unit" name="unit" defaultValue={product.unit} placeholder="Pc" maxLength={50} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Price &amp; stock</h2>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Sale price (₹)"
            name="salePrice"
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
          <Input
            label="Discount"
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Select
            label="Discount type"
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            options={[{ value: 'percent', label: 'Percent (%)' }, { value: 'rupee', label: 'Rupees (₹)' }]}
          />
          <Input label="Stock" name="stock" type="number" min="0" defaultValue={product.stock} />
        </div>

        <p className="mt-3 text-[13.5px] text-ink-500">
          Customers will see{' '}
          <strong className="font-semibold text-ink-900">{final ? formatPrice(final) : 'Price on request'}</strong>
          {final && Number(salePrice) > final ? (
            <> — down from <span className="line-through">{formatPrice(Number(salePrice))}</span></>
          ) : null}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Visibility</h2>
        <div className="mt-3 space-y-2.5">
          <Toggle name="live" label="Live on the site" hint="Hidden products stay reachable by direct link, as they do today." defaultChecked={product.live} />
          <Toggle name="featured" label="Featured" hint="Shows in the Featured Products rail on the home page." defaultChecked={product.featured} />
          <Toggle name="deal" label="Today’s Deal" hint="Shows in the Today’s Deal banner." defaultChecked={product.deal} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Search listing</h2>
        <div className="mt-4 grid gap-3.5">
          <Input label="Meta title" name="metaTitle" defaultValue={product.metaTitle} maxLength={255} />
          <Textarea label="Meta description" name="metaDescription" rows={2} defaultValue={product.metaDescription} maxLength={255} />
          <Input label="Keywords" name="keywords" defaultValue={product.keywords} maxLength={1000} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save product'}
        </Button>
        {status === 'done' ? <span className="text-[14px] text-success">Saved</span> : null}
      </div>

      {status === 'error' ? <FormNote status="error" error={error} /> : null}
    </form>
  );
}

function Toggle({ name, label, hint, defaultChecked }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong px-3.5 py-3 transition-colors has-checked:border-primary-500 has-checked:bg-primary-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 accent-primary-600" />
      <span>
        <span className="block text-[14px] font-medium text-ink-900">{label}</span>
        <span className="mt-0.5 block text-[12.5px] text-ink-400">{hint}</span>
      </span>
    </label>
  );
}

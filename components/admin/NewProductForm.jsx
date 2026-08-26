'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { formatPrice, cx } from '@/lib/utils';

/**
 * Creating a product.
 *
 * Everything the storefront needs to show and sell it is here; the rest of the
 * row is filled with the same defaults the old panel writes. Photos come after
 * the product exists, because they are stored against its id.
 */
export default function NewProductForm({ categories, subcategories }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState('');
  const [picked, setPicked] = useState([]);
  const [salePrice, setSalePrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const options = useMemo(
    () => subcategories.filter((s) => String(s.categoryId) === String(categoryId)),
    [subcategories, categoryId],
  );

  const final = (() => {
    const base = Number(salePrice) || 0;
    const off = Number(discount) || 0;
    if (!base || off <= 0) return base;
    return Math.round((discountType === 'percent' ? base - (base * off) / 100 : base - off) * 100) / 100;
  })();

  async function create(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          subCategoryIds: picked.join(','),
          live: values.live === 'on',
          featured: values.featured === 'on',
          deal: values.deal === 'on',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create the product.');

      // Straight to the edit screen, where the photos are added.
      router.push(`/admin/products/${data.id}`);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const toggle = (id) => setPicked((current) => (
    current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  ));

  return (
    <form onSubmit={create} className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Details</h2>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Input label="Product name" name="title" required maxLength={500} placeholder="Doctor Fresh …" className="sm:col-span-2" />
          <Select
            label="Category"
            name="categoryId"
            required
            placeholder="Select category"
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPicked([]); }}
          />
          <Input label="Unit" name="unit" defaultValue="Pc" maxLength={50} />
        </div>

        {categoryId ? (
          <div className="mt-4">
            <span className="mb-2 block text-[14px] font-medium text-ink-700">
              Subcategories
              <span className="ml-1.5 font-normal text-ink-400">
                (the listings this product appears in)
              </span>
            </span>
            {options.length ? (
              <div className="flex flex-wrap gap-2">
                {options.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cx(
                      'rounded-lg border px-3 py-1.5 text-[13.5px] transition-colors',
                      picked.includes(s.id)
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-line-strong text-ink-700 hover:border-primary-300',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-400">This category has no subcategories.</p>
            )}
          </div>
        ) : null}
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
            placeholder="0"
          />
          <Input
            label="Discount"
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
          <Select
            label="Discount type"
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            options={[{ value: 'percent', label: 'Percent (%)' }, { value: 'rupee', label: 'Rupees (₹)' }]}
          />
          <Input label="Stock" name="stock" type="number" min="0" defaultValue="0" />
        </div>

        <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
          <Input label="GST (%)" name="tax" type="number" min="0" max="100" defaultValue="18" />
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
        <h2 className="text-[15px] font-semibold text-ink-900">Description &amp; listing</h2>
        <div className="mt-4 grid gap-3.5">
          <Textarea
            label="Description (HTML)"
            name="descriptionHtml"
            rows={6}
            placeholder="<p>What this product does…</p>"
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
          <Input label="Meta title" name="metaTitle" maxLength={255} placeholder="Left blank, the product name is used" />
          <Textarea label="Meta description" name="metaDescription" rows={2} maxLength={255} />
          <Input label="Keywords" name="keywords" maxLength={1000} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Visibility</h2>
        <div className="mt-3 space-y-2.5">
          <Toggle name="live" label="Live on the site" hint="Turn off to prepare it before it goes on sale." defaultChecked />
          <Toggle name="featured" label="Featured" hint="Shows in the Featured Products rail on the home page." />
          <Toggle name="deal" label="Today’s Deal" hint="Shows in the Today’s Deal banner." />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating…' : 'Create product'}
        </Button>
        <span className="text-[13.5px] text-ink-400">Photos are added next.</span>
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

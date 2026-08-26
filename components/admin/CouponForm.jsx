'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Input, Select, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/** Creating a coupon. Discounts apply to the whole basket, as the PHP one does. */
export default function CouponForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function create(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create the coupon.');

      setStatus('idle');
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        New coupon
      </Button>
    );
  }

  return (
    <form onSubmit={create} className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-ink-900">New coupon</h2>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <Input label="Code" name="code" required maxLength={100} placeholder="SUMMER10" />
        <Input label="Title" name="title" maxLength={255} placeholder="Summer offer" />
        <Select
          label="Discount type"
          name="type"
          defaultValue="percent"
          options={[{ value: 'percent', label: 'Percent (%)' }, { value: 'amount', label: 'Rupees (₹)' }]}
        />
        <Input label="Value" name="value" type="number" min="1" step="0.01" required />
        <Input label="Valid till" name="till" type="date" required className="sm:col-span-2" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating…' : 'Create coupon'}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-[14px] text-ink-500 hover:text-ink-900">
          Cancel
        </button>
      </div>

      {status === 'error' ? <div className="mt-3"><FormNote status="error" error={error} /></div> : null}
    </form>
  );
}

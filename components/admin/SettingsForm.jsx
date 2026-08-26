'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/** Editing the settings rows the storefront reads. */
export default function SettingsForm({ fields, values }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save the settings.');

      setStatus('done');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-line bg-white p-5">
      <div className="grid gap-3.5">
        {fields.map((f) => (f.long ? (
          <Textarea key={f.key} label={f.label} name={f.key} rows={3} defaultValue={values[f.key] || ''} />
        ) : (
          <Input key={f.key} label={f.label} name={f.key} defaultValue={values[f.key] || ''} />
        )))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </Button>
        {status === 'done' ? <span className="text-[14px] text-success">Saved</span> : null}
      </div>

      {status === 'error' ? <div className="mt-3"><FormNote status="error" error={error} /></div> : null}
    </form>
  );
}

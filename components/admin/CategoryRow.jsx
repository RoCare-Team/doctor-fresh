'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** One category row that expands into an inline edit form. */
export default function CategoryRow({ category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, ...values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = 'h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-primary-500';

  if (open) {
    return (
      <tr>
        <td colSpan={4} className="bg-surface-muted px-4 py-4">
          <form onSubmit={save} className="grid gap-3">
            <label>
              <span className="mb-1 block text-[13px] font-medium text-ink-700">Name</span>
              <input name="name" defaultValue={category.name} required maxLength={255} className={field} />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-medium text-ink-700">Meta title</span>
              <input name="metaTitle" defaultValue={category.metaTitle} maxLength={255} className={field} />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-medium text-ink-700">Meta description</span>
              <textarea
                name="metaDescription"
                rows={2}
                defaultValue={category.metaDescription}
                maxLength={255}
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-primary-500"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary-500 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-primary-900 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-[14px] text-ink-500 hover:text-ink-900">
                Cancel
              </button>
              {error ? <span className="text-[13px] text-danger">{error}</span> : null}
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="transition-colors hover:bg-surface-muted">
      <td className="px-4 py-3">
        <span className="font-medium text-ink-900">{category.name}</span>
        {category.metaTitle ? (
          <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-400">{category.metaTitle}</span>
        ) : null}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <Link
          href={`/category/${category.slug}`}
          target="_blank"
          className="text-[13.5px] text-primary-700 hover:text-primary-800"
        >
          /{category.slug}
        </Link>
      </td>
      <td className="px-4 py-3 text-ink-500">{category.products}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13.5px] font-medium text-primary-700 hover:text-primary-800"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

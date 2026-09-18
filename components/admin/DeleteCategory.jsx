'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Trash2, X, Loader2, AlertTriangle, Lock,
} from 'lucide-react';

/**
 * The danger zone at the foot of a category or subcategory editor. Only an
 * empty page can be deleted (`blocked` says why not); the old address can be
 * sent on with a 301 so links and Google results do not end on a 404.
 */
export default function DeleteCategory({
  kind = 'category', id, name, path, blocked = '', redirectDefault = '/all-category', afterHref = '/admin/categories', endpoint = '',
}) {
  const isSub = kind === 'subcategory';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [redirect, setRedirect] = useState(true);
  const [target, setTarget] = useState(redirectDefault);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && status !== 'deleting') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, status]);

  const confirmed = typed.trim().toLowerCase() === name.trim().toLowerCase();

  async function remove() {
    if (!confirmed) return;
    setStatus('deleting');
    setError('');
    try {
      const res = await fetch(endpoint || (isSub ? '/api/admin/subcategories' : '/api/admin/categories'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, redirectTo: redirect ? target : '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not delete it.');
      router.push(afterHref);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  return (
    <section className="rounded-2xl border border-danger/25 bg-danger/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-danger">{`Delete this ${kind}`}</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-500">
            {blocked || `Removes ${path} from the website and the PHP panel. This cannot be undone.`}
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(blocked)}
          onClick={() => { setTyped(''); setError(''); setRedirect(true); setTarget(redirectDefault); setOpen(true); }}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-danger/40 bg-white px-4 text-[14px] font-semibold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-300 disabled:hover:bg-white"
        >
          {blocked ? <Lock size={15} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
          {`Delete ${kind}`}
        </button>
      </div>

      {open ? createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" aria-label="Close" onClick={() => status !== 'deleting' && setOpen(false)} className="absolute inset-0 bg-ink-900/55" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-cat-title"
            className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            style={{ animation: 'df-fade-in 0.2s ease-out' }}
          >
            <div className="flex items-start gap-3 px-5 pt-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertTriangle size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="del-cat-title" className="text-[17px] font-semibold text-ink-900">{`Delete “${name}”?`}</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">
                  {`The page ${path} will stop existing. Its content and FAQs are deleted with it.`}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-line bg-surface-muted/50 p-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-ink-700">
                  <input type="checkbox" checked={redirect} onChange={(e) => setRedirect(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-500" />
                  <span>
                    <span className="font-medium text-ink-900">Redirect the old address (301)</span>
                    <span className="block text-[12.5px] text-ink-400">Visitors and Google are sent here instead of a 404 page.</span>
                  </span>
                </label>
                {redirect ? (
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="mt-2.5 h-10 w-full rounded-lg border border-line-strong bg-white px-3 font-mono text-[13px] outline-none focus:border-primary-500"
                  />
                ) : null}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[13.5px] text-ink-700">
                  {'Type '}
                  <span className="font-semibold text-ink-900">{name}</span>
                  {' to confirm'}
                </span>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); remove(); } }}
                  className="h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] outline-none focus:border-danger"
                />
              </label>

              {error ? (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} disabled={status === 'deleting'} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={!confirmed || status === 'deleting'}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-danger px-5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-40"
              >
                {status === 'deleting' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                {status === 'deleting' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}

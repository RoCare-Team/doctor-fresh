'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Loader2, AlertTriangle, FilePlus2,
} from 'lucide-react';
import { cx } from '@/lib/utils';
import { Can } from '@/components/admin/AdminAccess';

const slugify = (text) => String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** "New page": heading, URL, service type and place — then the full editor. */
function NewServicePageButtonInner({ families = [] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const slug = slugEdited ? slugify(f.slug) : slugify(f.name);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && status !== 'saving') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, status]);

  async function create() {
    if (!f.name?.trim()) { setError('Enter the page heading.'); return; }
    if (!slug) { setError('Enter the page URL.'); return; }
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/admin/service-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create the page.');
      router.push(`/admin/service-pages/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  const input = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-500';
  const bind = (key) => ({ value: f[key] || '', onChange: (e) => setF((x) => ({ ...x, [key]: e.target.value })) });

  return (
    <>
      <button
        type="button"
        onClick={() => { setF({}); setSlugEdited(false); setError(''); setStatus('idle'); setOpen(true); }}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Plus size={16} aria-hidden="true" />
        New page
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" aria-label="Close" onClick={() => status !== 'saving' && setOpen(false)} className="absolute inset-0 bg-ink-900/55" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-page-title"
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            style={{ animation: 'df-fade-in 0.2s ease-out' }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <FilePlus2 size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="new-page-title" className="text-[17px] font-semibold text-ink-900">New service page</h2>
                <p className="text-[12.5px] text-ink-400">Content, products and FAQs can be added in the next step.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div
              className="space-y-4 overflow-y-auto px-5 py-4"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); create(); } }}
            >
              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Page heading <span className="text-danger">*</span></span>
                <input autoFocus {...bind('name')} maxLength={255} placeholder="e.g. RO Service in Noida" className={input} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">URL</span>
                <input
                  value={slugEdited ? (f.slug || '') : slug}
                  onChange={(e) => { setSlugEdited(true); setF((x) => ({ ...x, slug: e.target.value })); }}
                  placeholder="made from the heading"
                  className={cx(input, 'font-mono text-[13.5px]')}
                />
                <span className="mt-1 block break-all text-[12.5px] text-ink-400">
                  www.doctorfresh.in/
                  <span className="font-medium text-primary-700">{slug || '…'}</span>
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Service type</span>
                <input {...bind('type')} list="df-new-service-types" placeholder="e.g. RO Service" className={input} />
                <datalist id="df-new-service-types">
                  {families.map((fam) => <option key={fam.type} value={fam.type} />)}
                </datalist>
                <span className="mt-1 block text-[12px] text-ink-400">Pick an existing one so the page gets its products and nearby links.</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">City</span>
                  <input {...bind('city')} className={input} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">State</span>
                  <input {...bind('state')} className={input} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 flex justify-between text-[13.5px] font-medium text-ink-800">
                  Meta title
                  <span className="font-normal text-ink-300">{`optional · ${(f.metaTitle || '').length}/60`}</span>
                </span>
                <input {...bind('metaTitle')} maxLength={255} placeholder={f.name || 'Uses the heading if left empty'} className={input} />
              </label>

              {error ? (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} disabled={status === 'saving'} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                disabled={status === 'saving'}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
              >
                {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {status === 'saving' ? 'Creating…' : 'Create & continue'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

/** Shown only to admins whose role allows this; the server checks again on save. */
export default function NewServicePageButton(props) {
  return (
    <Can section={'service_pages'} action={'create'}>
      <NewServicePageButtonInner {...props} />
    </Can>
  );
}

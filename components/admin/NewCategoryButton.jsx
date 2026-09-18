'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Loader2, AlertTriangle, FolderPlus, FolderTree,
} from 'lucide-react';
import { cx } from '@/lib/utils';

const slugify = (text) => String(text || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

/**
 * "New category" / "New subcategory": a short form for what a page needs to
 * exist — name, address and parent — then straight into the full editor for
 * the listing, heading, content and FAQs.
 *
 * `categories` lets a subcategory's parent be chosen; `parent` fixes it.
 */
export default function NewCategoryButton({
  kind = 'category', parent = null, categories = [], variant = 'primary', label,
}) {
  const isSub = kind === 'subcategory';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [parentId, setParentId] = useState(parent?.id ? String(parent.id) : '');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const chosenParent = parent || categories.find((c) => String(c.id) === parentId);
  const finalSlug = slugEdited ? slugify(slug) : slugify(name);
  const address = isSub
    ? `/category/${chosenParent?.slug || '…'}/${finalSlug || '…'}`
    : `/category/${finalSlug || '…'}`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && status !== 'saving') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, status]);

  function reset() {
    setName(''); setSlug(''); setSlugEdited(false); setMetaTitle(''); setMetaDescription('');
    setParentId(parent?.id ? String(parent.id) : ''); setStatus('idle'); setError('');
  }

  async function create() {
    if (!name.trim()) { setError(`Enter a ${kind} name.`); return; }
    if (isSub && !chosenParent) { setError('Choose the parent category.'); return; }
    if (!finalSlug) { setError('Enter a URL for the page.'); return; }

    setStatus('saving');
    setError('');
    try {
      const res = await fetch(isSub ? '/api/admin/subcategories' : '/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug: finalSlug, metaTitle, metaDescription, categoryId: chosenParent?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create it.');
      // Straight into the full editor for the rest of the page.
      router.push(isSub ? `/admin/categories/${data.categoryId}/sub/${data.id}` : `/admin/categories/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  const Icon = isSub ? FolderTree : FolderPlus;
  const input = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500';

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className={cx(
          'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-colors',
          variant === 'primary'
            ? 'bg-primary-500 text-white hover:bg-primary-700'
            : 'border border-line-strong bg-white text-ink-700 hover:border-primary-500 hover:text-primary-700',
        )}
      >
        <Plus size={16} aria-hidden="true" />
        {label || (isSub ? 'New subcategory' : 'New category')}
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => status !== 'saving' && setOpen(false)}
            className="absolute inset-0 bg-ink-900/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-cat-title"
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            style={{ animation: 'df-fade-in 0.2s ease-out' }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Icon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="new-cat-title" className="text-[17px] font-semibold text-ink-900">{isSub ? 'New subcategory' : 'New category'}</h2>
                <p className="text-[12.5px] text-ink-400">Content, heading and FAQs can be added in the next step.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted hover:text-ink-900"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Not a <form>: this opens over other forms (the category editor),
                and a nested form would submit the page behind it. */}
            <div
              className="space-y-4 overflow-y-auto px-5 py-4"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); create(); } }}
            >
              {isSub && !parent ? (
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Parent category <span className="text-danger">*</span></span>
                  <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={cx(input, 'cursor-pointer')}>
                    <option value="">Choose a category…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              ) : null}
              {isSub && parent ? (
                <p className="rounded-lg bg-surface-muted px-3 py-2 text-[13.5px] text-ink-500">
                  {'Under '}
                  <span className="font-semibold text-ink-900">{parent.name}</span>
                </p>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Name <span className="text-danger">*</span></span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  placeholder={isSub ? 'e.g. Water Ionizer for Home' : 'e.g. Water Ionizer'}
                  className={input}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">URL</span>
                <input
                  value={slugEdited ? slug : finalSlug}
                  onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }}
                  maxLength={200}
                  placeholder="made from the name"
                  className={cx(input, 'font-mono text-[13.5px]')}
                />
                <span className="mt-1 block break-all text-[12.5px] text-ink-400">
                  {'www.doctorfresh.in'}
                  <span className="font-medium text-primary-700">{address}</span>
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[13.5px] font-medium text-ink-800">
                  Meta title
                  <span className="font-normal text-ink-300">{`optional · ${metaTitle.length}/60`}</span>
                </span>
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={255} placeholder={name || 'Uses the name if left empty'} className={input} />
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[13.5px] font-medium text-ink-800">
                  Meta description
                  <span className="font-normal text-ink-300">{`optional · ${metaDescription.length}/160`}</span>
                </span>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={255}
                  rows={2}
                  className={cx(input, 'h-auto resize-y py-2.5 leading-relaxed')}
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={status === 'saving'}
                className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700 hover:border-ink-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                disabled={status === 'saving'}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-70"
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

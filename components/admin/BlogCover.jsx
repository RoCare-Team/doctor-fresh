'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { cx } from '@/lib/utils';
import { Can } from '@/components/admin/AdminAccess';

/** The post's cover image: drop or pick a file, converted to WebP on upload. */
function BlogCoverInner({ id, initialSrc = '' }) {
  const input = useRef(null);
  const [src, setSrc] = useState(initialSrc);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    const body = new FormData();
    body.set('id', String(id));
    body.set('file', file);
    try {
      const res = await fetch('/api/admin/blogs/image', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');
      setSrc(data.src);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/blogs/image?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove the image.');
      setSrc('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-ink-900">Cover image</h2>
      <p className="mt-0.5 text-[13px] text-ink-400">Shown on the blog list and at the top of the post. Converted to WebP automatically.</p>

      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />

      {src ? (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Cover" className="h-full w-full object-cover" />
            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 size={22} className="animate-spin text-primary-500" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13.5px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700">
              <RefreshCw size={14} aria-hidden="true" />
              Replace
            </button>
            <button type="button" disabled={busy} onClick={remove} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13.5px] font-medium text-ink-500 hover:border-danger hover:text-danger">
              <Trash2 size={14} aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
          className={cx(
            'mt-4 flex w-full max-w-sm flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            drag ? 'border-primary-500 bg-primary-50' : 'border-line-strong hover:border-primary-300 hover:bg-primary-50/40',
          )}
        >
          {busy ? <Loader2 size={24} className="animate-spin text-primary-500" aria-hidden="true" /> : <ImagePlus size={24} className="text-primary-500" aria-hidden="true" />}
          <span className="text-[14px] font-medium text-ink-700">{busy ? 'Uploading…' : 'Drop an image or click to choose'}</span>
          <span className="text-[12.5px] text-ink-400">PNG, JPG, WebP · up to 10 MB · 1200×630 works best</span>
        </button>
      )}

      {error ? <p role="alert" className="mt-2 text-[13.5px] text-danger">{error}</p> : null}
    </section>
  );
}

/** Shown only to admins whose role allows this; the server checks again on save. */
export default function BlogCover(props) {
  return (
    <Can section={'blogs'} action={'edit'}>
      <BlogCoverInner {...props} />
    </Can>
  );
}

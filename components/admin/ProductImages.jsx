'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ImageIcon, UploadCloud, Trash2, Star, RefreshCw, Loader2, CheckCircle2,
} from 'lucide-react';
import { cx } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif';
const MAX_MB = 10;

const kb = (bytes) => (bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Product photos: drop or browse to add, replace one in place, pick the main
 * photo, remove. Everything is converted to WebP on the server, and the first
 * photo is the one shown on cards and listings.
 *
 * Not a <form>: it sits next to the details form on the same screen, and an
 * upload must never submit (and save) that form.
 */
export default function ProductImages({ productId }) {
  const [images, setImages] = useState(null); // null while loading
  const [busy, setBusy] = useState(''); // '' | 'upload' | <file name being changed>
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [dragging, setDragging] = useState(false);
  const addRef = useRef(null);
  const replaceRef = useRef(null);
  const replacing = useRef('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/products/images?id=${productId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setImages(d.images || []); })
      .catch(() => { if (!cancelled) setImages([]); });
    return () => { cancelled = true; };
  }, [productId]);

  async function call(url, init, label) {
    setBusy(label);
    setError('');
    setNote('');
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
      setImages(data.images || []);
      if (data.saved?.before) {
        setNote(`Converted to WebP — ${kb(data.saved.before)} → ${kb(data.saved.after)}.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function pickFiles(fileList) {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      setError('Drop image files — PNG, JPG, WebP, GIF, AVIF or HEIC.');
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is larger than ${MAX_MB} MB.`);
      return;
    }

    const body = new FormData();
    body.append('id', String(productId));
    files.forEach((f) => body.append('files', f));
    call('/api/admin/products/images', { method: 'POST', body }, 'upload');
  }

  function replace(file) {
    const name = replacing.current;
    if (!file || !name) return;
    const body = new FormData();
    body.append('id', String(productId));
    body.append('name', name);
    body.append('file', file);
    call('/api/admin/products/images', { method: 'PUT', body }, name);
  }

  function makeMain(name) {
    call('/api/admin/products/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId, name }),
    }, name);
  }

  function remove(name) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remove this photo from the product?')) return;
    call(`/api/admin/products/images?id=${productId}&name=${encodeURIComponent(name)}`, { method: 'DELETE' }, name);
  }

  const uploading = busy === 'upload';

  return (
    <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <ImageIcon size={20} className="text-primary-600" aria-hidden="true" />
        <h2 className="text-[18px] font-semibold text-ink-900">Product Images</h2>
        <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-[12px] font-semibold text-success">
          Auto WebP Conversion
        </span>
      </div>

      {/* ------------------------------------------------------ drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
        onClick={() => !uploading && addRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault();
            addRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) pickFiles(e.dataTransfer.files);
        }}
        className={cx(
          'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors',
          dragging ? 'border-primary-500 bg-primary-50' : 'border-line-strong hover:border-primary-300 hover:bg-surface-muted/60',
          uploading && 'cursor-wait opacity-80',
        )}
      >
        <span className={cx(
          'flex h-14 w-14 items-center justify-center rounded-full',
          dragging ? 'bg-primary-500 text-white' : 'bg-surface-muted text-ink-400',
        )}
        >
          {uploading
            ? <Loader2 size={24} className="animate-spin" aria-hidden="true" />
            : <UploadCloud size={24} aria-hidden="true" />}
        </span>
        <p className="mt-3 text-[15px] font-semibold text-ink-800">
          {uploading ? 'Uploading and converting…' : dragging ? 'Drop to upload' : 'Drag & drop images here or click to browse'}
        </p>
        <p className="mt-1 text-[13px] text-ink-400">{`PNG, JPG, WebP, GIF, AVIF or HEIC up to ${MAX_MB}MB each`}</p>
        <p className="mt-2 text-[12.5px] font-medium text-success">
          ✓ Automatic WebP conversion for optimal file size
        </p>
      </div>

      <input
        ref={addRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => { replace(e.target.files?.[0]); e.target.value = ''; }}
      />

      {note ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-success">
          <CheckCircle2 size={15} aria-hidden="true" />
          {note}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-[13.5px] text-danger">{error}</p> : null}

      {/* --------------------------------------------------- existing photos */}
      <div className="mt-6">
        <p className="text-[13.5px] font-semibold text-ink-500">
          Existing images of product
          {images?.length ? <span className="ml-1.5 font-normal text-ink-300">{`(${images.length})`}</span> : null}
        </p>

        {images === null ? (
          <div className="mt-3 flex gap-3">
            {[0, 1, 2].map((i) => <span key={i} className="h-40 w-40 animate-pulse rounded-xl bg-surface-muted" />)}
          </div>
        ) : images.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((img, index) => {
              const working = busy === img.name;
              return (
                <li
                  key={img.name}
                  className={cx(
                    'group overflow-hidden rounded-xl border bg-white',
                    index === 0 ? 'border-primary-300 ring-2 ring-primary-100' : 'border-line',
                  )}
                >
                  <div className="relative aspect-square">
                    {/* A plain img: the ?v stamp must reach the file, so a replaced
                        photo is never shown from an optimiser cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt="" className="h-full w-full object-contain p-3" />

                    {index === 0 ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary-500 px-2 py-0.5 text-[11.5px] font-semibold text-white">
                        <Star size={10} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        Main
                      </span>
                    ) : null}

                    {working ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 size={22} className="animate-spin text-primary-600" aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>

                  <div className="border-t border-line px-2.5 py-2">
                    <p className="truncate text-[11.5px] text-ink-400" title={img.name}>
                      {`${img.name} · ${kb(img.size)}`}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => { replacing.current = img.name; replaceRef.current?.click(); }}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-primary-500 text-[12.5px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-50"
                      >
                        <RefreshCw size={13} aria-hidden="true" />
                        Replace
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => remove(img.name)}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-danger/30 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                    {index !== 0 ? (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => makeMain(img.name)}
                        className="mt-1.5 inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg text-[12px] font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
                      >
                        <Star size={12} aria-hidden="true" />
                        Set as main
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-surface-muted/60 py-8 text-center text-[14px] text-ink-400">
            No images uploaded yet
          </p>
        )}
      </div>
    </section>
  );
}

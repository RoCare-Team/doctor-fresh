'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Trash2, Star } from 'lucide-react';

/**
 * Product photos.
 *
 * Files land in public/uploads/product_image as product_<id>_<n>, which is the
 * naming the storefront and the old panel already read, and the first photo is
 * the one shown on cards and listings.
 */
export default function ProductImages({ productId }) {
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/products/images?id=${productId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setImages(d.images || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productId]);

  async function upload(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    setBusy(true);
    setError('');

    const form = new FormData();
    form.append('id', String(productId));
    files.forEach((f) => form.append('files', f));

    try {
      const res = await fetch('/api/admin/products/images', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not upload.');
      setImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(src) {
    const name = src.split('/').pop();
    if (!window.confirm('Remove this photo?')) return;

    setBusy(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/products/images?id=${productId}&name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not remove.');
      setImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold text-ink-900">Photos</h2>
      <p className="mt-1 text-[13px] text-ink-400">
        JPG, PNG or WebP, up to 5 MB each. The first photo is used on cards and listings.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {images.map((src, index) => (
          <div key={src} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-line bg-white">
            <Image src={src} alt="" fill sizes="96px" className="object-contain p-1" unoptimized />

            {index === 0 ? (
              <span className="absolute left-0 top-0 inline-flex items-center gap-0.5 rounded-br bg-primary-500 px-1.5 py-0.5 text-[10.5px] font-medium text-white">
                <Star size={9} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                Main
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => remove(src)}
              disabled={busy}
              aria-label="Remove photo"
              className="absolute right-1 top-1 rounded bg-white/90 p-1 text-ink-400 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-ink-400 transition-colors hover:border-primary-500 hover:text-primary-700 disabled:opacity-50"
        >
          <ImagePlus size={20} aria-hidden="true" />
          <span className="text-[12px]">{busy ? 'Uploading…' : 'Add'}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={upload}
        className="hidden"
      />

      {error ? <p className="mt-3 text-[13.5px] text-danger">{error}</p> : null}
    </section>
  );
}

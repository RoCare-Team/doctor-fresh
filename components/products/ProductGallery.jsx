'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { imageUrl, cx } from '@/lib/utils';

// How far the panel magnifies the photo.
const ZOOM = 2.4;

/**
 * The pointer sits over one square of the photo — 1/ZOOM of its width — and
 * the panel shows that square filling its whole area. Both the lens and the
 * panel are driven by the same two numbers, so they always agree:
 *
 *   lens size = 100 / ZOOM  per cent of the image
 *   lens edge = x * (ZOOM - 1) / ZOOM
 *
 * The panel reaches the same view by scaling its copy of the photo about the
 * pointer, which keeps object-contain and the padding identical to the main
 * image rather than re-deriving them as a background.
 */
const LENS_SIZE = 100 / ZOOM;
const lensEdge = (percent) => (percent * (ZOOM - 1)) / ZOOM;

export default function ProductGallery({ images = [], name, badges = [], discountPercent = 0 }) {
  const [active, setActive] = useState(0);
  // Where the pointer is over the main image, in per cent — null when away.
  const [origin, setOrigin] = useState(null);
  /**
   * Zoom needs a mouse to aim it, a hover state to leave it, and room beside
   * the gallery to put the panel. A touch screen has none of the three, and
   * below `lg` the page stacks the buy box under the photo, so there is no
   * space to the side either.
   */
  const [canZoom, setCanZoom] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
    const sync = () => setCanZoom(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Switching thumbnails while zoomed would leave the panel open on a photo
  // the pointer was never over.
  useEffect(() => { setOrigin(null); }, [active]);

  function track(event) {
    if (!canZoom) return;
    const box = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  }

  if (!images.length) return null;

  const source = imageUrl(images[active]);
  const zooming = canZoom && origin;

  return (
    <div className="relative flex gap-3 md:gap-4">
      {images.length > 1 ? (
        <div className="df-scrollbar flex max-h-[440px] w-16 shrink-0 flex-col gap-2 overflow-y-auto md:w-[74px]">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cx(
                'relative aspect-square shrink-0 overflow-hidden rounded-md border bg-white transition-colors',
                i === active ? 'border-primary-500' : 'border-line hover:border-line-strong',
              )}
            >
              <Image
                src={imageUrl(src)}
                alt=""
                fill
                sizes="74px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1 overflow-hidden df-card">
        <div
          className={cx('relative aspect-square w-full', canZoom && 'cursor-crosshair')}
          onMouseMove={track}
          onMouseLeave={() => setOrigin(null)}
        >
          <Image
            src={source}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 520px"
            className="object-contain p-5"
          />

          {/* The square the panel is showing. */}
          {zooming ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute border border-primary-500/70 bg-primary-500/10"
              style={{
                width: `${LENS_SIZE}%`,
                height: `${LENS_SIZE}%`,
                left: `${lensEdge(origin.x)}%`,
                top: `${lensEdge(origin.y)}%`,
              }}
            />
          ) : null}
        </div>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discountPercent > 0 ? (
            <span className="rounded bg-primary-600 px-2 py-0.5 text-[12.5px] font-semibold text-white">
              {discountPercent}% off
            </span>
          ) : null}
          {badges.map((b) => (
            <span key={b} className="rounded bg-primary-500 px-2 py-0.5 text-[12.5px] font-medium text-white">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Sits beside the gallery, over the buy box, the way a shop's zoom does.
          Square and as tall as the photo, so it shows exactly the lens square. */}
      {zooming ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-0 z-30 ml-4 aspect-square h-full overflow-hidden rounded-xl border border-line bg-white shadow-2xl"
        >
          <Image
            src={source}
            alt=""
            fill
            sizes="520px"
            className="object-contain p-5"
            style={{
              transform: `scale(${ZOOM})`,
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

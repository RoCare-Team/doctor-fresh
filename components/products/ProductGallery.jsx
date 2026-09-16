'use client';

import { useEffect, useRef, useState } from 'react';
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

// One `sizes` for both the phone carousel and the desktop gallery, so the two
// trees ask the optimiser for the same file and the browser downloads it once.
const SIZES = '(max-width: 1024px) 100vw, 520px';

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

  // The phone carousel is a scroller, so the slide it has settled on is read
  // back from its scroll position rather than held as the source of truth.
  const track = useRef(null);
  const [slide, setSlide] = useState(0);

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

  function trackPointer(event) {
    if (!canZoom) return;
    const box = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  }

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goToSlide(i) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  if (!images.length) return null;

  const source = imageUrl(images[active]);
  const zooming = canZoom && origin;

  const flags = (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
      {discountPercent > 0 ? (
        <span className="rounded-md bg-primary-600 px-2 py-0.5 text-[12px] font-bold text-white">
          {discountPercent}% off
        </span>
      ) : null}
      {badges.map((b) => (
        <span
          key={b}
          className="rounded-md bg-white/95 px-2 py-0.5 text-[11.5px] font-semibold text-primary-700 shadow-[0_2px_8px_-4px_rgb(6_59_76_/_0.4)]"
        >
          {b}
        </span>
      ))}
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------- phone: swipe deck */}
      <div className="lg:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-white">
          {flags}

          {images.length > 1 ? (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-ink-900/70 px-2.5 py-1 text-[11.5px] font-medium text-white">
              {`${slide + 1}/${images.length}`}
            </span>
          ) : null}

          <div
            ref={track}
            onScroll={onScroll}
            className="df-no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          >
            {images.map((src, i) => (
              <div key={src} className="relative aspect-square w-full shrink-0 snap-center">
                <Image
                  src={imageUrl(src)}
                  alt={i === 0 ? name : `${name} — photo ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes={SIZES}
                  className="object-contain p-4"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dots for a couple of photos, a thumbnail strip once there are many. */}
        {images.length > 1 ? (
          images.length <= 5 ? (
            <div className="mt-3 flex justify-center gap-1.5">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => goToSlide(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === slide}
                  className={cx(
                    'h-1.5 rounded-full transition-all',
                    i === slide ? 'w-5 bg-primary-500' : 'w-1.5 bg-line-strong',
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="df-no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => goToSlide(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === slide}
                  className={cx(
                    'relative aspect-square w-14 shrink-0 overflow-hidden rounded-lg border bg-white',
                    i === slide ? 'border-primary-500' : 'border-line',
                  )}
                >
                  <Image src={imageUrl(src)} alt="" fill sizes="56px" className="object-contain p-1" />
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      {/* ---------------------------------------- desktop: thumbs + zoom lens */}
      <div className="relative hidden gap-4 lg:flex">
        {images.length > 1 ? (
          <div className="df-scrollbar flex max-h-[440px] w-[74px] shrink-0 flex-col gap-2 overflow-y-auto">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
                className={cx(
                  'relative aspect-square shrink-0 overflow-hidden rounded-lg border bg-white transition-colors',
                  i === active ? 'border-primary-500 ring-1 ring-primary-200' : 'border-line hover:border-line-strong',
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

        <div className="df-card relative flex-1 overflow-hidden">
          <div
            className={cx('relative aspect-square w-full', canZoom && 'cursor-crosshair')}
            onMouseMove={trackPointer}
            onMouseLeave={() => setOrigin(null)}
          >
            <Image
              src={source}
              alt={name}
              fill
              sizes={SIZES}
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

          {flags}

          {canZoom ? (
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] text-ink-400">
              Hover to zoom
            </span>
          ) : null}
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
    </>
  );
}

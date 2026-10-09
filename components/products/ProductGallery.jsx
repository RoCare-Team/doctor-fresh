'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { imageUrl, cx } from '@/lib/utils';
import VideoEmbed from '@/components/common/VideoEmbed';

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

export default function ProductGallery({ images = [], name, badges = [], discountPercent = 0, videoUrl = '' }) {
  const [active, setActive] = useState(0);
  // The full-screen viewer: which photo it shows, or null when closed.
  const [viewer, setViewer] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  // Desktop: the demo plays in the main box, in place of the photo.
  const [playing, setPlaying] = useState(false);
  // The viewer pages through the photos and then the demo video, if any.
  const slides = images.length + (videoUrl ? 1 : 0);
  const onVideo = viewer !== null && viewer >= images.length;
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

  // Escape closes either overlay, the arrows page the viewer, and the page
  // behind does not scroll while one is open.
  useEffect(() => {
    if (viewer === null && !showVideo) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setViewer(null); setShowVideo(false); }
      if (viewer !== null && e.key === 'ArrowRight') setViewer((v) => (v + 1) % slides);
      if (viewer !== null && e.key === 'ArrowLeft') setViewer((v) => (v - 1 + slides) % slides);
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [viewer, showVideo, slides]);

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
  const zooming = canZoom && origin && !playing;

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
          className="rounded-md bg-white/95 px-2 py-0.5 text-[11.5px] font-semibold text-primary-700 shadow-[0_2px_8px_-4px_rgb(15_23_42_/_0.25)]"
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

        {videoUrl ? (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="mx-auto mt-2 flex items-center gap-1.5 text-[13px] font-medium text-primary-700"
          >
            <Play size={12} fill="currentColor" aria-hidden="true" />
            Watch demo video
          </button>
        ) : null}
      </div>

      {/* ---------------------------------------- desktop: thumbs + zoom lens */}
      <div className="relative hidden gap-4 lg:flex">
        {images.length > 1 || videoUrl ? (
          <div className="df-scrollbar flex max-h-[560px] w-[100px] shrink-0 flex-col gap-3 overflow-y-auto p-0.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => { setActive(i); setPlaying(false); }}
                aria-label={`View image ${i + 1}`}
                aria-current={!playing && i === active}
                className={cx(
                  'relative aspect-square shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors',
                  !playing && i === active ? 'border-primary-500' : 'border-line hover:border-line-strong',
                )}
              >
                <Image
                  src={imageUrl(src)}
                  alt=""
                  fill
                  sizes="100px"
                  className="object-contain p-1.5"
                />
              </button>
            ))}
            {videoUrl ? (
              <button
                type="button"
                onClick={() => { setPlaying(true); setOrigin(null); }}
                aria-pressed={playing}
                className={cx(
                  'flex aspect-square shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-ink-900 text-white transition-colors hover:bg-ink-800',
                  playing ? 'border-primary-500' : 'border-ink-900',
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/15">
                  <Play size={16} fill="currentColor" aria-hidden="true" />
                </span>
                <span className="text-[12px] font-medium">Watch Demo</span>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative flex-1 overflow-hidden rounded-2xl border border-line bg-white">
          <div
            className={cx('relative aspect-[10/9] w-full', canZoom && 'cursor-crosshair')}
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

            {/* The demo, playing where the photo was. */}
            {playing ? (
              <div className="absolute inset-0 z-20 flex items-center bg-ink-900">
                <VideoEmbed url={videoUrl} title={`${name} demo video`} autoPlay className="rounded-none" />
              </div>
            ) : null}

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

          <button
            type="button"
            onClick={() => setViewer(active)}
            className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium text-ink-900 transition-colors hover:border-line-strong"
          >
            <Camera size={16} aria-hidden="true" />
            {videoUrl ? 'Photos & Video' : 'View All Photos'}
          </button>
        </div>

        {/* Sits beside the gallery, over the buy box, the way a shop's zoom does.
            Square and as tall as the photo, so it shows exactly the lens square. */}
        {zooming ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-full top-0 z-30 ml-4 aspect-[10/9] h-full overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-24px_rgb(15_23_42/0.3)]"
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

      {/* ------------------------------------------- full-screen photo viewer */}
      {viewer !== null ? (
        <div role="dialog" aria-modal="true" aria-label={`${name} photos`} className="fixed inset-0 z-[70] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="min-w-0 truncate text-[14.5px] font-semibold text-ink-900">{name}</p>
            <button type="button" onClick={() => setViewer(null)} aria-label="Close photos" className="rounded-full p-2 text-ink-500 hover:bg-surface-muted">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            {onVideo ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 sm:px-20">
                <VideoEmbed url={videoUrl} title={`${name} demo video`} className="max-w-4xl" />
              </div>
            ) : (
              <Image src={imageUrl(images[viewer])} alt={`${name} — photo ${viewer + 1}`} fill sizes="100vw" className="object-contain p-6" />
            )}
            {slides > 1 ? (
              <>
                <button type="button" onClick={() => setViewer((v) => (v - 1 + slides) % slides)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-700 hover:border-line-strong">
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setViewer((v) => (v + 1) % slides)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-700 hover:border-line-strong">
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
          {slides > 1 ? (
            <div className="df-no-scrollbar flex justify-center gap-2 overflow-x-auto border-t border-line px-4 py-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setViewer(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === viewer}
                  className={cx('relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white', i === viewer ? 'border-primary-500' : 'border-line')}
                >
                  <Image src={imageUrl(src)} alt="" fill sizes="64px" className="object-contain p-1" />
                </button>
              ))}
              {videoUrl ? (
                <button
                  type="button"
                  onClick={() => setViewer(images.length)}
                  aria-label="Play the demo video"
                  aria-current={onVideo}
                  className={cx('flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-ink-900 text-[10.5px] font-medium text-white', onVideo ? 'border-primary-500' : 'border-ink-900')}
                >
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  Video
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* -------------------------------------------------------- demo video */}
      {showVideo ? (
        <div role="dialog" aria-modal="true" aria-label={`${name} demo video`} className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/80 p-4">
          <button type="button" aria-label="Close video" onClick={() => setShowVideo(false)} className="absolute inset-0" />
          <div className="relative w-full max-w-4xl">
            <button type="button" onClick={() => setShowVideo(false)} aria-label="Close video" className="absolute -top-12 right-0 rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
              <X size={20} aria-hidden="true" />
            </button>
            <VideoEmbed url={videoUrl} title={`${name} demo video`} />
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { imageUrl, cx } from '@/lib/utils';

export default function ProductGallery({ images = [], name, badges = [], discountPercent = 0 }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;

  return (
    <div className="flex gap-3 md:gap-4">
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
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1 overflow-hidden rounded-[10px] border border-line bg-white">
        <div className="relative aspect-square w-full">
          <Image
            src={imageUrl(images[active])}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 520px"
            className="object-contain p-5"
            unoptimized
          />
        </div>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discountPercent > 0 ? (
            <span className="rounded bg-accent-500 px-2 py-0.5 text-[12.5px] font-semibold text-white">
              {discountPercent}% off
            </span>
          ) : null}
          {badges.map((b) => (
            <span key={b} className="rounded bg-primary-500 px-2 py-0.5 text-[12.5px] font-medium text-ink-900">
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

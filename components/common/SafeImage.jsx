import Image from 'next/image';
import { Package } from 'lucide-react';
import { imageUrl } from '@/lib/utils';

/**
 * next/image with a guard for a missing source.
 *
 * Passing an empty string to `src` makes the browser re-request the page, so
 * anything that may not have an image — a cart line saved before a product was
 * photographed, a category with no products yet — renders a neutral mark
 * instead.
 */
export default function SafeImage({ src, alt = '', icon: Icon = Package, iconSize = 24, ...rest }) {
  const resolved = imageUrl(src);
  if (!resolved) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-surface-muted">
        <Icon size={iconSize} strokeWidth={1.5} className="text-ink-300" aria-hidden="true" />
      </span>
    );
  }
  return <Image src={resolved} alt={alt} {...rest} />;
}

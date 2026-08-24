import Image from 'next/image';
import { Droplets } from 'lucide-react';
import { imageUrl } from '@/lib/utils';

/**
 * A post's hero image, or a branded panel when no image file exists for it.
 *
 * Two posts in the catalogue were published without ever having an image
 * uploaded, so the card and article layouts still need something to fill the
 * frame rather than rendering a broken picture.
 */
export default function BlogImage({ post, sizes, className = '' }) {
  if (!post?.image) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-primary-100 ${className}`}
        aria-hidden="true"
      >
        <Droplets size={44} className="text-primary-500/60" />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl(post.image)}
      alt={post.title}
      fill
      sizes={sizes}
      className={className}
    />
  );
}

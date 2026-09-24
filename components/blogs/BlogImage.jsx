import Image from 'next/image';
import { Droplets } from 'lucide-react';
import { imageUrl } from '@/lib/utils';
import { imageSize } from '@/lib/image-size';

/**
 * A post's cover picture, or a branded panel when no image file exists for it.
 *
 * Two posts in the catalogue were published without ever having an image
 * uploaded, so the card and article layouts still need something to fill the
 * frame rather than rendering a broken picture.
 *
 * The covers are made elsewhere and carry their own headline, in every shape
 * from a square to a wide banner, and none of them may be cropped — the words
 * are part of the picture.
 *
 * In a grid (`framed`) every card must be the same height, so the frame is
 * fixed and the picture is fitted inside it, over a blurred, enlarged copy of
 * itself: same height everywhere, nothing cut off, and no empty band either.
 * Standing on its own, at the top of an article, the frame takes the picture's
 * own shape instead — measured beforehand, so the space is reserved before it
 * loads.
 */
export default async function BlogImage({
  post, sizes, className = '', shape = 'aspect-[16/10]', framed = false,
}) {
  if (!post?.image) {
    return (
      <div
        className={`flex ${shape} w-full items-center justify-center bg-primary-100 ${className}`}
        aria-hidden="true"
      >
        <Droplets size={44} className="text-primary-500/60" />
      </div>
    );
  }

  const src = imageUrl(post.image);
  // In a grid every card has to be the same height, so there the frame is
  // fixed and the picture sits inside it. On its own — the top of an article —
  // the frame takes the picture's shape instead.
  const size = framed ? null : await imageSize(src);

  if (size) {
    return (
      <Image
        src={src}
        alt={post.title}
        width={size.width}
        height={size.height}
        sizes={sizes}
        className={`h-auto w-full ${className}`}
      />
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${shape}`}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes="320px"
        quality={35}
        className="scale-125 object-cover blur-2xl"
      />
      <Image src={src} alt={post.title} fill sizes={sizes} className={`object-contain ${className}`} />
    </div>
  );
}

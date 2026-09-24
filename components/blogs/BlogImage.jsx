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
 * from a square to a wide banner. So the frame takes the picture's shape
 * rather than the other way round: nothing is cropped and no band is left
 * around it. When a picture cannot be measured, it is fitted inside a frame of
 * the usual shape, over a blurred copy of itself so that frame is not empty.
 */
export default async function BlogImage({
  post, sizes, className = '', fallbackShape = 'aspect-[16/10]',
}) {
  if (!post?.image) {
    return (
      <div
        className={`flex aspect-[16/10] w-full items-center justify-center bg-primary-100 ${className}`}
        aria-hidden="true"
      >
        <Droplets size={44} className="text-primary-500/60" />
      </div>
    );
  }

  const src = imageUrl(post.image);
  const size = await imageSize(src);

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
    <div className={`relative w-full overflow-hidden ${fallbackShape}`}>
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

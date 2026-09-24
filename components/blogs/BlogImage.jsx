import Image from 'next/image';
import { Droplets } from 'lucide-react';
import { imageUrl } from '@/lib/utils';

/**
 * A post's hero image, or a branded panel when no image file exists for it.
 *
 * Two posts in the catalogue were published without ever having an image
 * uploaded, so the card and article layouts still need something to fill the
 * frame rather than rendering a broken picture.
 *
 * `whole` is for covers that carry their own headline: the picture is shown
 * complete, so no words are cut off, and the frame around it is filled with a
 * blurred, enlarged copy of the same file — the same image, already loaded,
 * so the card has no empty band above or below whatever shape it came in.
 */
export default function BlogImage({
  post, sizes, className = '', whole = false,
}) {
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

  const src = imageUrl(post.image);
  if (!whole) {
    return <Image src={src} alt={post.title} fill sizes={sizes} className={className} />;
  }

  return (
    <>
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
    </>
  );
}

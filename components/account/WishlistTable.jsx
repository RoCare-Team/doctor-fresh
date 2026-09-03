import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import WishlistButton from '@/components/products/WishlistButton';
import { formatPrice, imageUrl } from '@/lib/utils';

/**
 * Saved products, as the columns the current site's wishlist shows.
 *
 * Removal reuses the heart button from the product cards rather than a second
 * remove endpoint, so there is one place that writes `user.wishlist`. It is
 * the only interactive part, which keeps this a server component.
 */
export default function WishlistTable({ products = [] }) {
  if (!products.length) {
    return (
      <div className="df-card px-6 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary-700">
          <Heart size={22} aria-hidden="true" />
        </span>
        <p className="mt-3 text-[16px] font-semibold text-ink-900">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-400">
          Tap the heart on any product to keep it here for later.
        </p>
        <Link
          href="/all-category"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary-500 px-4 text-[14.5px] font-medium text-white transition-colors hover:bg-ink-900"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="df-card overflow-x-auto">
      <table className="w-full min-w-155 text-left">
        <thead>
          <tr className="border-b border-line bg-surface-muted text-[12px] uppercase tracking-wide text-ink-500">
            <th scope="col" className="px-4 py-2.5 font-semibold">Product</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Price</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Availability</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Remove</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <Link href={p.url} className="group flex items-center gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                    {p.images?.[0] ? (
                      <Image
                        src={imageUrl(p.images[0])}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-[14.5px] font-medium text-ink-900 transition-colors group-hover:text-primary-700">
                    {p.name}
                  </span>
                </Link>
              </td>

              <td className="px-4 py-3 text-[14.5px] font-semibold text-ink-900">
                {p.price ? formatPrice(p.price) : 'On request'}
              </td>

              <td className="px-4 py-3">
                <span
                  className={p.inStock
                    ? 'rounded-full bg-success/10 px-2.5 py-1 text-[12.5px] font-medium text-success'
                    : 'rounded-full bg-surface-muted px-2.5 py-1 text-[12.5px] font-medium text-ink-400'}
                >
                  {p.inStock ? 'In stock' : 'Out of stock'}
                </span>
              </td>

              <td className="px-4 py-3">
                <span className="flex justify-end">
                  <WishlistButton productId={p.id} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

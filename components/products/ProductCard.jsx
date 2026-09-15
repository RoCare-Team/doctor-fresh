import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import AddToCartButtons from '@/components/products/AddToCartButtons';
import WishlistButton from '@/components/products/WishlistButton';
import { formatPrice, imageUrl } from '@/lib/utils';

/**
 * The one product card used everywhere — category grids, search results,
 * homepage rails and related-product rails.
 *
 * Every section has a reserved height so that a long name, a missing
 * description or an odd image ratio can never make one card taller than its
 * neighbour, and the actions always sit on the bottom edge of the card.
 */
export default function ProductCard({ product, compact = false }) {
  if (!product) return null;

  const image = product.images?.[0];
  const hasPrice = Boolean(product.price);
  const showDiscount = hasPrice && product.mrp > product.price && product.discountPercent > 0;

  return (
    <article className="df-product-card group relative flex h-full flex-col overflow-hidden">
      {/* ------------------------------------------------- image (fixed well) */}
      <Link href={product.url} className="relative block p-2.5">
        {/* product shots are photographed on white, so the well is white and the
            tinted card frames it */}
        <div className="relative h-[150px] w-full overflow-hidden rounded-xl bg-white sm:h-[210px] md:h-[230px]">
          {image ? (
            <Image
              src={imageUrl(image)}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 360px"
              className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.07]"
            />
          ) : null}
        </div>

        {/* one row keeps the rating and the discount badge from ever colliding */}
        <div className="pointer-events-none absolute inset-x-4 top-4 hidden items-start justify-between gap-2 sm:flex">
          <span className="flex flex-col items-start gap-1.5">
            {product.rating ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/95 px-1.5 py-1 shadow-[0_2px_8px_-4px_rgb(6_59_76_/_0.4)]">
                <span className="inline-flex items-center gap-1 rounded bg-success px-1.5 py-0.5 text-[11.5px] font-semibold text-white">
                  {product.rating.toFixed(1)}
                  <Star size={9} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </span>
                {product.reviewCount ? (
                  <span className="hidden whitespace-nowrap pr-0.5 text-[11.5px] text-ink-400 sm:inline">
                    {product.reviewCount} reviews
                  </span>
                ) : null}
              </span>
            ) : null}

            {!product.inStock ? (
              <span className="rounded-md bg-ink-900/85 px-2 py-1 text-[11.5px] font-medium text-white">
                Out of stock
              </span>
            ) : null}
          </span>

          {showDiscount ? (
            <span className="shrink-0 rounded-md bg-primary-600 px-1.5 py-1 text-[11px] font-bold text-white sm:px-2.5 sm:text-[12px]">
              {`Save ${product.discountPercent}%`}
            </span>
          ) : null}
        </div>
        {/* Phone: the badges share a narrow photo, so each takes a corner —
            discount top left, rating bottom left, the heart top right. */}
        <div className="pointer-events-none absolute inset-2.5 sm:hidden">
          {showDiscount ? (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-primary-600 px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-white">
              {`${product.discountPercent}% off`}
            </span>
          ) : null}
          {product.rating ? (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
              {product.rating.toFixed(1)}
              <Star size={9} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </span>
          ) : null}
          {!product.inStock ? (
            <span className="absolute bottom-1.5 right-1.5 rounded-md bg-ink-900/85 px-1.5 py-0.5 text-[10.5px] font-medium text-white">
              Out of stock
            </span>
          ) : null}
        </div>
      </Link>

      {/* Sits outside the link so the heart does not open the product. */}
      <WishlistButton
        productId={product.id}
        className="absolute right-4 top-4 z-10 h-7 w-7 bg-white/95 shadow-[0_2px_8px_-4px_rgb(6_59_76_/_0.4)] sm:right-3 sm:top-[52px] sm:h-8 sm:w-8"
        size={16}
      />

      {/* ------------------------------------------------------------ content */}
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-0.5 sm:px-4 sm:pb-4 sm:pt-1">
        {/* two reserved lines so titles of any length align across a row */}
        <h3 className="min-h-[36px] text-[13.5px] font-medium leading-snug text-ink-900 sm:min-h-[44px] sm:text-[16px] sm:font-semibold">
          <Link href={product.url} className="line-clamp-2 transition-colors hover:text-primary-600">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 hidden min-h-10 text-[13px] leading-relaxed text-ink-400 sm:line-clamp-2">
          {product.metaDescription || ''}
        </p>

        {/* price + actions are pinned to the bottom of every card */}
        <div className="mt-auto pt-2 sm:pt-3">
          <div className="min-h-[42px] sm:min-h-[62px]">
            {hasPrice ? (
              <>
                {/* On a half-width card the price leads on its own line and the
                    MRP sits beside it. The "Best Price" and tax lines are two
                    more rows of small grey type there, so they wait for room. */}
                <p className="flex flex-wrap items-baseline gap-x-1.5 font-semibold text-ink-900">
                  <span className="hidden text-[15px] sm:inline">Best Price:</span>
                  <span className="text-[16px] font-bold sm:text-[17px] sm:font-semibold">{formatPrice(product.price)}</span>
                  {product.unit ? (
                    <span className="hidden text-[12px] font-normal text-ink-400 sm:inline">{product.unit}</span>
                  ) : null}
                </p>
                {product.mrp > product.price ? (
                  <p className="mt-0.5 flex items-baseline gap-1.5 text-[12px] sm:hidden">
                    <span className="text-ink-300 line-through">{formatPrice(product.mrp)}</span>
                    {showDiscount ? (
                      <span className="font-semibold text-success">{`${product.discountPercent}% off`}</span>
                    ) : null}
                  </p>
                ) : null}
                {product.mrp > product.price ? (
                  <p className="mt-0.5 hidden text-[13.5px] font-medium text-ink-400 sm:block">
                    MRP <span className="line-through">{formatPrice(product.mrp)}</span>
                  </p>
                ) : null}
                <p className="mt-0.5 hidden text-[11.5px] text-ink-400 sm:block">
                  (Inclusive of all taxes)
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-ink-900">Price on request</p>
                <p className="mt-0.5 hidden text-[11.5px] text-ink-400 sm:block">Quoted after site survey</p>
              </>
            )}
          </div>

          {!compact ? (
            <div className="mt-2.5 sm:mt-3">
              <AddToCartButtons product={product} layout="card" />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

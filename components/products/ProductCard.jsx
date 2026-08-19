import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import AddToCartButtons from '@/components/products/AddToCartButtons';
import { formatPrice, imageUrl } from '@/lib/utils';

export default function ProductCard({ product, compact = false }) {
  if (!product) return null;

  const image = product.images?.[0];
  const hasPrice = Boolean(product.price);
  const showDiscount = hasPrice && product.mrp > product.price && product.discountPercent > 0;
  const saving = showDiscount ? product.mrp - product.price : 0;

  return (
    <article className="df-card df-card-hover group flex h-full flex-col overflow-hidden">
      {/* ---------------------------------------------------------- image */}
      <Link href={product.url} className="relative block overflow-hidden bg-white p-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-muted">
          {image ? (
            <Image
              src={imageUrl(image)}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
              className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
              unoptimized
            />
          ) : null}
        </div>

        <div className="absolute left-5 top-5 flex flex-col items-start gap-1.5">
          {showDiscount ? (
            <span className="rounded-md bg-accent-500 px-2 py-[3px] text-[12px] font-bold uppercase tracking-wide text-white">
              {product.discountPercent}% off
            </span>
          ) : null}
          {!product.inStock ? (
            <span className="rounded-md bg-ink-900/85 px-2 py-[3px] text-[12px] font-medium text-white">
              Out of stock
            </span>
          ) : null}
        </div>
      </Link>

      {/* ---------------------------------------------------------- detail */}
      <div className="flex flex-1 flex-col border-t border-line px-3.5 pb-3.5 pt-3">
        {product.subcategory?.name ? (
          <p className="mb-1 truncate text-[12px] font-medium uppercase tracking-[0.08em] text-ink-300">
            {product.subcategory.name}
          </p>
        ) : null}

        <h3 className="text-[15px] font-medium leading-snug text-ink-900">
          <Link href={product.url} className="line-clamp-2 transition-colors hover:text-primary-800">
            {product.name}
          </Link>
        </h3>

        {product.rating ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-success px-1.5 py-[2px] text-[12px] font-semibold text-white">
              {product.rating.toFixed(1)}
              <Star size={9} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </span>
            {product.reviewCount ? (
              <span className="text-[13px] text-ink-400">{product.reviewCount} reviews</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto pt-2.5">
          {hasPrice ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[20px] font-semibold tracking-tight text-ink-900">
                  {formatPrice(product.price)}
                </span>
                {product.mrp > product.price ? (
                  <span className="text-[14px] text-ink-300 line-through">
                    {formatPrice(product.mrp)}
                  </span>
                ) : null}
                {product.unit ? (
                  <span className="text-[12.5px] text-ink-400">{product.unit}</span>
                ) : null}
              </div>
              <p className="mt-1 h-[16px] text-[13px] font-medium text-success">
                {saving > 0 ? `You save ${formatPrice(saving)}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-[17px] font-semibold text-ink-900">Price on request</p>
              <p className="mt-1 h-[16px] text-[13px] text-ink-400">Quoted after site survey</p>
            </>
          )}

          {!compact ? (
            <div className="mt-3">
              <AddToCartButtons product={product} layout="card" />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

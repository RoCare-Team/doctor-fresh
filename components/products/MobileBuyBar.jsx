'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import SignInPrompt from '@/components/auth/SignInPrompt';
import { whenSession } from '@/lib/useSession';
import { formatPrice } from '@/lib/utils';

/**
 * The bar shop apps keep on the bottom edge of a product page: once the real
 * buttons have scrolled away, buying stays one tap away. It only appears on
 * phones, and only after the buy box has left the screen, so the page still
 * leads with the full buy box.
 */
export default function MobileBuyBar({ product, watch = 'buy-actions' }) {
  const { add } = useCart();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [added, setAdded] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  if (!product.price || product.inStock === false) return null;

  function handleAdd() {
    add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  async function handleBuyNow() {
    add(product, 1);
    if (await whenSession()) {
      router.push('/cart-checkout');
      return;
    }
    setAskSignIn(true);
  }

  return (
    <>
      <SignInPrompt open={askSignIn} onClose={() => setAskSignIn(false)} next="/cart-checkout" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-3 py-2.5 shadow-[0_-6px_20px_-12px_rgb(6_59_76/0.5)] transition-transform duration-200 lg:hidden ${
          show ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 shrink">
            <p className="truncate text-[15px] font-bold leading-tight text-ink-900">
              {formatPrice(product.price)}
            </p>
            {product.mrp > product.price ? (
              <p className="text-[11.5px] leading-tight text-ink-400">
                <span className="line-through">{formatPrice(product.mrp)}</span>
                {product.discountPercent ? (
                  <span className="ml-1 font-semibold text-success">{product.discountPercent}% off</span>
                ) : null}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[14px] font-semibold transition-colors ${
              added
                ? 'border-success bg-success text-white'
                : 'border-primary-500 bg-white text-primary-600'
            }`}
          >
            {added ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
            {added ? 'Added' : 'Add to Cart'}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary-500 text-[14px] font-semibold text-white transition-colors active:bg-ink-900"
          >
            Buy Now
          </button>
        </div>
      </div>
    </>
  );
}

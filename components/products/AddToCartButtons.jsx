'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check, Minus, Plus, Zap } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import SignInPrompt from '@/components/auth/SignInPrompt';
import { whenSession } from '@/lib/useSession';
import Button from '@/components/common/Button';

/**
 * layout="card"   – compact pair of buttons used on product cards
 * layout="detail" – quantity stepper + Add to Cart + Buy Now on the product page
 */
export default function AddToCartButtons({ product, layout = 'card' }) {
  const { add, has } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [askSignIn, setAskSignIn] = useState(false);

  const purchasable = Boolean(product.price) && product.inStock !== false;
  const max = product.maxQty || 99;
  // Read from the basket itself, not a timer: once a product is in, the button
  // says so on every card and page until it is taken out on the cart page.
  const added = has(product.id);

  function handleAdd() {
    // A second tap opens the basket rather than adding the product again.
    if (added) {
      router.push('/cart');
      return;
    }
    add(product, layout === 'detail' ? qty : 1);
  }

  /**
   * The product goes in the basket either way: if the visitor has to sign in
   * first, it is waiting for them when they come back rather than lost.
   */
  async function handleBuyNow() {
    add(product, layout === 'detail' ? qty : 1);

    if (await whenSession()) {
      router.push('/cart-checkout');
      return;
    }
    setAskSignIn(true);
  }

  if (!purchasable) {
    return layout === 'detail' ? (
      <div className="flex flex-wrap gap-3">
        <Button href="tel:9311587716" size="lg" variant="primary">
          Call to Water Expert
        </Button>
        <Button href="/contact" size="lg" variant="outline">
          Request a quotation
        </Button>
      </div>
    ) : (
      <Button href={product.url} variant="outline" size="sm" full>
        Enquire now
      </Button>
    );
  }

  const prompt = (
    <SignInPrompt open={askSignIn} onClose={() => setAskSignIn(false)} next="/cart-checkout" />
  );

  if (layout === 'card') {
    return (
      // On a half-width phone card two labelled buttons do not fit side by
      // side, and stacked they read as a form. So there it is one row: Buy Now
      // takes the width and the cart is an icon beside it, the way shop apps
      // lay it out. From sm up both carry their labels.
      <div className="flex gap-2 sm:gap-2.5">
        {prompt}
        <button
          type="button"
          onClick={handleBuyNow}
          className="inline-flex h-9.5 flex-1 items-center justify-center rounded-lg bg-primary-400 px-2 text-[13.5px] font-semibold text-white transition-all hover:bg-primary-500 active:scale-[0.97] sm:h-9.5 sm:rounded-full sm:px-3 sm:text-[13px] sm:shadow-none"
        >
          Buy Now
        </button>
        <button
          type="button"
          onClick={handleAdd}
          aria-label={added ? 'Added to cart' : 'Add to cart'}
          title={added ? 'Already in your cart — tap to view it' : undefined}
          className={`inline-flex h-9.5 w-9.5 shrink-0 items-center justify-center gap-1.5 rounded-lg border transition-all active:scale-[0.97] sm:h-9.5 sm:w-auto sm:flex-1 sm:rounded-full sm:px-3 sm:text-[13px] sm:font-medium ${
            added
              ? 'border-success bg-success text-white'
              : 'border-primary-500 bg-white text-primary-600 hover:bg-primary-50'
          }`}
        >
          {added
            ? <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            : <ShoppingCart size={16} aria-hidden="true" className="sm:hidden" />}
          <span className="hidden sm:inline">{added ? 'Added' : 'Add to Cart'}</span>
        </button>
      </div>
    );
  }

  return (
    // Stepper, Add to Cart and Buy Now on one row; on a phone the stepper
    // takes its own row so the two buttons keep a usable width.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_1fr]">
      {prompt}
      <div className="col-span-2 inline-flex h-12 w-fit items-center overflow-hidden rounded-xl border border-line-strong bg-white sm:col-span-1">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          className="flex h-full w-11 items-center justify-center text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="number"
          min={1}
          max={max}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, max)))}
          aria-label="Quantity"
          className="h-full w-12 border-x border-line-strong text-center text-[15px] font-medium text-ink-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(max, q + 1))}
          aria-label="Increase quantity"
          className="flex h-full w-11 items-center justify-center text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] text-[15px] font-semibold transition-all active:scale-[0.98] ${
          added
            ? 'border-success bg-success text-white'
            : 'border-success bg-white text-success hover:bg-[#ecf8f2]'
        }`}
      >
        {added ? <Check size={18} aria-hidden="true" /> : <ShoppingCart size={18} aria-hidden="true" />}
        {added ? 'Added' : 'Add to Cart'}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-[15px] font-semibold text-white transition-all hover:bg-primary-700 active:scale-[0.98]"
      >
        <Zap size={18} aria-hidden="true" />
        Buy Now
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import Button from '@/components/common/Button';

/**
 * layout="card"   – compact pair of buttons used on product cards
 * layout="detail" – quantity stepper + Add to Cart + Buy Now on the product page
 */
export default function AddToCartButtons({ product, layout = 'card' }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const purchasable = Boolean(product.price) && product.inStock !== false;
  const max = product.maxQty || 99;

  function handleAdd() {
    add(product, layout === 'detail' ? qty : 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function handleBuyNow() {
    add(product, layout === 'detail' ? qty : 1);
    router.push('/cart-checkout');
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

  if (layout === 'card') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-white text-[14px] font-medium text-ink-900 transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800"
        >
          {added ? <Check size={15} aria-hidden="true" /> : <ShoppingCart size={15} aria-hidden="true" />}
          {added ? 'Added' : 'Add to Cart'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary-500 text-[14px] font-semibold text-ink-900 transition-colors hover:bg-primary-400"
        >
          Buy Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-[14px] font-medium text-ink-700">Quantity</span>
        <div className="inline-flex h-11 items-center rounded-md border border-line-strong">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex h-full w-10 items-center justify-center text-ink-500 transition-colors hover:text-primary-800"
          >
            <Minus size={15} aria-hidden="true" />
          </button>
          <input
            type="number"
            min={1}
            max={max}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, max)))}
            aria-label="Quantity"
            className="h-full w-12 border-x border-line-strong text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            aria-label="Increase quantity"
            className="flex h-full w-10 items-center justify-center text-ink-500 transition-colors hover:text-primary-800"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={handleAdd} variant="outline" size="lg" className="sm:flex-1">
          {added ? <Check size={17} aria-hidden="true" /> : <ShoppingCart size={17} aria-hidden="true" />}
          {added ? 'Added to cart' : 'Add to Cart'}
        </Button>
        <Button type="button" onClick={handleBuyNow} variant="primary" size="lg" className="sm:flex-1">
          Buy Now
        </Button>
      </div>
    </div>
  );
}

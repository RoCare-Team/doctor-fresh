import Breadcrumb from '@/components/common/Breadcrumb';
import CheckoutView from '@/components/cart/CheckoutView';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Checkout',
  description: 'Complete your Doctor Fresh order.',
  path: '/cart-checkout',
  robots: { index: false, follow: false },
});

export default function CheckoutPage() {
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Cart', href: '/cart' }, { name: 'Checkout', href: '/cart-checkout' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <h1 className="mb-7 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">Checkout</h1>
      <CheckoutView />
      </div>
    </>
  );
}

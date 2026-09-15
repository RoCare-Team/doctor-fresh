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
        <div className="df-container py-2.5">
          <Breadcrumb items={[{ name: 'Cart', href: '/cart' }, { name: 'Checkout', href: '/cart-checkout' }]} />
        </div>
      </div>

      <div className="df-container py-4">
        {/* The stepper and breadcrumb already say where the visitor is; a
            large visible title only pushed the form below the fold. */}
        <h1 className="sr-only">Checkout</h1>
        <CheckoutView />
      </div>
    </>
  );
}

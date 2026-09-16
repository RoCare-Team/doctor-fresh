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
      {/* No breadcrumb here: the step bar inside the checkout says where the
          visitor is and carries the one way back. */}
      <div className="df-container py-3 md:py-4">
        {/* The stepper and breadcrumb already say where the visitor is; a
            large visible title only pushed the form below the fold. */}
        <h1 className="sr-only">Checkout</h1>
        <CheckoutView />
      </div>
    </>
  );
}

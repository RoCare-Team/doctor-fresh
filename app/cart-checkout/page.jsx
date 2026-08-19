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
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Cart', href: '/cart' }, { name: 'Checkout', href: '/cart-checkout' }]} />
      <h1 className="mt-4 mb-7 text-2xl font-semibold text-ink-900 md:text-[30px]">Checkout</h1>
      <CheckoutView />
    </div>
  );
}

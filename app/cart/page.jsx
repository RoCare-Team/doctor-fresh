import Breadcrumb from '@/components/common/Breadcrumb';
import CartView from '@/components/cart/CartView';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Shopping cart',
  description: 'Review the water purifiers and accessories in your Doctor Fresh cart.',
  path: '/cart',
  robots: { index: false, follow: true },
});

export default function CartPage() {
  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Cart', href: '/cart' }]} />
      <h1 className="mt-4 mb-7 text-2xl font-semibold text-ink-900 md:text-[30px]">Shopping cart</h1>
      <CartView />
    </div>
  );
}

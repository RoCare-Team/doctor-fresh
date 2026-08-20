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
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Cart', href: '/cart' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <h1 className="mb-7 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">Shopping cart</h1>
      <CartView />
      </div>
    </>
  );
}

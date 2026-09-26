import Breadcrumb from '@/components/common/Breadcrumb';
import ServiceCart from '@/components/services/ServiceCart';
import { metaFor } from '@/lib/utils';

// The basket is in the visitor's browser, so this page is the same for
// everyone and is never indexed — there is nothing here for a crawler.
export const metadata = {
  ...metaFor({ title: 'Your service cart', description: 'The services you have picked.', path: '/book' }),
  robots: { index: false, follow: false },
};

export default function ServiceCartPage() {
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Service cart', href: '/book' }]} />
        </div>
      </div>

      <div className="df-container df-section max-w-3xl">
        <h1 className="text-[24px] font-semibold text-ink-900">Your cart</h1>
        <p className="mb-5 mt-1 text-[14.5px] text-ink-400">Ready to checkout</p>
        <ServiceCart />
      </div>
    </>
  );
}

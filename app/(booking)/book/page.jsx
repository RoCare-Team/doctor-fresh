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
        <div className="df-container py-2.5">
          <Breadcrumb items={[{ name: 'Service cart', href: '/book' }]} />
        </div>
      </div>

      <div className="df-container max-w-5xl py-5 md:py-7">
        <h1 className="text-[22px] font-semibold text-ink-900 md:text-[26px]">Your cart</h1>
        <p className="mb-5 mt-1 text-[14px] text-ink-400">Review the services, then book the visit.</p>
        <ServiceCart />
      </div>
    </>
  );
}

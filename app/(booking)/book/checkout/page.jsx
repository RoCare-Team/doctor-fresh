import Breadcrumb from '@/components/common/Breadcrumb';
import ServiceCheckout from '@/components/services/ServiceCheckout';
import { getStates, PREMISES } from '@/lib/services/wizard';
import { onlinePaymentReady } from '@/lib/sql/easebuzz';
import { metaFor } from '@/lib/utils';

// A booking in progress belongs to one visitor, and there is nothing here for
// a crawler to index.
export const metadata = {
  ...metaFor({ title: 'Service booking', description: 'Schedule your service appointment.', path: '/book/checkout' }),
  robots: { index: false, follow: false },
};

export default async function ServiceCheckoutPage() {
  const states = (await getStates().catch(() => [])) || [];

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-2.5">
          <Breadcrumb items={[{ name: 'Service cart', href: '/book' }, { name: 'Booking', href: '/book/checkout' }]} />
        </div>
      </div>

      <div className="df-container max-w-5xl py-5 md:py-7">
        <h1 className="text-[22px] font-semibold text-ink-900 md:text-[26px]">Service booking</h1>
        <p className="mb-5 mt-1 text-[14px] text-ink-400">Four short steps — nothing is charged to book.</p>
        <ServiceCheckout states={states} premises={PREMISES} canPayOnline={onlinePaymentReady()} />
      </div>
    </>
  );
}

import Breadcrumb from '@/components/common/Breadcrumb';
import ServiceCheckout from '@/components/services/ServiceCheckout';
import { getStates, PREMISES } from '@/lib/services/wizard';
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
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Service cart', href: '/book' }, { name: 'Booking', href: '/book/checkout' }]} />
        </div>
      </div>

      <div className="df-container df-section max-w-3xl">
        <h1 className="text-[24px] font-semibold text-ink-900">Service booking</h1>
        <p className="mb-6 mt-1 text-[14.5px] text-ink-400">Schedule your service appointment</p>
        <ServiceCheckout states={states} premises={PREMISES} />
      </div>
    </>
  );
}

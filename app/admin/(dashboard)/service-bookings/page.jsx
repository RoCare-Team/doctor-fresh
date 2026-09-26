import { listBookings } from '@/lib/sql/service-bookings';
import ServiceBookings from '@/components/admin/ServiceBookings';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Service bookings' };

/** Visits booked through the website's service pages. */
export default async function AdminServiceBookingsPage() {
  await requirePage('service_bookings');
  const bookings = (await listBookings().catch(() => [])) || [];
  return <ServiceBookings bookings={bookings} />;
}

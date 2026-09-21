import {
  listOrders, DELIVERY_STATUSES, RANGES, rangeFor, rangeStart,
} from '@/lib/sql/admin';
import {
  orderMetaMap, failedPaymentOrders, EMPTY_META, ORDER_STAGES, COURIERS,
} from '@/lib/sql/order-meta';
import OrdersBoard from '@/components/admin/OrdersBoard';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders' };

/**
 * The orders dashboard. Every order in the chosen period is loaded once (a few
 * hundred at most) with its workflow notes, and the board filters, searches,
 * pages and exports them in the browser, so switching tabs is instant.
 */
export default async function AdminOrdersPage({ searchParams }) {
  await requirePage('orders');
  const params = await searchParams;
  // The orders list opens on everything; the dashboard opens on today.
  const rangeId = params?.range || 'all';
  const range = rangeFor(rangeId);

  const [orders, meta, failed] = await Promise.all([
    listOrders({ from: rangeStart(rangeId), limit: 2000 }),
    orderMetaMap().catch(() => new Map()),
    failedPaymentOrders().catch(() => new Set()),
  ]);

  const rows = (orders || []).map((o) => {
    const m = meta.get(Number(o.id)) || EMPTY_META;
    const cod = o.paymentType === 'cash_on_delivery';
    // Success: paid. COD: cash on delivery still to collect. Failure: the
    // gateway declined and nothing succeeded. Pending: an online payment not
    // finished yet.
    const payment = o.paid ? 'success' : cod ? 'cod' : failed.has(Number(o.id)) ? 'failure' : 'pending';
    return {
      id: o.id,
      code: o.code,
      buyer: o.buyer,
      guest: Boolean(o.guestId),
      placedAt: o.placedAt,
      paymentType: o.paymentType,
      paid: o.paid,
      payment,
      delivery: o.delivery,
      total: o.total,
      customer: o.customer,
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
      meta: m,
    };
  });

  return (
    <OrdersBoard
      rows={rows}
      stages={ORDER_STAGES}
      couriers={COURIERS}
      deliveryStatuses={DELIVERY_STATUSES}
      ranges={RANGES}
      rangeId={range.id}
    />
  );
}

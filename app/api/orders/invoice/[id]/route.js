// The customer's invoice for one order, as a PDF.
//
// Built on request from the `sale` row rather than stored, so it always shows
// what was actually charged. Only the buyer may fetch it: `getOrder` refuses a
// sale that belongs to someone else, and a guest order is reached by the same
// unguessable guest id the confirmation page uses.

import { getOrder } from '@/lib/sql/orders';
import { getSession } from '@/lib/auth/session';
import { getBrand } from '@/lib/catalog';
import { buildInvoice, invoiceFileName } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const session = await getSession();

  // Guest ids look like "162-9f3a1c4b7e"; a sale id is digits only — the same
  // two ways the order page itself is reached.
  const isGuestRef = String(id).includes('-');
  if (!isGuestRef && !session) {
    return new Response('Please sign in to download this invoice.', { status: 401 });
  }

  const order = await getOrder(
    isGuestRef ? { guestId: id } : { saleId: Number(id), userId: session?.id },
  );
  if (!order) return new Response('Order not found.', { status: 404 });

  const brand = await getBrand().catch(() => ({ name: 'Doctor Fresh' }));

  let pdf;
  try {
    pdf = await buildInvoice({ order, brand });
  } catch (err) {
    console.error('[invoice] could not build the PDF:', err.message);
    return new Response('Could not build the invoice.', { status: 502 });
  }

  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${invoiceFileName(order)}"`,
      'content-length': String(pdf.length),
      // An invoice is one customer's own document, never a shared cache entry.
      'cache-control': 'private, no-store',
    },
  });
}

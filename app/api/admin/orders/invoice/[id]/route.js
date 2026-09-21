// Any order's invoice, for the admin team — the same PDF the customer gets.

import { requireAdmin } from '@/lib/admin/guard';
import { getOrder, getGstNumber } from '@/lib/sql/orders';
import { getBrand } from '@/lib/catalog';
import { buildInvoice, invoiceFileName, realGstin } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { response } = await requireAdmin('orders', 'view');
  if (response) return response;

  const { id } = await params;
  const order = await getOrder({ saleId: Number(id), asAdmin: true });
  if (!order) return new Response('Order not found.', { status: 404 });

  const [brand, gst] = await Promise.all([
    getBrand().catch(() => ({ name: 'Doctor Fresh' })),
    getGstNumber().catch(() => null),
  ]);

  let pdf;
  try {
    pdf = await buildInvoice({ order, brand, gstin: realGstin(gst), origin: new URL(request.url).origin });
  } catch (err) {
    console.error('[invoice] could not build the PDF:', err.message);
    return new Response('Could not build the invoice.', { status: 502 });
  }

  const inline = new URL(request.url).searchParams.get('view') === '1';
  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${invoiceFileName(order)}"`,
      'cache-control': 'private, no-store',
    },
  });
}

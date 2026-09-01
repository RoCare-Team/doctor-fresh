// The product brochure, generated on request.
//
// Built from the catalogue row rather than an uploaded file, so it always shows
// the current photo, price and specification, and every product has one.

import { notFound } from 'next/navigation';
import { mutate } from '@/lib/db';
import { getProductById, getBrand } from '@/lib/catalog';
import { buildBrochure } from '@/lib/brochure';

export const dynamic = 'force-dynamic';

const PRODUCTS = process.env.DB_TABLE_PRODUCTS || 'product';

/**
 * `num_of_downloads` has sat unused on `product` since the site was built, so
 * it is what records interest here. A failed count must never cost the customer
 * their brochure.
 */
async function count(id) {
  try {
    await mutate(
      `UPDATE \`${PRODUCTS}\` SET \`num_of_downloads\` = \`num_of_downloads\` + 1 WHERE \`product_id\` = ?`,
      [id],
    );
  } catch (err) {
    console.error('[brochure] could not count the download:', err.message);
  }
}

/** A file name a customer can find again on their desktop. */
const fileName = (product) => `${String(product.slug || `product-${product.id}`)
  .replace(/[^a-z0-9-]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'brochure'}-doctor-fresh.pdf`;

export async function GET(request, { params }) {
  const { id } = await params;

  const product = await getProductById(Number(id));
  if (!product) notFound();

  const brand = await getBrand().catch(() => ({ name: 'Doctor Fresh' }));

  let pdf;
  try {
    pdf = await buildBrochure({ product, brand, origin: new URL(request.url).origin });
  } catch (err) {
    console.error('[brochure] could not build the PDF:', err.message);
    return new Response('Could not build the brochure.', { status: 502 });
  }

  await count(product.id);

  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${fileName(product)}"`,
      'content-length': String(pdf.length),
      'cache-control': 'public, max-age=300',
    },
  });
}

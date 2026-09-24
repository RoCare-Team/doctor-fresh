import VideoEmbed from '@/components/common/VideoEmbed';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import { notFound } from 'next/navigation';
import { Truck, ShieldCheck, Wrench, Phone, PackageCheck } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ProductGallery from '@/components/products/ProductGallery';
import ProductTabs from '@/components/products/ProductTabs';
import ProductReviews from '@/components/products/ProductReviews';
import AddToCartButtons from '@/components/products/AddToCartButtons';
import QuotationButton from '@/components/products/QuotationButton';
import RecentlyViewed from '@/components/products/RecentlyViewed';
import DeliveryCheck from '@/components/products/DeliveryCheck';
import MobileBuyBar from '@/components/products/MobileBuyBar';
import Accordion from '@/components/common/Accordion';
import ProductRail from '@/components/products/ProductRail';
import Rating from '@/components/common/Rating';
import { getProductById, getRelatedProducts, cardProduct } from '@/lib/catalog';
import ReviewForm from '@/components/products/ReviewForm';
import { absoluteUrl, formatPrice, imageUrl, metaFor, SITE_URL } from '@/lib/utils';

// A saved edit drops this page at once — the admin purges it by tag — so the
// timer only covers changes made straight in the PHP panel, which nothing
// here can know about. Fifteen minutes rather than five: every expiry means a
// page rebuilt from the database in Singapore, and that wait is what a visitor
// feels as a slow first byte.
export const revalidate = 900;

export async function generateStaticParams() {
  // Built on first visit and then cached, rather than at deploy — only the
  // pages a visitor reaches first are prerendered.
  return [];
}

export async function generateMetadata({ params }) {
  const { id, slug } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  return metaFor({
    title: product.metaTitle || product.name,
    description: product.metaDescription,
    // `tag` on the product row — the same keywords the current site prints.
    keywords: product.keywords,
    path: `/product/${slug}/${product.id}`,
    image: product.images[0],
  });
}

const TRUST = [
  { icon: Truck, label: 'Free shipping across India' },
  { icon: Wrench, label: 'Free installation by certified technician' },
  { icon: ShieldCheck, label: 'Manufacturer warranty + service support' },
  { icon: PackageCheck, label: 'Genuine Doctor Fresh spare parts' },
];

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const related = (await getRelatedProducts(product, 10)).map(cardProduct);
  const specs = product.specifications.filter((s) => s.value && s.value !== '-');
  const highlights = product.attributes.slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => absoluteUrl(imageUrl(i))),
    description: product.metaDescription,
    sku: String(product.id),
    brand: { '@type': 'Brand', name: 'Doctor Fresh' },
    ...(product.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount || product.reviews.length || 1,
          },
        }
      : {}),
    ...(product.price
      ? {
          offers: {
            '@type': 'Offer',
            url: `${SITE_URL}${product.url}`,
            priceCurrency: 'INR',
            price: product.price,
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { name: 'Products', href: '/all-category' },
    ...(product.category ? [{ name: product.category.name, href: product.category.href }] : []),
    ...(product.subcategory ? [{ name: product.subcategory.name, href: product.subcategory.href }] : []),
    { name: product.name, href: product.url },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Records the view against this visitor’s cookie, for the home page. */}
      <RecentlyViewed productId={product.id} />

      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-2.5">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      <div className="df-container py-4 pb-24 md:py-6 lg:pb-10">
        {/* ------------------------------------------------- gallery + buy box */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-[138px] lg:self-start">
            <ProductGallery
              images={product.images}
              name={product.name}
              badges={product.badges}
              discountPercent={product.discountPercent}
            />
          </div>

          <div>
            {product.subcategory ? (
              <Link
                href={product.subcategory.href}
                className="text-[12px] font-semibold uppercase tracking-wide text-primary-700 hover:text-primary-800"
              >
                {product.subcategory.name}
              </Link>
            ) : null}

            <h1 className="mt-1.5 text-[19px] font-semibold leading-snug tracking-tight text-ink-900 sm:text-[24px] md:text-[28px]">
              {product.name}
            </h1>

            {/* Rating and availability read as one line of proof under the name. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              {product.rating ? (
                <>
                  <Rating value={product.rating} />
                  {product.reviewCount ? (
                    <a href="#reviews" className="text-[13.5px] text-ink-400 underline-offset-2 hover:text-primary-800 hover:underline">
                      {product.reviewCount} ratings
                    </a>
                  ) : null}
                  <span className="hidden h-3 w-px bg-line-strong sm:block" />
                </>
              ) : null}
              <span className={`text-[13.5px] font-semibold ${product.inStock ? 'text-success' : 'text-danger'}`}>
                {product.inStock ? 'In stock' : 'Currently out of stock'}
              </span>
            </div>

            {/* ------------------------------------------------------ price */}
            <div className="mt-4 border-y border-line py-4">
              {product.price ? (
                <>
                  <div className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
                    {product.discountPercent > 0 ? (
                      <span className="text-[17px] font-semibold text-success sm:text-[19px]">
                        {`-${product.discountPercent}%`}
                      </span>
                    ) : null}
                    <span className="text-[28px] font-bold leading-none tracking-tight text-ink-900 sm:text-[34px]">
                      {formatPrice(product.price)}
                    </span>
                    {product.unit ? <span className="text-[13px] text-ink-400">{product.unit}</span> : null}
                  </div>

                  {product.mrp > product.price ? (
                    <p className="mt-2 text-[13.5px] text-ink-400">
                      {'M.R.P. '}
                      <span className="line-through">{formatPrice(product.mrp)}</span>
                      <span className="ml-2 font-semibold text-success">
                        {`You save ${formatPrice(product.mrp - product.price)}`}
                      </span>
                    </p>
                  ) : null}

                  <p className="mt-1 text-[12.5px] text-ink-400">
                    Inclusive of all taxes · Free shipping across India
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-[20px] font-semibold text-ink-900">Price on request</p>
                  <p className="mt-1 text-[14px] text-ink-400">
                    Industrial and commercial systems are quoted after a site requirement check.
                  </p>
                </div>
              )}
            </div>

            <div id="buy-actions" className="mt-5">
              <AddToCartButtons product={product} layout="detail" />
            </div>

            <div className="mt-4 space-y-3">
              <DeliveryCheck />

              <a
                href="tel:9311587716"
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-[14px] font-medium text-primary-800 transition-colors hover:border-primary-500 hover:bg-primary-50"
              >
                <Phone size={16} aria-hidden="true" />
                Call a water expert — +91-9311587716
              </a>

              <QuotationButton productId={product.id} productName={product.name} />
            </div>

            {/* Four promises as tiles — on a phone they stay readable at two
                across instead of becoming a wall of grey bullet text. */}
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {TRUST.map((t) => {
                const Icon = t.icon;
                return (
                  <li
                    key={t.label}
                    className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-[12.5px] font-medium leading-snug text-ink-700 sm:flex-row sm:items-center sm:gap-2.5 sm:text-[13.5px]"
                  >
                    <Icon size={17} className="shrink-0 text-primary-700" aria-hidden="true" />
                    {t.label}
                  </li>
                );
              })}
            </ul>

            {highlights.length ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-line">
                <h2 className="border-b border-line bg-surface-muted px-4 py-2.5 text-[14px] font-semibold text-ink-900">
                  Product highlights
                </h2>
                <dl className="divide-y divide-line">
                  {highlights.map((a) => (
                    <div key={a.label} className="flex gap-3 px-4 py-2.5 text-[13.5px]">
                      <dt className="w-[38%] shrink-0 text-ink-400">{a.label}</dt>
                      <dd className="font-medium text-ink-700">{a.values.join(', ')}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        {/* --------------------------------------------------------------- tabs */}
        <div className="mt-12">
          <ProductTabs
            tabs={[
              {
                id: 'description',
                label: 'Description',
                content: product.descriptionHtml ? (
                  <div className="df-prose max-w-3xl" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
                ) : null,
              },
              // The product video, when the admin added one.
              ...(product.videoUrl ? [{
                id: 'video',
                label: 'Video',
                content: <VideoEmbed url={product.videoUrl} title={`${product.name} video`} className="max-w-3xl" />,
              }] : []),
              {
                id: 'specifications',
                label: 'Specifications',
                content: specs.length ? (
                  <div className="max-w-3xl overflow-x-auto">
                    <table className="w-full border-collapse text-[14.5px]">
                      <tbody>
                        {specs.map((s) => (
                          <tr key={s.label} className="border-b border-line last:border-0">
                            <th scope="row" className="w-1/2 bg-surface-muted px-4 py-2.5 text-left font-medium text-ink-700">
                              {s.label}
                            </th>
                            <td className="px-4 py-2.5 text-ink-500">{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null,
              },
              {
                id: 'features',
                label: 'Attribute',
                content: product.attributes.length ? (
                  <dl className="grid max-w-4xl gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    {product.attributes.map((a) => (
                      <div key={a.label}>
                        <dt className="text-[13px] uppercase tracking-wide text-ink-300">{a.label}</dt>
                        <dd className="mt-0.5 text-[14.5px] text-ink-700">{a.values.join(', ')}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null,
              },
              {
                id: 'installation',
                label: 'Installation & Service',
                // Only when the column holds something. Writing a house note in
                // here would be inventing product copy that is not in the
                // catalogue.
                content: product.installationHtml ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="df-prose" dangerouslySetInnerHTML={{ __html: product.installationHtml }} />
                    <div className="flex flex-wrap gap-3">
                      <Link href="/water-purifier-installation" className="text-[14.5px] font-medium text-primary-700 hover:text-primary-800">
                        Installation / Uninstallation →
                      </Link>
                      <Link href="/water-purifier-service" className="text-[14.5px] font-medium text-primary-700 hover:text-primary-800">
                        RO repair &amp; service →
                      </Link>
                      <Link href="/water-purifier-amc" className="text-[14.5px] font-medium text-primary-700 hover:text-primary-800">
                        AMC plans →
                      </Link>
                    </div>
                  </div>
                ) : null,
              },
              {
                id: 'shipping',
                label: 'Billing & Shipping',
                content: product.shippingHtml ? (
                  <div className="df-prose max-w-3xl" dangerouslySetInnerHTML={{ __html: product.shippingHtml }} />
                ) : null,
              },
            ]}
          />
        </div>

        {/* ------------------------------------------------------------ reviews */}
        <section id="reviews" className="mt-12 border-t border-line pt-10">
          <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">Ratings &amp; reviews</h2>
          {product.rating || product.reviews.length ? (
            <ProductReviews reviews={product.reviews} rating={product.rating} reviewCount={product.reviewCount} />
          ) : (
            <p className="text-[14.5px] text-ink-400">No reviews yet — be the first to rate this product.</p>
          )}
          <div className="max-w-2xl">
            <ReviewForm productId={product.id} />
          </div>
        </section>

        {/* --------------------------------------------------------------- FAQ */}
        {product.faqs.length ? (
          <section className="mt-12 border-t border-line pt-10">
            <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">
              Frequently asked questions
            </h2>
            <div className="max-w-3xl">
              <Accordion items={product.faqs} />
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: product.faqs.map((f) => ({
                    '@type': 'Question',
                    name: f.question,
                    acceptedAnswer: { '@type': 'Answer', text: f.answer },
                  })),
                }),
              }}
            />
          </section>
        ) : null}
      </div>

      <MobileBuyBar product={product} />

      {related.length ? (
        <div className="border-t border-line pt-2">
          <ProductRail title="Related products" products={related} href={product.category?.href} />
        </div>
      ) : null}
    </>
  );
}

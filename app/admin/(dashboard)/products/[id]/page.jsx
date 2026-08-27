import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getProduct, listCategories } from '@/lib/sql/admin-catalog';
import ProductEditor from '@/components/admin/ProductEditor';
import SafeImage from '@/components/common/SafeImage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit product' };

export default async function AdminProductPage({ params }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(Number(id)), listCategories()]);
  if (!product) notFound();

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 transition-colors hover:text-primary-700"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All products
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
            <SafeImage src={product.image} fill sizes="64px" className="object-contain p-1" iconSize={20} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-ink-900">{product.name}</h1>
            <p className="mt-0.5 text-[13.5px] text-ink-400">#{product.id} · {product.slug}</p>
          </div>
        </div>

        <Link
          href={`/product/${product.slug}/${product.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-800"
        >
          View on site
          <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 max-w-3xl">
        <ProductEditor product={product} categories={categories || []} />
      </div>
    </>
  );
}

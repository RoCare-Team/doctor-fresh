import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listCategories, listSubcategories } from '@/lib/sql/admin-catalog';
import NewProductForm from '@/components/admin/NewProductForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const [categories, subcategories] = await Promise.all([listCategories(), listSubcategories()]);

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 transition-colors hover:text-primary-700"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All products
      </Link>

      <h1 className="mt-3 text-[22px] font-semibold text-ink-900">New product</h1>
      <p className="mt-1 text-[14px] text-ink-400">
        Photos are added on the next screen, once the product exists.
      </p>

      <div className="mt-6 max-w-3xl">
        <NewProductForm categories={categories || []} subcategories={subcategories || []} />
      </div>
    </>
  );
}

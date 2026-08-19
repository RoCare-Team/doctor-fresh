import { Suspense } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/common/Breadcrumb';
import ProductGrid from '@/components/products/ProductGrid';
import { searchProducts, getAllCategories } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Search',
  description: 'Search Doctor Fresh water purifiers, RO plants, softeners and spare parts.',
  path: '/search',
  robots: { index: false, follow: true },
});

function Results({ query }) {
  const results = query ? searchProducts(query) : [];

  if (!query) {
    const categories = getAllCategories();
    return (
      <div>
        <p className="mb-6 text-[15px] text-ink-400">
          Type a product name, technology or category to search the Doctor Fresh catalogue.
        </p>
        <h2 className="mb-3 text-[16px] font-semibold text-ink-900">Popular categories</h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                className="inline-block rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-muted px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-ink-900">No products found for “{query}”</h2>
        <p className="mt-1.5 text-[14.5px] text-ink-400">
          Try a shorter search term, or browse{' '}
          <Link href="/all-category" className="text-primary-700 hover:text-primary-800">all categories</Link>.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-[14.5px] text-ink-400">
        <span className="font-medium text-ink-700">{results.length}</span> results for “{query}”
      </p>
      <ProductGrid products={results} columns={4} />
    </>
  );
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = (params?.q || '').trim();

  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Search', href: '/search' }]} />
      <h1 className="mt-4 mb-6 text-2xl font-semibold text-ink-900 md:text-[30px]">
        {query ? `Search results` : 'Search'}
      </h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[10px] bg-surface-muted" />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}

import Link from 'next/link';
import Button from '@/components/common/Button';
import { getAllCategories } from '@/lib/catalog';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const categories = (await getAllCategories()).slice(0, 8);

  return (
    <div className="df-container py-16 md:py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-primary-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900 md:text-[30px]">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-400">
          The page may have moved. Try searching the catalogue or start from one of the categories below.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/">Back to home</Button>
          <Button href="/all-category" variant="outline">All products</Button>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                className="inline-block rounded-md border border-line bg-white px-3 py-1.5 text-[13.5px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

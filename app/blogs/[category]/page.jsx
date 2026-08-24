import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import BlogCard from '@/components/blogs/BlogCard';
import { getBlogCategories, getBlogCategory, getBlogPostsByCategory } from '@/lib/catalog';
import { metaFor, cx } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getBlogCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = await getBlogCategory(slug);
  if (!category) return {};

  return metaFor({
    title: `${category.name} articles`,
    description: `Doctor Fresh articles and guides on ${category.name.toLowerCase()}.`,
    path: category.href,
  });
}

export default async function BlogCategoryPage({ params }) {
  const { category: slug } = await params;
  const category = await getBlogCategory(slug);
  if (!category) notFound();

  const posts = await getBlogPostsByCategory(slug);
  const categories = await getBlogCategories();

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Blogs', href: '/blogs' }, { name: category.name, href: category.href }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">{category.name}</h1>
        <p className="mt-2 text-[15px] text-ink-400">
          {posts.length} {posts.length === 1 ? 'article' : 'articles'}
        </p>
      </header>

      <nav aria-label="Blog categories" className="mb-8">
        <ul className="df-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
          <li>
            <Link
              href="/blogs"
              className="inline-block whitespace-nowrap rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
            >
              All articles
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                aria-current={c.slug === slug ? 'page' : undefined}
                className={cx(
                  'inline-block whitespace-nowrap rounded-md border px-3.5 py-2 text-[14px] transition-colors',
                  c.slug === slug
                    ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                    : 'border-line bg-white text-ink-500 hover:border-primary-300 hover:text-primary-800',
                )}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {posts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-10 text-center text-sm text-ink-500">
          No articles in this topic yet. <Link href="/blogs" className="text-primary-700 hover:text-primary-800">Browse all articles</Link>.
        </p>
      )}
      </div>
    </>
  );
}

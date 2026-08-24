import Link from 'next/link';
import Breadcrumb from '@/components/common/Breadcrumb';
import BlogCard from '@/components/blogs/BlogCard';
import { getAllBlogPosts, getBlogCategories } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export const metadata = metaFor({
  title: 'Water purification blog, guides and buying advice',
  description:
    'Water purifier guides, RO service advice, TDS explainers and waterborne disease awareness from the Doctor Fresh team.',
  path: '/blogs',
});

export default async function BlogsPage() {
  const posts = await getAllBlogPosts();
  const categories = await getBlogCategories();
  const [featured, ...rest] = posts;

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Blogs', href: '/blogs' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">Doctor Fresh blog</h1>
        <p className="mt-2.5 max-w-2xl text-[15.5px] leading-relaxed text-ink-400">
          Practical guides on water purification, RO servicing and water quality — written by the
          people who install and service these systems every day.
        </p>
      </header>

      <nav aria-label="Blog categories" className="mb-8">
        <ul className="df-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
          <li>
            <span className="inline-block whitespace-nowrap rounded-md border border-primary-500 bg-primary-50 px-3.5 py-2 text-[14px] font-medium text-primary-700">
              All articles
            </span>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={c.href}
                className="inline-block whitespace-nowrap rounded-md border border-line bg-white px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {featured ? (
        <div className="mb-8">
          <BlogCard post={featured} featured />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <BlogCard key={p.id} post={p} />
        ))}
      </div>
      </div>
    </>
  );
}
